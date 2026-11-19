'use client'
import { useEffect, useState } from 'react'
import { reportBadVideo, setSource, useSource, youtubeFor } from '@/lib/listenSource'
import { SpotifyEmbed } from './SpotifyEmbed'
import { YouTubeEmbed } from './YouTubeEmbed'

// 곡 하나 재생: 기본은 YouTube(누구나 전체 듣기), 영상을 못 찾으면 Spotify로.
// 방문자가 「Spotify로 듣기」를 고르면 그걸 기억해요.
export function SongPlayer({
  pickId,
  embed,
  youtubeId,
  title,
  spotifyHeight = 80,
  size = 'inline',
  autoPlay = false,
  className = '',
  onEnded,
}: {
  pickId: number
  embed: string | null
  youtubeId?: string | null
  title: string
  spotifyHeight?: number
  size?: 'bar' | 'inline' | 'large'
  autoPlay?: boolean
  className?: string
  onEnded?: () => void
}) {
  const source = useSource()
  const [vid, setVid] = useState<string | null | undefined>(youtubeId ?? undefined) // undefined = 찾는 중
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (source !== 'youtube') return
    let alive = true
    setBlocked(false)
    if (youtubeId) {
      setVid(youtubeId)
      return
    }
    setVid(undefined)
    youtubeFor(pickId).then((id) => alive && setVid(id))
    return () => {
      alive = false
    }
  }, [pickId, youtubeId, source])

  const useYT = source === 'youtube' && vid && !blocked
  const searching = source === 'youtube' && vid === undefined
  const fellBack = source === 'youtube' && !searching && !useYT

  return (
    <div className={`song-player song-player--${size} ${className}`}>
      {useYT ? (
        <YouTubeEmbed
          key={vid}
          videoId={vid!}
          title={title}
          autoPlay={autoPlay}
          onEnded={onEnded}
          onBlocked={() => {
            setBlocked(true)
            reportBadVideo(pickId, vid!)
          }}
        />
      ) : searching ? (
        <div className="song-player__wait small muted">YouTube에서 찾는 중…</div>
      ) : (
        <SpotifyEmbed embed={embed} title={title} height={spotifyHeight} autoPlay={autoPlay} onEnded={onEnded} />
      )}
      <div className="song-player__src small">
        <button type="button" className={source === 'youtube' ? 'is-on' : ''} onClick={() => setSource('youtube')}>
          YouTube 전체 듣기
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" className={source === 'spotify' ? 'is-on' : ''} onClick={() => setSource('spotify')}>
          Spotify
        </button>
        {fellBack ? <span className="muted song-player__note">공식 YouTube 영상이 없어 Spotify로 들려드려요</span> : null}
      </div>
    </div>
  )
}
