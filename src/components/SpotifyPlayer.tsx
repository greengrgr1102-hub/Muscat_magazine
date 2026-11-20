'use client'
import { useEffect, useState } from 'react'
import { myPlaylist, useMyPlaylist, type Song } from '@/lib/myPlaylist'
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
  song,
}: {
  embed: string | null
  cover?: string | null
  title: string
  pickId?: number
  youtubeId?: string | null
  /** 있으면 카드 안이 아니라 아래 재생바에서 틀어요 (좁은 카드에서 영상이 잘리지 않게) */
  song?: Song
}) {
  const [open, setOpen] = useState(false)
  const { player } = useMyPlaylist()
  const playingHere = Boolean(song && player && !player.idle && player.queue[player.index]?.id === song.id)
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
        if (song) {
          if (!playingHere) myPlaylist.play([song], 0, "Editor's Picks")
          return
        }
        myPlaylist.stop()
        setOpen(true)
        if (pickId) sendTrack({ kind: 'play', id: pickId })
      }}
      disabled={!embed}
      aria-label={playingHere ? `${title} 재생 중` : `${title} 듣기`}
    >
      {cover ? (
        // Spotify 커버 이미지는 외부 주소라 일반 img로 불러옵니다.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" loading="lazy" />
      ) : null}
      <span className={`epick__play${playingHere ? ' is-on' : ''}`} aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d={playingHere ? 'M4 10h3v10H4zM10.5 5h3v15h-3zM17 12h3v8h-3z' : 'M8 5.5v13l11-6.5z'} />
        </svg>
      </span>
    </button>
  )
}
