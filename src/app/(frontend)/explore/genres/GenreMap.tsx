'use client'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AddAllButton } from '@/components/AddButton'
import { SongPlayer } from '@/components/SongPlayer'
import type { GenreGraph } from '@/lib/data'

type Song = { id: number; track?: string | null; artistName: string; coverUrl?: string | null; embed: string | null; youtubeId?: string | null }

// 장르 지도: 모든 장르가 처음부터 펼쳐져 있고, 누르면 이어진 장르와 대표곡이 나와요
export function GenreMap({ graph, initial }: { graph: GenreGraph; initial?: string | null }) {
  const { nodes, edges, box } = graph
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const bySlug = useMemo(() => new Map(nodes.map((n) => [n.slug, n])), [nodes])
  const maxC = useMemo(() => Math.max(1, ...edges.map((e) => e.w)), [edges])
  // 장르마다 이어진 장르 (함께 붙은 곡이 많은 순)
  const links = useMemo(() => {
    const m = new Map<number, { id: number; c: number; w: number }[]>()
    for (const e of edges) {
      m.set(e.a, [...(m.get(e.a) || []), { id: e.b, c: e.c, w: e.w }])
      m.set(e.b, [...(m.get(e.b) || []), { id: e.a, c: e.c, w: e.w }])
    }
    for (const l of m.values()) l.sort((x, y) => y.c - x.c)
    return m
  }, [edges])

  const [sel, setSel] = useState<number | null>(initial ? bySlug.get(initial)?.id ?? null : null)
  const [hover, setHover] = useState<number | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [playing, setPlaying] = useState<number | null>(null)

  // 확대·이동
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const panRef = useRef(pan)
  panRef.current = pan
  const svgRef = useRef<SVGSVGElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean; k: number } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ d0: number; z0: number } | null>(null)
  const [smooth, setSmooth] = useState(false)

  // 화면 픽셀 → 그림 좌표 비율
  const scale = () => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r) return 1
    return Math.max(box.w / r.width, box.h / r.height)
  }
  const zoomAt = useCallback(
    (next: number, cx?: number, cy?: number) => {
      const z0 = zoomRef.current
      const z1 = Math.min(6, Math.max(0.8, next))
      if (z1 === z0) return
      let sx = 0
      let sy = 0
      const r = svgRef.current?.getBoundingClientRect()
      if (r && cx !== undefined && cy !== undefined) {
        const k = Math.max(box.w / r.width, box.h / r.height)
        sx = (cx - r.left - r.width / 2) * k
        sy = (cy - r.top - r.height / 2) * k
      }
      const p = panRef.current
      const np = { x: sx / z1 - sx / z0 + p.x, y: sy / z1 - sy / z0 + p.y }
      zoomRef.current = z1
      setSmooth(false)
      setZoom(z1)
      setPan(np)
    },
    [box.w, box.h],
  )
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomAt(zoomRef.current * Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0018)), e.clientX, e.clientY)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  // 장르 하나로 화면 옮기기 (목록에서 고르거나 주소로 들어왔을 때)
  const focusOn = useCallback(
    (id: number) => {
      const n = byId.get(id)
      if (!n) return
      const z = Math.max(zoomRef.current, 1.8)
      zoomRef.current = z
      setSmooth(true)
      setZoom(z)
      setPan({ x: -n.x, y: -n.y })
    },
    [byId],
  )
  useEffect(() => {
    if (sel !== null && initial) focusOn(sel)
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 고른 장르의 대표곡
  useEffect(() => {
    setPlaying(null)
    setSongs([])
    if (sel === null) return
    const n = byId.get(sel)
    if (!n) return
    let off = false
    fetch(`/web/data?genre=${encodeURIComponent(n.slug)}`)
      .then((r) => r.json() as Promise<{ center?: { songs: Song[] } }>)
      .then((d) => !off && setSongs(d.center?.songs || []))
      .catch(() => null)
    const u = new URL(window.location.href)
    u.searchParams.set('g', n.slug)
    window.history.replaceState(null, '', u)
    return () => {
      off = true
    }
  }, [sel, byId])

  const pick = (id: number | null, center = false) => {
    if (drag.current?.moved) return
    setSel(id)
    if (center && id !== null) focusOn(id)
  }

  const near = new Set(sel !== null ? (links.get(sel) || []).map((l) => l.id) : [])
  const hot = hover ?? sel
  const hotNear = new Set(hot !== null ? (links.get(hot) || []).map((l) => l.id) : [])
  const s = sel !== null ? byId.get(sel) : null
  const current = playing !== null ? songs[playing] : null
  // 확대할수록 작은 장르 이름도 보여요
  const labelMin = zoom >= 2.4 ? 0 : zoom >= 1.5 ? 10 : 15

  return (
    <div className="web gmap">
      <div
        ref={stageRef}
        className="web__stage"
        onPointerDown={(e) => {
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()]
            pinch.current = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: zoomRef.current }
            if (drag.current) drag.current.moved = true
            return
          }
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false, k: scale() }
        }}
        onPointerMove={(e) => {
          if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          if (pinch.current && pointers.current.size >= 2) {
            const [a, b] = [...pointers.current.values()]
            zoomAt(pinch.current.z0 * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d0), (a.x + b.x) / 2, (a.y + b.y) / 2)
            return
          }
          const d = drag.current
          if (!d || pinch.current) return
          const dx = e.clientX - d.x
          const dy = e.clientY - d.y
          if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true
          if (d.moved) {
            setSmooth(false)
            setPan({ x: d.px + (dx * d.k) / zoomRef.current, y: d.py + (dy * d.k) / zoomRef.current })
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId)
          if (pointers.current.size < 2 && pinch.current) {
            pinch.current = null
            pointers.current.clear()
          }
          setTimeout(() => (drag.current = null), 0)
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId)
          pinch.current = null
          drag.current = null
        }}
        onPointerLeave={(e) => {
          pointers.current.delete(e.pointerId)
          drag.current = null
        }}
      >
        <svg
          ref={svgRef}
          className="web__svg"
          viewBox={`${-box.w / 2} ${-box.h / 2} ${box.w} ${box.h}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="장르 지도"
          onClick={(e) => {
            if (e.target === e.currentTarget) pick(null)
          }}
        >
          <g className={`web__world${smooth ? '' : ' is-dragging'}`} style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}>
            {edges.map((e) => {
              const A = byId.get(e.a)!
              const B = byId.get(e.b)!
              const on = hot !== null && (e.a === hot || e.b === hot)
              const t = e.w / maxC
              return (
                <line
                  key={`${e.a}-${e.b}`}
                  x1={A.x}
                  y1={A.y}
                  x2={B.x}
                  y2={B.y}
                  className={`gmap__edge${on ? ' is-on' : ''}${hot !== null && !on ? ' is-dim' : ''}`}
                  style={{ strokeWidth: (0.6 + 4 * t) / Math.sqrt(zoom) }}
                />
              )
            })}
            {nodes.map((n) => {
              const isSel = n.id === sel
              const lit = hot === null || n.id === hot || hotNear.has(n.id)
              const showLabel = isSel || n.id === hover || near.has(n.id) || hotNear.has(n.id) || n.r >= labelMin
              return (
                <g
                  key={n.id}
                  className={`gmap__node${isSel ? ' is-sel' : ''}${near.has(n.id) ? ' is-near' : ''}${lit ? '' : ' is-dim'}`}
                  transform={`translate(${n.x} ${n.y})`}
                  onClick={() => pick(n.id)}
                  onPointerEnter={() => setHover(n.id)}
                  onPointerLeave={() => setHover(null)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${n.name}, ${n.n}곡`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') pick(n.id)
                  }}
                >
                  <circle r={n.r} />
                  {showLabel ? (
                    <text y={n.r + 14 / Math.sqrt(zoom)} style={{ fontSize: Math.max(11, 13 + n.r * 0.35) / Math.sqrt(zoom) }}>
                      {n.name}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </g>
        </svg>
        <div className="web__zoom" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" aria-label="확대" onClick={() => zoomAt(zoomRef.current * 1.3)}>
            +
          </button>
          <button type="button" aria-label="축소" onClick={() => zoomAt(zoomRef.current / 1.3)}>
            −
          </button>
          <button
            type="button"
            className="web__zoom-reset"
            onClick={() => {
              zoomRef.current = 1
              setSmooth(true)
              setZoom(1)
              setPan({ x: 0, y: 0 })
            }}
          >
            전체
          </button>
        </div>
      </div>

      <aside className="web__panel">
        {s ? (
          <>
            <p className="label">Genre</p>
            <h2 className="h-md">{s.name}</h2>
            <p className="muted">에디터가 고른 {s.n}곡</p>
            {current?.embed ? (
              <SongPlayer
                key={current.id}
                pickId={current.id}
                embed={current.embed}
                youtubeId={current.youtubeId}
                title={`${current.track || ''} — ${current.artistName}`}
                autoPlay
                onEnded={playing !== null && playing + 1 < songs.length ? () => setPlaying(playing + 1) : undefined}
              />
            ) : (
              <button type="button" className="btn btn--filled" disabled={!songs[0]?.embed} onClick={() => setPlaying(0)}>
                <span>▶ 대표곡 듣기</span>
              </button>
            )}
            {songs.length ? (
              <ol className="web__tracks">
                {songs.map((x, i) => (
                  <li key={x.id}>
                    <button type="button" onClick={() => setPlaying(i)} className={i === playing ? 'is-on' : ''} disabled={!x.embed}>
                      {x.track || '곡'}
                      <span className="muted"> — {x.artistName}</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : null}
            <div className="web__panel-actions">
              {songs.length ? <AddAllButton songs={songs} label="대표곡 담기" /> : null}
              <Link href={`/genres/${s.slug}`} className="arrow-link">
                <span>장르 페이지</span>
              </Link>
            </div>
            {links.get(s.id)?.length ? (
              <div className="gmap__links">
                <p className="label">이어진 장르</p>
                <ul>
                  {links.get(s.id)!.map((l) => {
                    const o = byId.get(l.id)!
                    return (
                      <li key={l.id}>
                        <button type="button" onClick={() => pick(l.id, true)}>
                          <span>{o.name}</span>
                          <span className="muted small">함께 {l.c}곡</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p className="label">Genre Map</p>
            <h2 className="h-md">장르를 눌러 보세요</h2>
            <p className="muted small">
              동그라미가 클수록 에디터가 많이 고른 장르예요. 같은 곡에 자주 함께 붙는 장르끼리 이어져 있고, 선이 굵을수록 더 가까워요.
            </p>
            <p className="muted small">끌어서 움직이고, 휠이나 두 손가락으로 확대할 수 있어요. 확대하면 작은 장르 이름도 보여요.</p>
            <div className="gmap__links">
              <p className="label">많이 고른 장르</p>
              <ul>
                {nodes.slice(0, 12).map((n) => (
                  <li key={n.id}>
                    <button type="button" onClick={() => pick(n.id, true)}>
                      <span>{n.name}</span>
                      <span className="muted small">{n.n}곡</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
