'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { myPlaylist, savedTime, useMyPlaylist } from '@/lib/myPlaylist'
import { reportBadVideo, setSource, useSource, youtubeFor } from '@/lib/listenSource'
import { markPlayed } from '@/lib/played'
import type { Toast } from '@/lib/toast'
import { AddButton } from './AddButton'
import { SpotifyEmbed } from './SpotifyEmbed'
import { sendTrack } from './Track'
import { YouTubeEmbed, type YTPlayer } from './YouTubeEmbed'

const small = (u?: string | null) => (u ? u.replace('ab67616d0000b273', 'ab67616d00004851') : null)
const mmss = (s: number) => {
  if (!Number.isFinite(s) || s <= 0) return '0:00'
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function Icon({ d, size = 20, fill = true }: { d: string; size?: number; fill?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={d}
        fill={fill ? 'currentColor' : 'none'}
        stroke={fill ? 'none' : 'currentColor'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
const I = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
  prev: 'M6 6h2v12H6zM20 6v12l-10-6z',
  next: 'M16 6h2v12h-2zM4 6v12l10-6z',
  queue: 'M4 7h12M4 12h12M4 17h8',
  close: 'M6 6l12 12M18 6L6 18',
  down: 'M6 9l6 6 6-6',
  hide: 'M9 6v12M15 6v12',
  big: 'M4 10V4h6M20 14v6h-6',
  smallW: 'M10 4v6H4M14 20v-6h6',
}

// 사이트 맨 아래에 길게 떠 있는 재생바.
// - 레이아웃에 한 번만 있어서 페이지를 옮겨도 끊기지 않아요.
// - YouTube로 들을 땐 영상 창(YouTube 규정상 200px 이상)이 왼쪽 아래에 함께 떠요. 창을 접으면 재생이 멈춰요.
// - 다시 들어오면 마지막에 듣던 곡이 멈춘 채로 떠 있어요(이어 듣기).
export function PlaylistBar() {
  const { player } = useMyPlaylist()
  const source = useSource()
  const [mounted, setMounted] = useState(false)
  const [note, setNote] = useState<Toast | null>(null)
  const [queueOpen, setQueueOpen] = useState(false)
  // 영상 창 너비 — 오른쪽 위 모서리를 끌어서 조절 (YouTube 규정상 높이 200px = 너비 356px이 최소)
  const [videoW, setVideoW] = useState(356)
  useEffect(() => {
    try {
      const w = Number(localStorage.getItem('mm_video_w'))
      if (w >= 356) setVideoW(w)
    } catch {
      /* 무시 */
    }
  }, [])
  const resizeVideo = (w: number, save = false) => {
    const max = Math.max(356, Math.min(1280, window.innerWidth - 48))
    const next = Math.round(Math.min(max, Math.max(356, w)))
    setVideoW(next)
    setVideoPos((p) =>
      p ? { left: Math.min(p.left, window.innerWidth - next - 8), bottom: p.bottom } : p,
    )
    if (save)
      try {
        localStorage.setItem('mm_video_w', String(next))
      } catch {
        /* 무시 */
      }
  }
  // 영상 창 위치 — 윗줄을 잡고 끌어서 옮겨요 (데스크톱). 다음에 와도 그 자리.
  const [videoPos, setVideoPos] = useState<{ left: number; bottom: number } | null>(null)
  const videoBox = useRef<HTMLDivElement>(null)
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem('mm_video_pos') || 'null') as {
        left?: number
        bottom?: number
      } | null
      if (v && Number.isFinite(v.left) && Number.isFinite(v.bottom))
        setVideoPos({ left: v.left!, bottom: v.bottom! })
    } catch {
      /* 무시 */
    }
  }, [])
  const clampPos = (left: number, bottom: number) => {
    const el = videoBox.current
    const w = el?.offsetWidth || 356
    const h = el?.offsetHeight || 234
    return {
      left: Math.round(Math.min(Math.max(8, left), window.innerWidth - w - 8)),
      bottom: Math.round(Math.min(Math.max(84, bottom), window.innerHeight - h - 8)),
    }
  }
  const startMove = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button') || window.innerWidth <= 768) return
    e.preventDefault()
    const el = videoBox.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const l0 = r.left
    const b0 = window.innerHeight - r.bottom
    const x0 = e.clientX
    const y0 = e.clientY
    let last = { left: l0, bottom: b0 }
    const move = (ev: PointerEvent) => {
      last = clampPos(l0 + ev.clientX - x0, b0 - (ev.clientY - y0))
      setVideoPos(last)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.classList.remove('is-moving')
      try {
        localStorage.setItem('mm_video_pos', JSON.stringify(last))
      } catch {
        /* 무시 */
      }
    }
    document.body.classList.add('is-moving')
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  // 창 크기가 바뀌면 화면 밖으로 나가지 않게
  useEffect(() => {
    const fit = () => setVideoPos((p) => (p ? clampPos(p.left, p.bottom) : p))
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    const x0 = e.clientX
    const y0 = e.clientY
    const w0 = videoW
    let last = w0
    const move = (ev: PointerEvent) => {
      // 오른쪽·위로 끌면 커지고, 왼쪽·아래로 끌면 작아져요 (16:9 비율 유지)
      const dx = ev.clientX - x0
      const dy = (y0 - ev.clientY) * (16 / 9)
      last = w0 + (Math.abs(dx) > Math.abs(dy) ? dx : dy)
      resizeVideo(last)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.classList.remove('is-resizing')
      resizeVideo(last, true)
    }
    document.body.classList.add('is-resizing')
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState({ t: 0, d: 0 })
  const yt = useRef<YTPlayer | null>(null)
  useEffect(() => setMounted(true), [])

  const now = player ? player.queue[player.index] : null
  const live = Boolean(player && !player.idle)

  // ── 알림(좋아요 등) ──
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const on = (e: Event) => {
      const d = (e as CustomEvent<Toast | string>).detail
      setNote(typeof d === 'string' ? { text: d } : d)
      clearTimeout(t)
      t = setTimeout(() => setNote(null), 2600)
    }
    window.addEventListener('mm-toast', on)
    return () => {
      window.removeEventListener('mm-toast', on)
      clearTimeout(t)
    }
  }, [])

  // ── 어떤 플레이어로 틀지: YouTube 영상을 찾고, 없거나 막히면 Spotify ──
  const [vid, setVid] = useState<string | null | undefined>(undefined)
  const [blocked, setBlocked] = useState(false)
  useEffect(() => {
    if (!now || source !== 'youtube') return
    let alive = true
    setBlocked(false)
    if (now.youtubeId) {
      setVid(now.youtubeId)
      return
    }
    setVid(undefined)
    youtubeFor(now.id).then((id) => alive && setVid(id))
    return () => {
      alive = false
    }
  }, [now, source])
  const kind: 'yt' | 'sp' | 'wait' | null = !now
    ? null
    : source === 'youtube' && vid && !blocked
      ? 'yt'
      : source === 'youtube' && vid === undefined
        ? 'wait'
        : 'sp'

  // ── 곡이 바뀌어 재생이 시작될 때: 통계 1회, 들은 곡 표시, 다른 플레이어 끄기 ──
  const songKey = now && live ? `${now.id}:${player!.index}` : null
  useEffect(() => {
    if (!songKey || !now) return
    sendTrack({ kind: 'play', id: now.id })
    markPlayed(now.id)
    window.dispatchEvent(new Event('mm-bar-play'))
    setPos({ t: 0, d: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songKey])

  // ── 진행 시간 (YouTube일 때) + 몇 초까지 들었는지 저장 ──
  useEffect(() => {
    if (!live || kind !== 'yt') return
    let n = 0
    const id = setInterval(() => {
      const p = yt.current
      if (!p) return
      try {
        const t = p.getCurrentTime() || 0
        setPos({ t, d: p.getDuration() || 0 })
        if (++n % 4 === 0) myPlaylist.saveTime(t)
      } catch {
        /* 플레이어 준비 전 */
      }
    }, 500)
    return () => clearInterval(id)
  }, [live, kind])

  // 바가 떠 있는 동안 페이지 아래 여백
  useEffect(() => {
    const on = mounted && Boolean(now)
    document.body.classList.toggle('has-mbar', on)
    document.body.classList.toggle('has-mbar--sp', on && live && kind === 'sp')
    return () => {
      document.body.classList.remove('has-mbar', 'has-mbar--sp')
    }
  }, [mounted, now, live, kind])

  // 다음 곡 — 목록이 끝나면 Editor's Picks에서 아직 안 나온 곡을 랜덤으로 골라 계속 틀어요
  const nextBusy = useRef(false)
  const next = useCallback(async () => {
    const p = myPlaylist.get().player
    if (!p) return
    if (p.index < p.queue.length - 1) return myPlaylist.step(1)
    if (nextBusy.current) return
    nextBusy.current = true
    try {
      const x = p.queue
        .slice(-200)
        .map((s) => s.id)
        .join(',')
      const r = await fetch(`/explore/shuffle/next?x=${x}`).then((res) =>
        res.ok ? res.json() : null,
      )
      const song = r?.song
      if (song?.embed) myPlaylist.appendAndPlay(song)
      else myPlaylist.step(1)
    } catch {
      myPlaylist.step(1)
    } finally {
      nextBusy.current = false
    }
  }, [])

  const toggle = useCallback(() => {
    if (!player) return
    if (player.idle) return myPlaylist.resume()
    const p = yt.current
    if (kind === 'yt' && p) {
      if (playing) p.pauseVideo()
      else p.playVideo()
    }
  }, [player, kind, playing])

  const fold = useCallback(() => {
    let t: number | undefined
    try {
      t = yt.current?.getCurrentTime()
    } catch {
      t = undefined
    }
    setPlaying(false)
    myPlaylist.stop(t)
  }, [])

  // ── 키보드: 스페이스 재생/정지, ←/→ 이전/다음 (입력 칸·버튼에 있을 땐 무시) ──
  useEffect(() => {
    if (!now) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      const el = document.activeElement as HTMLElement | null
      if (
        el &&
        el !== document.body &&
        (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A|IFRAME)$/.test(el.tagName))
      )
        return
      if (e.code === 'Space' && (kind === 'yt' || player?.idle)) {
        e.preventDefault()
        toggle()
      } else if (e.key === 'ArrowRight') void next()
      else if (e.key === 'ArrowLeft') myPlaylist.step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [now, kind, player, toggle, next])

  if (!mounted) return null
  const pct = pos.d ? Math.min(100, (pos.t / pos.d) * 100) : 0
  const startAt = live ? savedTime() : 0
  const showCtrl = !live || kind !== 'sp'

  return (
    <>
      {note ? (
        <div className={`pl-toast${now ? ' pl-toast--bar' : ''}`} role="status">
          <span>{note.text}</span>
          {note.undo ? (
            <button
              type="button"
              onClick={() => {
                note.undo?.()
                setNote(null)
              }}
            >
              되돌리기
            </button>
          ) : null}
        </div>
      ) : null}

      {now && live && kind !== 'sp' ? (
        <div
          ref={videoBox}
          className="mbar-video"
          role="region"
          aria-label="영상"
          style={{
            ['--vw' as string]: `${videoW}px`,
            ...(videoPos
              ? {
                  ['--vl' as string]: `${videoPos.left}px`,
                  ['--vb' as string]: `${videoPos.bottom}px`,
                }
              : {}),
          }}
        >
          <span
            className="mbar-video__grip"
            role="separator"
            aria-label="영상 크기 조절 (끌어서 크게·작게, 두 번 누르면 처음 크기)"
            onPointerDown={startResize}
            onDoubleClick={() => resizeVideo(356, true)}
          />
          <div
            className="mbar-video__head"
            onPointerDown={startMove}
            title="끌어서 옮기기 · 두 번 누르면 처음 자리"
            onDoubleClick={(e) => {
              if ((e.target as HTMLElement).closest('button')) return
              setVideoPos(null)
              try {
                localStorage.removeItem('mm_video_pos')
              } catch {
                /* 무시 */
              }
            }}
          >
            <span>YouTube로 듣는 중</span>
            <span className="mbar-video__tools">
              <button
                type="button"
                className="mbar-video__sp"
                title="Spotify로 들으면 영상 없이 미니바만으로 들을 수 있어요"
                onClick={() => setSource('spotify')}
              >
                Spotify로 듣기
              </button>
              <button
                type="button"
                className="mbar-video__size"
                aria-label={videoW > 356 ? '영상 가장 작게' : '영상 크게'}
                onClick={() => resizeVideo(videoW > 356 ? 356 : 640, true)}
              >
                <Icon d={videoW > 356 ? I.smallW : I.big} size={16} fill={false} />
              </button>
              <button
                type="button"
                className="mbar-video__dock"
                aria-label="영상 가장 작게 내려놓기 (계속 재생)"
                title="가장 작게 줄여 왼쪽 아래에 내려놔요 — 음악은 계속 나와요"
                onClick={() => {
                  resizeVideo(356, true)
                  setVideoPos(null)
                  try {
                    localStorage.removeItem('mm_video_pos')
                  } catch {
                    /* 무시 */
                  }
                }}
              >
                <Icon d={I.down} size={18} fill={false} />
              </button>
              <button
                type="button"
                aria-label="멈추고 숨기기"
                title="재생을 멈추고 영상 창을 숨겨요 — 재생바의 ▶로 이어 듣기"
                onClick={fold}
              >
                <Icon d={I.hide} size={16} fill={false} />
              </button>
            </span>
          </div>
          {kind === 'yt' ? (
            <YouTubeEmbed
              key="bar-yt"
              reloadKey={`${now.id}:${player!.index}`}
              videoId={vid!}
              title={`${now.track || ''} — ${now.artistName}`}
              autoPlay
              start={startAt}
              onPlayer={(p) => (yt.current = p)}
              onPlaying={setPlaying}
              onEnded={() => void next()}
              onBlocked={() => {
                setBlocked(true)
                reportBadVideo(now.id, vid!)
              }}
            />
          ) : (
            <div className="mbar-video__wait">YouTube에서 찾는 중…</div>
          )}
        </div>
      ) : null}

      {now ? (
        <div
          className={`mbar${live && kind === 'sp' ? ' mbar--sp' : ''}${live ? '' : ' mbar--idle'}`}
          role="region"
          aria-label="재생바"
        >
          <div className="mbar__line" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="mbar__now">
            <Link
              href={`/picks/${now.id}`}
              className="mbar__cover"
              tabIndex={-1}
              aria-hidden="true"
            >
              {now.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={small(now.coverUrl) || ''} alt="" width={48} height={48} />
              ) : null}
            </Link>
            <div className="mbar__meta">
              <Link href={`/picks/${now.id}`} className="mbar__track">
                {now.track || 'Untitled'}
              </Link>
              <span className="mbar__sub">
                {live ? now.artistName : '멈춤 · ▶ 눌러서 이어 듣기'}
                {live ? <span className="mbar__label"> · {player!.label}</span> : null}
              </span>
            </div>
            <AddButton song={now} compact tone="dark" className="mbar__heart" />
          </div>

          <div className="mbar__center">
            {showCtrl ? (
              <>
                <div className="mbar__ctrl">
                  <button
                    type="button"
                    className="mbar__prev"
                    aria-label="이전 곡"
                    disabled={player!.index === 0}
                    onClick={() => myPlaylist.step(-1)}
                  >
                    <Icon d={I.prev} />
                  </button>
                  <button
                    type="button"
                    className="mbar__toggle"
                    aria-label={live && playing ? '일시정지' : '재생'}
                    onClick={toggle}
                  >
                    <Icon d={live && playing ? I.pause : I.play} />
                  </button>
                  <button
                    type="button"
                    className="mbar__next"
                    aria-label="다음 곡"
                    onClick={() => void next()}
                  >
                    <Icon d={I.next} />
                  </button>
                </div>
                {live && kind === 'yt' ? (
                  <div className="mbar__seek">
                    <span>{mmss(pos.t)}</span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(1, Math.floor(pos.d))}
                      value={Math.floor(pos.t)}
                      aria-label="재생 위치"
                      onChange={(e) => {
                        const t = Number(e.target.value)
                        yt.current?.seekTo(t, true)
                        setPos((p) => ({ ...p, t }))
                      }}
                      style={{ ['--p' as string]: `${pct}%` }}
                    />
                    <span>{mmss(pos.d)}</span>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mbar__sp">
                <SpotifyEmbed
                  key={`${now.id}-${player!.index}`}
                  embed={now.embed}
                  title={`${now.track || ''} — ${now.artistName}`}
                  height={80}
                  autoPlay
                  onEnded={() => void next()}
                />
              </div>
            )}
          </div>

          <div className="mbar__tools">
            <div className="mbar__src" role="group" aria-label="듣는 곳">
              <button
                type="button"
                className={source === 'youtube' ? 'is-on' : ''}
                onClick={() => setSource('youtube')}
              >
                YouTube
              </button>
              <button
                type="button"
                className={source === 'spotify' ? 'is-on' : ''}
                onClick={() => setSource('spotify')}
              >
                Spotify
              </button>
            </div>
            <button
              type="button"
              className={`mbar__icon${queueOpen ? ' is-on' : ''}`}
              aria-label="다음 곡 목록"
              aria-expanded={queueOpen}
              onClick={() => setQueueOpen((o) => !o)}
            >
              <Icon d={I.queue} fill={false} />
            </button>
            <button
              type="button"
              className="mbar__icon mbar__close"
              aria-label="재생바 닫기"
              onClick={() => {
                setQueueOpen(false)
                myPlaylist.close()
              }}
            >
              <Icon d={I.close} size={18} fill={false} />
            </button>
          </div>
        </div>
      ) : null}

      {now && queueOpen ? (
        <div className="mbar-queue" role="dialog" aria-label="다음 곡">
          <div className="mbar-queue__head">
            <strong>다음 곡</strong>
            <span>{player!.label} 순서대로</span>
          </div>
          <ol>
            {player!.queue.map((s, i) => (
              <li
                key={`${s.id}-${i}`}
                className={i === player!.index ? 'is-now' : i < player!.index ? 'is-past' : ''}
              >
                <button
                  type="button"
                  className="mbar-queue__item"
                  onClick={() => myPlaylist.jump(i)}
                >
                  {s.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={small(s.coverUrl) || ''}
                      alt=""
                      width={36}
                      height={36}
                      loading="lazy"
                    />
                  ) : (
                    <span className="mbar-queue__ph" />
                  )}
                  <span className="mbar-queue__text">
                    <span className="mbar-queue__track">{s.track || 'Untitled'}</span>
                    <span className="mbar-queue__artist">{s.artistName}</span>
                  </span>
                  {i === player!.index ? <span className="mbar-queue__now">재생 중</span> : null}
                </button>
                <button
                  type="button"
                  className="mbar-queue__x"
                  aria-label={
                    i === player!.index
                      ? `${s.track} 빼고 다음 곡 듣기`
                      : `${s.track} 목록에서 빼기`
                  }
                  title={i === player!.index ? '빼고 다음 곡으로' : '목록에서 빼기'}
                  onClick={async () => {
                    // 마지막 곡(지금 곡)을 빼면 랜덤으로 다음 곡을 먼저 불러온 뒤 빼요
                    if (i === player!.index && i === player!.queue.length - 1) {
                      await next()
                      const p = myPlaylist.get().player
                      if (p && p.index !== i) return myPlaylist.dequeue(i)
                    }
                    myPlaylist.dequeue(i)
                  }}
                >
                  <Icon d={I.close} size={14} fill={false} />
                </button>
              </li>
            ))}
          </ol>
          <p className="mbar-queue__foot">
            곡이 끝나면 다음 곡으로, 목록이 끝나면 Editor&apos;s Picks에서 랜덤으로 이어서 틀어요 ·
            스페이스 재생/정지 · ←→ 이전/다음
          </p>
        </div>
      ) : null}
    </>
  )
}
