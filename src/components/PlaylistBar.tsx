'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { myPlaylist, useMyPlaylist } from '@/lib/myPlaylist'
import { SpotifyEmbed } from './SpotifyEmbed'

const small = (u?: string | null) => (u ? u.replace('ab67616d0000b273', 'ab67616d00004851') : null)

// 화면 아래에 떠 있는 "내 플리" 바 + 이어 듣기 플레이어
export function PlaylistBar() {
  const { name, songs, player } = useMyPlaylist()
  const [toast, setToast] = useState('')
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // 담을 때 잠깐 뜨는 알림
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const on = (e: Event) => {
      setToast((e as CustomEvent<string>).detail)
      clearTimeout(t)
      t = setTimeout(() => setToast(''), 2200)
    }
    window.addEventListener('mm-toast', on)
    return () => window.removeEventListener('mm-toast', on)
  }, [])

  const visible = mounted && (songs.length > 0 || player)
  useEffect(() => {
    document.body.classList.toggle('has-plbar', Boolean(visible))
    document.body.classList.toggle('has-plbar--player', Boolean(mounted && player))
  }, [visible, player, mounted])

  if (!mounted) return null
  const now = player ? player.queue[player.index] : null

  return (
    <>
      {toast ? (
        <div className="pl-toast" role="status">
          {toast}
        </div>
      ) : null}
      {visible ? (
        <div className="plbar" role="region" aria-label="내 플리">
          {now ? (
            <div className="plbar__player">
              <SpotifyEmbed
                key={`${now.id}-${player!.index}`}
                embed={now.embed}
                title={`${now.track || ''} — ${now.artistName}`}
                height={80}
                autoPlay
                onEnded={() => myPlaylist.step(1)}
              />
              <div className="plbar__ctrl">
                <span className="small muted plbar__label">
                  {player!.label} · {player!.index + 1}/{player!.queue.length}
                </span>
                <button type="button" aria-label="이전 곡" disabled={player!.index === 0} onClick={() => myPlaylist.step(-1)}>
                  ⏮
                </button>
                <button type="button" aria-label="다음 곡" onClick={() => myPlaylist.step(1)}>
                  ⏭
                </button>
                <button type="button" aria-label="플레이어 닫기" onClick={() => myPlaylist.stop()}>
                  ✕
                </button>
              </div>
            </div>
          ) : null}
          <div className="plbar__row">
            <Link href="/my" className="plbar__me">
              <span className="plbar__covers" aria-hidden="true">
                {songs.slice(-3).map((s) =>
                  s.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={s.id} src={small(s.coverUrl) || ''} alt="" width={28} height={28} />
                  ) : (
                    <span key={s.id} />
                  ),
                )}
              </span>
              <span>
                <strong>{name}</strong> <span className="muted">{songs.length}곡</span>
              </span>
            </Link>
            {songs.length ? (
              <button type="button" className="plbar__play" onClick={() => myPlaylist.play(songs, 0, name)}>
                ▶ 이어 듣기
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
