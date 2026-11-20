'use client'
import { useEffect, useRef } from 'react'

// YouTube 공식 플레이어(IFrame API). 로그인 없이 곡 전체가 재생돼요.
// YouTube 규정상 화면이 최소 200×200 이상 보여야 해서 영상 창을 작게라도 띄워요.

export type YTPlayer = {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (s: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  destroy: () => void
}
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string
      width?: string | number
      height?: string | number
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: (e: { target: YTPlayer }) => void
        onStateChange?: (e: { data: number }) => void
        onError?: (e: { data: number }) => void
      }
    },
  ) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
    __ytApi?: Promise<YTNamespace>
  }
}

function loadYT(): Promise<YTNamespace> {
  if (window.__ytApi) return window.__ytApi
  window.__ytApi = new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT)
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve(window.YT!)
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.async = true
    s.onerror = () => {
      window.__ytApi = undefined
      reject(new Error('youtube api'))
    }
    document.body.appendChild(s)
  })
  return window.__ytApi
}

export function YouTubeEmbed({
  videoId,
  title,
  autoPlay = false,
  className = '',
  onEnded,
  onBlocked,
  start = 0,
  onPlayer,
  onPlaying,
}: {
  videoId: string
  title: string
  autoPlay?: boolean
  className?: string
  /** 이 초부터 재생 (이어 듣기) */
  start?: number
  /** 재생바가 직접 멈추고·넘기도록 플레이어를 넘겨줘요 */
  onPlayer?: (p: YTPlayer | null) => void
  onPlaying?: (playing: boolean) => void
  onEnded?: () => void
  /** 다른 사이트에서 재생이 막힌 영상일 때 */
  onBlocked?: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const endedRef = useRef(onEnded)
  endedRef.current = onEnded
  const blockedRef = useRef(onBlocked)
  blockedRef.current = onBlocked
  const playerRef = useRef(onPlayer)
  playerRef.current = onPlayer
  const playingRef = useRef(onPlaying)
  playingRef.current = onPlaying
  const startRef = useRef(start)

  useEffect(() => {
    if (!box.current) return
    let player: YTPlayer | null = null
    let cancelled = false
    const slot = document.createElement('div')
    box.current.appendChild(slot)
    loadYT()
      .then((YT) => {
        if (cancelled) return
        player = new YT.Player(slot, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: { autoplay: autoPlay ? 1 : 0, playsinline: 1, rel: 0, modestbranding: 1, start: Math.floor(startRef.current) || 0 },
          events: {
            onReady: (e) => {
              playerRef.current?.(e.target)
              if (autoPlay) e.target.playVideo()
            },
            onStateChange: (e) => {
              // 1 재생 · 2 멈춤 · 0 끝
              if (e.data === 1) playingRef.current?.(true)
              if (e.data === 2 || e.data === 0) playingRef.current?.(false)
              if (e.data === 0) endedRef.current?.()
            },
            onError: (e) => {
              // 101·150: 퍼가기 금지, 100: 없는 영상
              if ([100, 101, 150].includes(e.data)) blockedRef.current?.()
            },
          },
        })
      })
      .catch(() => blockedRef.current?.())
    return () => {
      cancelled = true
      playerRef.current?.(null)
      try {
        player?.destroy()
      } catch {}
      slot.remove()
    }
  }, [videoId, autoPlay])

  return <div ref={box} className={`yt-embed ${className}`} title={title} />
}
