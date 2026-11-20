'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AddAllButton, AddButton } from '@/components/AddButton'
import { SongPlayer } from '@/components/SongPlayer'
import { sendTrack } from '@/components/Track'
import { myPlaylist } from '@/lib/myPlaylist'

type WebSong = {
  id: number
  track?: string | null
  artistName: string
  coverUrl?: string | null
  embed: string | null
  youtubeId?: string | null
}
// 거미줄 칸 하나: 곡이면 songs에 그 곡 하나, 앨범이면 에디터가 담은 수록곡들
type WebItem = { id: string; title: string; sub: string; coverUrl?: string | null; genres: string[]; href: string; songs: WebSong[] }
type Node = WebItem & { x: number; y: number; parent: string | null; expanded: boolean }

const small = (u?: string | null) => (u ? u.replace('ab67616d0000b273', 'ab67616d00001e02') : null)
const MAX_NODES = 90
const R = 190 // 가운데 곡에서 비슷한 곡까지 거리

export function SpiderWeb({ startId, kind = 'song' }: { startId: string; kind?: 'song' | 'album' | 'genre' }) {
  const isGenre = kind === 'genre'
  // 여러 곡을 가진 칸 (앨범 수록곡, 장르 대표곡)
  const isAlbum = kind === 'album' || isGenre
  const word = isGenre ? '장르' : kind === 'album' ? '앨범' : '곡'
  // 받침에 맞는 조사 (곡이/앨범이/장르가)
  const ga = isGenre ? '가' : '이'
  const eul = isGenre ? '를' : '을'
  const ro = isGenre ? '로' : '으로'
  const [nodes, setNodes] = useState<Map<string, Node>>(new Map())
  const [edges, setEdges] = useState<[string, string][]>([])
  const [focus, setFocus] = useState<string>(startId)
  const [loading, setLoading] = useState<string | null>(null)
  const [played, setPlayed] = useState<string | null>(null)
  // 앨범에서 지금 듣는 수록곡 순서
  const [songIdx, setSongIdx] = useState(0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [trail, setTrail] = useState<string[]>([startId])
  // 장르마다 구체성 점수 (드문 장르일수록 높아요) — 선 굵기에 써요
  const [gw, setGw] = useState<Record<string, number>>({})
  // 장르 지도: 두 장르가 함께 붙은 곡 수
  const [pairN, setPairN] = useState<Record<string, number>>({})
  // 눌러서 「왜 연결됐는지」 보고 있는 칸
  const [peek, setPeek] = useState<string | null>(null)
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean; k: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  // 확대·축소 (0.35배 ~ 2.5배)
  const [zoom, setZoom] = useState(1)
  const [quick, setQuick] = useState(false) // 확대 중에는 부드럽게 따라가는 효과를 끄기
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const panRef = useRef(pan)
  panRef.current = pan
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ d0: number; z0: number } | null>(null)
  const quickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  // 화면의 한 점(clientX, clientY)을 기준으로 확대: 그 점 아래 있던 곳이 그대로 손가락·마우스 아래 남게
  const zoomAt = useCallback(
    (next: number, cx?: number, cy?: number) => {
      const z0 = zoomRef.current
      const z1 = Math.min(2.5, Math.max(0.35, next))
      if (z1 === z0) return
      const el = svgRef.current
      let sx = 0
      let sy = 0
      if (el && cx !== undefined && cy !== undefined) {
        const r = el.getBoundingClientRect()
        const k = vb.w / (r.width || 1)
        sx = (cx - r.left - r.width / 2) * k
        sy = (cy - r.top - r.height / 2) * k
      }
      const p = panRef.current
      const np = { x: sx / z1 - sx / z0 + p.x, y: sy / z1 - sy / z0 + p.y }
      zoomRef.current = z1
      panRef.current = np
      setZoom(z1)
      setPan(np)
      setQuick(true)
      if (quickTimer.current) clearTimeout(quickTimer.current)
      quickTimer.current = setTimeout(() => setQuick(false), 180)
    },
    [vb.w],
  )

  // 마우스 휠·트랙패드로 확대 (페이지가 같이 스크롤되지 않게 직접 받아요)
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const step = e.ctrlKey ? 0.012 : 0.0018 // 트랙패드 핀치는 값이 작게 들어와요
      zoomAt(zoomRef.current * Math.exp(-e.deltaY * step), e.clientX, e.clientY)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  // 곡 하나를 펼치기: 비슷한 곡을 불러와서 그 곡 둘레(지나온 방향의 반대쪽)에 놓아요.
  const busy = useRef(new Set<string>())
  const expand = useCallback(async (id: string) => {
    const have = nodesRef.current.get(id)
    // 이미 펼쳤거나 펼치는 중이면 다시 하지 않아요 (빠르게 두 번 눌러도 한 번만)
    if (have?.expanded || busy.current.has(id)) return
    busy.current.add(id)
    setLoading(id)
    try {
      const res = await fetch(isGenre ? `/web/data?genre=${encodeURIComponent(id)}` : isAlbum ? `/web/data?album=${id}` : `/web/data?id=${id}`)
      if (!res.ok) return
      const data = (await res.json()) as { center: WebItem; neighbors: WebItem[]; weights?: Record<string, number>; links?: Record<string, number> }
      if (data.weights) setGw((w) => ({ ...w, ...data.weights }))
      if (data.links)
        setPairN((p) => {
          const next = { ...p }
          for (const [other, n] of Object.entries(data.links!)) next[id < other ? `${id}|${other}` : `${other}|${id}`] = n
          return next
        })
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
        const seen = new Set(prev.map(([a, b]) => (a < b ? `${a}|${b}` : `${b}|${a}`)))
        const add: [string, string][] = []
        for (const n of data.neighbors) {
          const k = id < n.id ? `${id}|${n.id}` : `${n.id}|${id}`
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
  }, [isAlbum, isGenre])

  useEffect(() => {
    expand(startId)
  }, [startId, expand])

  // 선택한 곡이 가운데 오도록 화면을 옮겨요.
  const f = nodes.get(focus)
  useEffect(() => {
    if (f) setPan({ x: -f.x, y: -f.y })
  }, [f?.x, f?.y]) // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (id: string, idx = 0) => {
    if (drag.current?.moved) return
    setPeek(null)
    setFocus(id)
    setPlayed(id)
    setSongIdx(idx)
    setTrail((t) => (t[t.length - 1] === id ? t : [...t, id]))
    myPlaylist.stop()
    const song = nodesRef.current.get(id)?.songs[idx]
    if (song) sendTrack({ kind: 'play', id: song.id })
    expand(id)
  }

  // 가운데 칸을 누르면 듣기, 다른 칸을 누르면 먼저 연결 이유를 보여주고 한 번 더 누르면 이동
  const tap = (id: string) => {
    if (drag.current?.moved) return
    if (id === focus || peek === id) choose(id)
    else setPeek(id)
  }

  // 두 칸이 같이 가진 장르 (드문 장르부터)
  const sharedOf = (a: Node, b: Node) =>
    a.genres.filter((g) => b.genres.includes(g)).sort((x, y) => (gw[y] ?? 1) - (gw[x] ?? 1))
  // 연결 강도 0~1: 겹치는 장르의 점수 합
  const together = (a: Node, b: Node) => pairN[a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`] || 0
  const strengthOf = (a: Node, b: Node) =>
    isGenre
      ? Math.min(1, Math.log1p(together(a, b)) / Math.log1p(120))
      : Math.min(1, sharedOf(a, b).reduce((t, g) => t + (gw[g] ?? 1), 0) / 30)

  const neighborsOfFocus = new Set(edges.filter(([a, b]) => a === focus || b === focus).flatMap(([a, b]) => [a, b]))
  const trailSet = new Set(trail)
  const visibleEdges = edges.filter(([a, b]) => nodes.has(a) && nodes.has(b))
  const playing = played !== null ? nodes.get(played) : null
  const current = f && played === f.id ? f.songs[Math.min(songIdx, f.songs.length - 1)] : null
  // 연결 이유 카드: 고른 칸과 이어진 칸(가운데 칸이 우선, 없으면 그 칸을 펼친 칸)
  const pk = peek ? nodes.get(peek) : null
  const linked = (x: string) => edges.some(([a, b]) => (a === peek && b === x) || (b === peek && a === x))
  const partnerId = pk ? (linked(focus) ? focus : pk.parent && nodes.has(pk.parent) ? pk.parent : edges.find(([a, b]) => a === peek || b === peek)?.find((x) => x !== peek)) : null
  const partner = partnerId ? nodes.get(partnerId) : null
  const shared = pk && partner ? sharedOf(pk, partner) : []
  const sharedSet = new Set(shared)
  const peekStrength = pk && partner ? strengthOf(pk, partner) : 0

  return (
    <div className="web">
      <div
        ref={stageRef}
        className="web__stage"
        onPointerDown={(e) => {
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          if (pointers.current.size === 2) {
            // 두 손가락: 벌리고 오므려서 확대·축소
            const [a, b] = [...pointers.current.values()]
            pinch.current = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: zoomRef.current }
            if (drag.current) drag.current.moved = true
            return
          }
          // 화면 픽셀 → 그림 좌표 비율 (그림이 화면보다 크거나 작게 그려지므로)
          const w = svgRef.current?.clientWidth || 1000
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false, k: vb.w / w }
        }}
        onPointerMove={(e) => {
          if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          if (pinch.current && pointers.current.size >= 2) {
            const [a, b] = [...pointers.current.values()]
            const d = Math.hypot(a.x - b.x, a.y - b.y)
            zoomAt(pinch.current.z0 * (d / pinch.current.d0), (a.x + b.x) / 2, (a.y + b.y) / 2)
            return
          }
          const d = drag.current
          if (!d || pinch.current) return
          const dx = e.clientX - d.x
          const dy = e.clientY - d.y
          if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true
          const k = d.k / zoomRef.current
          if (d.moved) setPan({ x: d.px + dx * k, y: d.py + dy * k })
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId)
          if (pointers.current.size < 2 && pinch.current) {
            pinch.current = null
            // 남은 손가락으로 바로 끌지 않게, 다음에 새로 누를 때부터 끌기
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
        <svg ref={svgRef} className="web__svg" viewBox={`${-vb.w / 2} ${-vb.h / 2} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`비슷한 ${word} 거미줄`}>
          <defs>
            <clipPath id="web-clip-s">
              <circle r="34" />
            </clipPath>
            <clipPath id="web-clip-l">
              <circle r="50" />
            </clipPath>
          </defs>
          <g
            className={`web__world${drag.current?.moved || quick ? ' is-dragging' : ''}`}
            style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
          >
            {visibleEdges.map(([a, b]) => {
              const A = nodes.get(a)!
              const B = nodes.get(b)!
              const on = a === focus || b === focus
              const path = trailSet.has(a) && trailSet.has(b)
              const peeked = !!peek && !!partnerId && ((a === peek && b === partnerId) || (b === peek && a === partnerId))
              // 겹치는 장르가 많고 드물수록 굵고 진하게, 하나도 없으면(빈자리 채운 추천) 점선
              const t = strengthOf(A, B)
              return (
                <line
                  key={`${a}-${b}`}
                  x1={A.x}
                  y1={A.y}
                  x2={B.x}
                  y2={B.y}
                  className={`web__edge${on ? ' is-on' : ''}${path ? ' is-path' : ''}${peeked ? ' is-peek' : ''}${t === 0 ? ' is-weak' : ''}`}
                  style={{ strokeWidth: (0.8 + 3.6 * t) * (peeked ? 1.6 : 1), opacity: peeked ? 1 : 0.35 + 0.65 * t }}
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
                  className={`web__node${isFocus ? ' is-focus' : ''}${near || isFocus || n.id === peek ? '' : ' is-far'}${loading === n.id ? ' is-loading' : ''}${n.id === peek ? ' is-peek' : ''}`}
                  transform={`translate(${n.x} ${n.y})`}
                  onClick={() => tap(n.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${n.title} — ${n.sub}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') tap(n.id)
                  }}
                >
                  <circle r={r + 4} className="web__ring" />
                  {img ? (
                    <image href={img} x={-r} y={-r} width={r * 2} height={r * 2} clipPath={`url(#web-clip-${isFocus ? 'l' : 's'})`} preserveAspectRatio="xMidYMid slice" />
                  ) : (
                    <circle r={r} className="web__blank" />
                  )}
                  <text y={r + 20} className="web__title">
                    {n.title.length > 18 ? `${n.title.slice(0, 17)}…` : n.title}
                  </text>
                  <text y={r + 36} className="web__artist">
                    {n.sub.length > 20 ? `${n.sub.slice(0, 19)}…` : n.sub}
                  </text>
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
            aria-label="처음 크기로"
            className="web__zoom-reset"
            onClick={() => {
              setZoom(1)
              zoomRef.current = 1
              if (f) setPan({ x: -f.x, y: -f.y })
            }}
          >
            {Math.round(zoom * 100)}%
          </button>
        </div>
        {pk ? (
          <div className="web__why" onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" className="web__why-close" aria-label="닫기" onClick={() => setPeek(null)}>
              ×
            </button>
            <p className="label">왜 연결됐을까</p>
            <p className="web__why-pair">
              {partner ? <span>{partner.title}</span> : null}
              {partner ? <span className="muted"> ↔ </span> : null}
              <span>{pk.title}</span>
            </p>
            {isGenre && partner ? (
              <>
                <p className="small muted">두 장르가 함께 붙은 곡</p>
                <p className="h-md">{together(pk, partner)}곡</p>
                <p className="web__why-meter small muted">
                  <span className="web__why-bar">
                    <span style={{ width: `${Math.max(8, Math.round(peekStrength * 100))}%` }} />
                  </span>
                  {peekStrength > 0.6 ? '늘 붙어 다녀요' : peekStrength > 0.3 ? '자주 같이 나와요' : '가끔 같이 나와요'}
                </p>
              </>
            ) : shared.length ? (
              <>
                <p className="small muted">같이 가진 장르</p>
                <ul className="web__why-genres">
                  {shared.map((g) => (
                    <li key={g} className="is-shared">
                      {g}
                    </li>
                  ))}
                  {pk.genres
                    .filter((g) => !sharedSet.has(g))
                    .map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                </ul>
                <p className="web__why-meter small muted">
                  <span className="web__why-bar">
                    <span style={{ width: `${Math.max(8, Math.round(peekStrength * 100))}%` }} />
                  </span>
                  {peekStrength > 0.6 ? '아주 가까워요' : peekStrength > 0.3 ? '꽤 비슷해요' : '살짝 닮았어요'}
                </p>
              </>
            ) : (
              <p className="small muted">겹치는 장르는 없어요. 비슷한 {word}{ga} 모자라서 함께 들어볼 만한 {word}{eul} 채워 넣은 자리예요.</p>
            )}
            <button type="button" className="btn btn--filled web__why-go" onClick={() => choose(pk.id)}>
              <span>▶ 이 {word}{ro} 이동</span>
            </button>
          </div>
        ) : null}
        {!nodes.size ? <p className="web__wait muted">거미줄을 펼치는 중…</p> : null}
      </div>

      <aside className="web__panel">
        {f ? (
          <>
            <p className="label">{played === f.id ? `지금 듣는 ${word}` : `가운데 ${word}`}</p>
            <h2 className="h-md">{f.title}</h2>
            <p className="muted">{f.sub}</p>
            {f.genres.length ? <p className="small web__genres">{f.genres.join(' · ')}</p> : null}
            {playing && playing.id === f.id && current?.embed ? (
              <SongPlayer
                key={`${f.id}-${songIdx}`}
                pickId={current.id}
                embed={current.embed}
                youtubeId={current.youtubeId}
                title={`${current.track} — ${current.artistName}`}
                autoPlay
                onEnded={isAlbum && songIdx + 1 < f.songs.length ? () => choose(f.id, songIdx + 1) : undefined}
              />
            ) : (
              <button type="button" className="btn btn--filled" onClick={() => choose(f.id)} disabled={!f.songs[0]?.embed}>
                <span>▶ 듣기</span>
              </button>
            )}
            {isAlbum && f.songs.length ? (
              <ol className="web__tracks">
                {f.songs.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => choose(f.id, i)}
                      className={played === f.id && i === songIdx ? 'is-on' : ''}
                      disabled={!s.embed}
                    >
                      {s.track || '곡'}
                      {isGenre ? <span className="muted"> — {s.artistName}</span> : null}
                    </button>
                  </li>
                ))}
              </ol>
            ) : null}
            <div className="web__panel-actions">
              {isAlbum ? (
                f.songs.length > 1 ? <AddAllButton songs={f.songs} label={isGenre ? '대표곡 담기' : '수록곡 담기'} /> : f.songs[0] ? <AddButton song={f.songs[0]} /> : null
              ) : f.songs[0] ? (
                <AddButton song={f.songs[0]} />
              ) : null}
              <Link href={f.href} className="arrow-link">
                <span>{word} 페이지</span>
              </Link>
            </div>
            {trail.length > 1 ? (
              <div className="web__trail">
                <p className="label">지나온 {word}</p>
                <ol>
                  {trail.map((id) => {
                    const t = nodes.get(id)
                    return t ? (
                      <li key={id}>
                        <button type="button" onClick={() => choose(id)} className={id === focus ? 'is-on' : ''}>
                          {t.title}
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
