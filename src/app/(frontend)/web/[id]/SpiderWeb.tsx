'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AddButton } from '@/components/AddButton'
import { SpotifyEmbed } from '@/components/SpotifyEmbed'
import { sendTrack } from '@/components/Track'
import { myPlaylist } from '@/lib/myPlaylist'

type WebSong = {
  id: number
  track?: string | null
  artistName: string
  coverUrl?: string | null
  embed: string | null
  genres: string[]
}
type Node = WebSong & { x: number; y: number; parent: number | null; expanded: boolean }

const small = (u?: string | null) => (u ? u.replace('ab67616d0000b273', 'ab67616d00001e02') : null)
const MAX_NODES = 90
const R = 190 // 가운데 곡에서 비슷한 곡까지 거리

export function SpiderWeb({ startId }: { startId: number }) {
  const [nodes, setNodes] = useState<Map<number, Node>>(new Map())
  const [edges, setEdges] = useState<[number, number][]>([])
  const [focus, setFocus] = useState<number>(startId)
  const [loading, setLoading] = useState<number | null>(null)
  const [played, setPlayed] = useState<number | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [trail, setTrail] = useState<number[]>([startId])
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean; k: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  // 화면 폭에 맞춰 확대: 좁은 화면(휴대폰)에서는 더 가까이 보여줘요.
  const [vb, setVb] = useState({ w: 1000, h: 680 })
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const fit = () => {
      const cw = el.clientWidth || 1000
      const ch = el.clientHeight || 680
      const w = cw < 520 ? 560 : cw < 800 ? 760 : 1000
      setVb({ w, h: Math.round((w * ch) / cw) })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 곡 하나를 펼치기: 비슷한 곡을 불러와서 그 곡 둘레(지나온 방향의 반대쪽)에 놓아요.
  const busy = useRef(new Set<number>())
  const expand = useCallback(async (id: number) => {
    const have = nodesRef.current.get(id)
    // 이미 펼쳤거나 펼치는 중이면 다시 하지 않아요 (빠르게 두 번 눌러도 한 번만)
    if (have?.expanded || busy.current.has(id)) return
    busy.current.add(id)
    setLoading(id)
    try {
      const res = await fetch(`/web/data?id=${id}`)
      if (!res.ok) return
      const data = (await res.json()) as { center: WebSong; neighbors: WebSong[] }
      setNodes((prev) => {
        const next = new Map(prev)
        const c: Node = next.get(id) || { ...data.center, x: 0, y: 0, parent: null, expanded: false }
        if (c.expanded) return prev
        c.expanded = true
        next.set(id, { ...c })
        const parent = c.parent !== null ? next.get(c.parent) : null
        const base = parent ? Math.atan2(c.y - parent.y, c.x - parent.x) : -Math.PI / 2
        const spread = parent ? (Math.PI * 200) / 180 : Math.PI * 2
        const fresh = data.neighbors.filter((n) => !next.has(n.id)).slice(0, Math.max(0, MAX_NODES - next.size))
        fresh.forEach((n, i) => {
          const a = parent ? base - spread / 2 + (spread * (i + 0.5)) / fresh.length : base + (spread * i) / fresh.length
          let r = parent ? R * 0.85 : R
          let x = c.x + Math.cos(a) * r
          let y = c.y + Math.sin(a) * r
          // 다른 곡과 너무 붙으면 조금 더 바깥으로
          for (let k = 0; k < 4; k++) {
            const hit = [...next.values()].some((o) => Math.hypot(o.x - x, o.y - y) < 96)
            if (!hit) break
            r += 70
            x = c.x + Math.cos(a) * r
            y = c.y + Math.sin(a) * r
          }
          next.set(n.id, { ...n, x, y, parent: id, expanded: false })
        })
        return next
      })
      setEdges((prev) => {
        const seen = new Set(prev.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`))
        const add: [number, number][] = []
        for (const n of data.neighbors) {
          const k = `${Math.min(id, n.id)}-${Math.max(id, n.id)}`
          if (!seen.has(k)) {
            seen.add(k)
            add.push([id, n.id])
          }
        }
        return [...prev, ...add]
      })
    } finally {
      setLoading(null)
    }
  }, [])

  useEffect(() => {
    expand(startId)
  }, [startId, expand])

  // 선택한 곡이 가운데 오도록 화면을 옮겨요.
  const f = nodes.get(focus)
  useEffect(() => {
    if (f) setPan({ x: -f.x, y: -f.y })
  }, [f?.x, f?.y]) // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (id: number) => {
    if (drag.current?.moved) return
    setFocus(id)
    setPlayed(id)
    setTrail((t) => (t[t.length - 1] === id ? t : [...t, id]))
    myPlaylist.stop()
    sendTrack({ kind: 'play', id })
    expand(id)
  }

  const neighborsOfFocus = new Set(edges.filter(([a, b]) => a === focus || b === focus).flatMap(([a, b]) => [a, b]))
  const trailSet = new Set(trail)
  const visibleEdges = edges.filter(([a, b]) => nodes.has(a) && nodes.has(b))
  const playing = played !== null ? nodes.get(played) : null

  return (
    <div className="web">
      <div
        className="web__stage"
        onPointerDown={(e) => {
          // 화면 픽셀 → 그림 좌표 비율 (그림이 화면보다 크거나 작게 그려지므로)
          const w = svgRef.current?.clientWidth || 1000
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false, k: vb.w / w }
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          const dx = e.clientX - d.x
          const dy = e.clientY - d.y
          if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true
          if (d.moved) setPan({ x: d.px + dx * d.k, y: d.py + dy * d.k })
        }}
        onPointerUp={() => setTimeout(() => (drag.current = null), 0)}
        onPointerLeave={() => (drag.current = null)}
      >
        <svg ref={svgRef} className="web__svg" viewBox={`${-vb.w / 2} ${-vb.h / 2} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="비슷한 곡 거미줄">
          <defs>
            <clipPath id="web-clip-s">
              <circle r="34" />
            </clipPath>
            <clipPath id="web-clip-l">
              <circle r="50" />
            </clipPath>
          </defs>
          <g className={`web__world${drag.current?.moved ? ' is-dragging' : ''}`} style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
            {visibleEdges.map(([a, b]) => {
              const A = nodes.get(a)!
              const B = nodes.get(b)!
              const on = a === focus || b === focus
              const path = trailSet.has(a) && trailSet.has(b)
              return (
                <line
                  key={`${a}-${b}`}
                  x1={A.x}
                  y1={A.y}
                  x2={B.x}
                  y2={B.y}
                  className={`web__edge${on ? ' is-on' : ''}${path ? ' is-path' : ''}`}
                />
              )
            })}
            {[...nodes.values()].map((n) => {
              const isFocus = n.id === focus
              const near = neighborsOfFocus.has(n.id)
              const r = isFocus ? 50 : 34
              const img = small(n.coverUrl)
              return (
                <g
                  key={n.id}
                  className={`web__node${isFocus ? ' is-focus' : ''}${near || isFocus ? '' : ' is-far'}${loading === n.id ? ' is-loading' : ''}`}
                  transform={`translate(${n.x} ${n.y})`}
                  onClick={() => choose(n.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${n.track} — ${n.artistName}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') choose(n.id)
                  }}
                >
                  <circle r={r + 4} className="web__ring" />
                  {img ? (
                    <image href={img} x={-r} y={-r} width={r * 2} height={r * 2} clipPath={`url(#web-clip-${isFocus ? 'l' : 's'})`} preserveAspectRatio="xMidYMid slice" />
                  ) : (
                    <circle r={r} className="web__blank" />
                  )}
                  <text y={r + 20} className="web__title">
                    {(n.track || '').length > 18 ? `${(n.track || '').slice(0, 17)}…` : n.track}
                  </text>
                  <text y={r + 36} className="web__artist">
                    {n.artistName.length > 20 ? `${n.artistName.slice(0, 19)}…` : n.artistName}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
        {!nodes.size ? <p className="web__wait muted">거미줄을 펼치는 중…</p> : null}
      </div>

      <aside className="web__panel">
        {f ? (
          <>
            <p className="label">{played === f.id ? '지금 듣는 곡' : '가운데 곡'}</p>
            <h2 className="h-md">{f.track}</h2>
            <p className="muted">{f.artistName}</p>
            {f.genres.length ? <p className="small web__genres">{f.genres.join(' · ')}</p> : null}
            {playing && playing.id === f.id && f.embed ? (
              <SpotifyEmbed key={f.id} embed={f.embed} title={`${f.track} — ${f.artistName}`} height={80} autoPlay />
            ) : (
              <button type="button" className="btn btn--filled" onClick={() => choose(f.id)} disabled={!f.embed}>
                <span>▶ 듣기</span>
              </button>
            )}
            <div className="web__panel-actions">
              <AddButton song={f} />
              <Link href={`/picks/${f.id}`} className="arrow-link">
                <span>곡 페이지</span>
              </Link>
            </div>
            {trail.length > 1 ? (
              <div className="web__trail">
                <p className="label">지나온 곡</p>
                <ol>
                  {trail.map((id) => {
                    const t = nodes.get(id)
                    return t ? (
                      <li key={id}>
                        <button type="button" onClick={() => choose(id)} className={id === focus ? 'is-on' : ''}>
                          {t.track}
                        </button>
                      </li>
                    ) : null
                  })}
                </ol>
              </div>
            ) : null}
          </>
        ) : null}
      </aside>
    </div>
  )
}
