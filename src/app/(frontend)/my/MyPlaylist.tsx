'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { myPlaylist, shareUrl, useMyPlaylist } from '@/lib/myPlaylist'

const small = (u?: string | null) => (u ? u.replace('ab67616d0000b273', 'ab67616d00004851') : null)

export function MyPlaylist() {
  const { name, songs, player } = useMyPlaylist()
  const [mounted, setMounted] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [copied, setCopied] = useState('')
  useEffect(() => setMounted(true), [])
  useEffect(() => setDraft(name), [name])

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
    } catch {
      window.prompt('아래 내용을 복사해 주세요', text)
    }
    setTimeout(() => setCopied(''), 2000)
  }
  const nowId = player ? player.queue[player.index]?.id : null

  return (
    <>
      <section className="page-title wrap">
        <p className="label">My Playlist</p>
        {editing ? (
          <form
            className="my-name"
            onSubmit={(e) => {
              e.preventDefault()
              myPlaylist.rename(draft)
              setEditing(false)
            }}
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={40} aria-label="플리 이름" autoFocus />
            <button className="btn btn--filled" type="submit">
              <span>저장</span>
            </button>
          </form>
        ) : (
          <h1 className="page-title__h">
            <span className="display-lg">{mounted ? name : '내 플리'}</span>
            <sup className="label">{mounted ? songs.length : 0}</sup>
          </h1>
        )}
        <p className="muted page-title__desc">
          Editor&apos;s Picks에서 「+ 담기」로 고른 곡들이에요. 이 브라우저에 저장돼요.
        </p>
      </section>

      <section className="wrap section">
        {mounted && songs.length ? (
          <>
            <div className="my-actions">
              <button className="btn btn--filled" onClick={() => myPlaylist.play(songs, 0, name)}>
                <span>▶ 처음부터 듣기</span>
              </button>
              <button className="btn btn--outline" onClick={() => myPlaylist.play([...songs].sort(() => Math.random() - 0.5), 0, name)}>
                <span>섞어서 듣기</span>
              </button>
              <button className="btn btn--outline" onClick={() => copy(shareUrl(name, songs), 'link')}>
                <span>{copied === 'link' ? '링크를 복사했어요' : '공유 링크 복사'}</span>
              </button>
              <button
                className="btn btn--outline"
                onClick={() => copy(songs.map((s, i) => `${i + 1}. ${s.artistName} - ${s.track || ''}`).join('\n'), 'text')}
              >
                <span>{copied === 'text' ? '목록을 복사했어요' : '곡 목록 복사'}</span>
              </button>
              <button className="text-btn" onClick={() => setEditing(true)}>
                이름 바꾸기
              </button>
            </div>

            <ol className="my-list">
              {songs.map((s, i) => (
                <li key={s.id} className={nowId === s.id ? 'is-now' : ''}>
                  <span className="my-list__no">{i + 1}</span>
                  <button className="my-list__cover" onClick={() => myPlaylist.play(songs, i, name)} aria-label={`${s.track} 듣기`}>
                    {s.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={small(s.coverUrl) || ''} alt="" width={44} height={44} />
                    ) : null}
                    <span aria-hidden="true">▶</span>
                  </button>
                  <span className="my-list__text">
                    <Link href={`/picks/${s.id}`} className="plist__track">
                      {s.track || 'Untitled'}
                    </Link>
                    <span className="plist__artist">{s.artistName}</span>
                  </span>
                  <span className="my-list__tools">
                    <button onClick={() => myPlaylist.move(s.id, -1)} disabled={i === 0} aria-label="위로">
                      ↑
                    </button>
                    <button onClick={() => myPlaylist.move(s.id, 1)} disabled={i === songs.length - 1} aria-label="아래로">
                      ↓
                    </button>
                    <button onClick={() => myPlaylist.remove(s.id)} aria-label={`${s.track} 빼기`}>
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ol>
            <p className="small muted my-foot">
              Spotify 계정에 바로 저장하는 건 Spotify 정책상 안 돼요. 「곡 목록 복사」로 옮기거나, 곡 제목을 눌러 Spotify에서 열 수
              있어요.{' '}
              <button
                className="text-btn"
                onClick={() => {
                  if (window.confirm('내 플리를 모두 비울까요?')) myPlaylist.clear()
                }}
              >
                모두 비우기
              </button>
            </p>
          </>
        ) : mounted ? (
          <div className="my-empty">
            <p>아직 담은 곡이 없어요.</p>
            <p className="muted">Editor&apos;s Picks에서 마음에 드는 곡 옆의 「+」를 누르면 여기에 모여요.</p>
            <Link href="/picks" className="btn btn--filled">
              <span>Editor&apos;s Picks 둘러보기</span>
            </Link>
          </div>
        ) : null}
      </section>
    </>
  )
}
