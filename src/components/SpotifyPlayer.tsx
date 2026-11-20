'use client'
import { useEffect, useState } from 'react'
import { myPlaylist } from '@/lib/myPlaylist'
import { SpotifyEmbed } from './SpotifyEmbed'
import { SongPlayer } from './SongPlayer'
import { sendTrack } from './Track'

// 처음엔 커버만 보여 주고, 재생 버튼을 누르면 그 자리에 Spotify 플레이어를 불러옵니다.
// (플레이어 여러 개를 한꺼번에 불러오면 페이지가 무거워져서요.)
export function SpotifyPlayer({
  embed,
  cover,
  title,
  pickId,
  youtubeId,
}: {
  embed: string | null
  cover?: string | null
  title: string
  pickId?: number
  youtubeId?: string | null
}) {
  const [open, setOpen] = useState(false)
  // 아래 재생바가 재생을 시작하면 카드 플레이어는 닫아요.
  useEffect(() => {
    const off = () => setOpen(false)
    window.addEventListener('mm-bar-play', off)
    return () => window.removeEventListener('mm-bar-play', off)
  }, [])
  if (open && embed) {
    return (
      <div className="epick__media epick__media--player">
        {pickId ? (
          <SongPlayer pickId={pickId} embed={embed} youtubeId={youtubeId} title={title} spotifyHeight={152} autoPlay />
        ) : (
          <SpotifyEmbed embed={embed} title={title} height={152} autoPlay />
        )}
      </div>
    )
  }
  return (
    <button
      type="button"
      className="epick__media"
      onClick={() => {
        myPlaylist.stop()
        setOpen(true)
        if (pickId) sendTrack({ kind: 'play', id: pickId })
      }}
      disabled={!embed}
      aria-label={`${title} 듣기`}
    >
      {cover ? (
        // Spotify 커버 이미지는 외부 주소라 일반 img로 불러옵니다.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" loading="lazy" />
      ) : null}
      <span className="epick__play" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
    </button>
  )
}
