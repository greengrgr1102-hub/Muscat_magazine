'use client'
import { useEffect, useState } from 'react'
import { reportBadVideo, setSource, useSource, youtubeFor } from '@/lib/listenSource'
import { myPlaylist, type Song } from '@/lib/myPlaylist'
import { markPlayed, pushRecent } from '@/lib/played'
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
  song,
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
  /** 있으면 여기서 듣기 시작할 때 아래 재생바 목록에 쌓고, 재생바에 「이 페이지에서 듣는 중」으로 보여요 */
  song?: Song
}) {
  const source = useSource()
  const started = () => {
    if (!song) return
    myPlaylist.noteInline(song)
    pushRecent(song)
    markPlayed(song.id)
  }
  const [vid, setVid] = useState<string | null | undefined>(youtubeId ?? undefined) // undefined = 찾는 중
  const [blocked, setBlocked] = useState(false)
  // 아래 재생바가 재생을 시작하면, 여기 있던 플레이어는 꺼서 두 곡이 겹치지 않게 해요.
  const [silenced, setSilenced] = useState(false)
  useEffect(() => {
    const off = () => setSilenced(true)
    window.addEventListener('mm-bar-play', off)
    return () => window.removeEventListener('mm-bar-play', off)
  }, [])
  useEffect(() => {
    if (autoPlay) markPlayed(pickId)
  }, [autoPlay, pickId])

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

  if (silenced)
    return (
      <div className={`song-player song-player--${size} ${className}`}>
        <button type="button" className="song-player__wait small muted song-player__resume" onClick={() => setSilenced(false)}>
          아래 재생바에서 듣는 중 · 여기서 다시 듣기
        </button>
      </div>
    )
  return (
    <div className={`song-player song-player--${size} ${className}`}>
      {useYT ? (
        <YouTubeEmbed
          key={vid}
          videoId={vid!}
          title={title}
          autoPlay={autoPlay}
          onEnded={onEnded}
          onPlaying={(on) => on && started()}
          onBlocked={() => {
            setBlocked(true)
            reportBadVideo(pickId, vid!)
          }}
        />
      ) : searching ? (
        <div className="song-player__wait small muted">YouTube에서 찾는 중…</div>
      ) : (
        <SpotifyEmbed
          embed={embed}
          title={title}
          height={spotifyHeight}
          autoPlay={autoPlay}
          onEnded={onEnded}
          onStart={started}
        />
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
