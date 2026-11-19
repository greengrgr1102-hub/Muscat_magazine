'use client'
import { useEffect, useRef } from 'react'

// Spotify 공식 플레이어(iFrame API)를 써서, 누르자마자 바로 재생되게 합니다.
// Spotify에 로그인돼 있지 않은 방문자는 Spotify 정책상 30초 미리 듣기로 재생돼요.

type Controller = {
  play: () => void
  destroy: () => void
  addListener: (event: string, cb: (e: unknown) => void) => void
}
type IFrameAPI = {
  createController: (el: HTMLElement, opts: { uri: string; width?: string | number; height?: number }, cb: (c: Controller) => void) => void
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void
    __spotifyApi?: Promise<IFrameAPI>
  }
}

function loadApi(): Promise<IFrameAPI> {
  if (window.__spotifyApi) return window.__spotifyApi
  window.__spotifyApi = new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = (api) => resolve(api)
    const s = document.createElement('script')
    s.src = 'https://open.spotify.com/embed/iframe-api/v1'
    s.async = true
    s.onerror = () => {
      window.__spotifyApi = undefined
      reject(new Error('spotify api'))
    }
    document.body.appendChild(s)
  })
  return window.__spotifyApi
}

/** open.spotify.com/embed/track/ID… → spotify:track:ID */
export function embedToUri(embed: string | null) {
  const m = embed?.match(/embed\/(track|album|playlist)\/([A-Za-z0-9]+)/)
  return m ? `spotify:${m[1]}:${m[2]}` : null
}

export function SpotifyEmbed({
  embed,
  title,
  height = 80,
  autoPlay = false,
  className = '',
  onEnded,
}: {
  embed: string | null
  title: string
  height?: number
  autoPlay?: boolean
  className?: string
  onEnded?: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const uri = embedToUri(embed)
  // 최신 onEnded를 기억해 두어, 플레이어를 다시 만들지 않고도 쓸 수 있게
  const endedRef = useRef(onEnded)
  endedRef.current = onEnded

  useEffect(() => {
    if (!uri || !box.current) return
    let ctrl: Controller | null = null
    let cancelled = false
    // React가 관리하지 않는 빈 칸을 하나 만들어서 그 자리에 플레이어를 넣어요.
    const slot = document.createElement('div')
    box.current.appendChild(slot)
    loadApi()
      .then((api) => {
        if (cancelled) return
        api.createController(slot, { uri, width: '100%', height }, (c) => {
          ctrl = c
          if (cancelled) return c.destroy()
          if (autoPlay) c.addListener('ready', () => c.play())
          // 곡이 끝나면 알려줘요 (플리 이어 듣기용)
          let last = 0
          let done = false
          c.addListener('playback_update', (e) => {
            const d = (e as { data?: { isPaused?: boolean; position?: number; duration?: number } }).data
            if (!d?.duration || done) return
            const pos = d.position || 0
            const atEnd = pos >= d.duration - 700 || (d.isPaused && last >= d.duration - 1500 && pos < 1000)
            if (atEnd && last > 0) {
              done = true
              endedRef.current?.()
            }
            last = pos
          })
        })
      })
      .catch(() => {
        // 공식 플레이어를 못 불러오면 일반 플레이어로 대신 보여줘요 (재생은 한 번 더 눌러야 해요).
        if (cancelled || !embed) return
        slot.innerHTML = `<iframe src="${embed}" width="100%" height="${height}" style="border:0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="${title.replace(/"/g, '')}"></iframe>`
      })
    return () => {
      cancelled = true
      try {
        ctrl?.destroy()
      } catch {
        /* 이미 사라진 플레이어 */
      }
      slot.remove()
    }
  }, [uri, embed, height, autoPlay, title])

  if (!uri) return null
  // Spotify가 높이를 마음대로 줄이지 않도록 CSS 변수로 높이를 고정해요.
  return (
    <div
      ref={box}
      className={`spotify-embed ${className}`}
      style={{ minHeight: height, ['--embed-h' as string]: `${height}px` }}
      aria-label={`Spotify 플레이어: ${title}`}
    />
  )
}
