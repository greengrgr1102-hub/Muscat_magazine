'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { myPlaylist, useMyPlaylist } from '@/lib/myPlaylist'
import { usePlayed, useRecent } from '@/lib/played'
import { loadTaste, type Taste } from '@/lib/taste'
import { MyPlaylist } from './MyPlaylist'
import { Withdraw } from './Withdraw'

const small = (u?: string | null) => (u ? u.replace('ab67616d0000b273', 'ab67616d00004851') : null)

// My Room — 로그인한 방문자의 기록을 한곳에. 기록은 브라우저에 두고 RoomSync가 계정과 맞춰요.
export function MyHub({
  member,
}: {
  member: { name: string; email: string; image: string | null; friend: boolean }
}) {
  const { player } = useMyPlaylist()
  const played = usePlayed()
  const recent = useRecent()
  const [taste, setTaste] = useState<Taste | null>(null)
  const [mounted, setMounted] = useState(false)
  const [moreRecent, setMoreRecent] = useState(false)
  useEffect(() => {
    setMounted(true)
    setTaste(loadTaste())
  }, [])
  const now = player ? player.queue[player.index] : null

  return (
    <>
      <section className="page-title wrap">
        <p className="label">My Room</p>
        <h1 className="page-title__h">
          <span className="display-lg">My Room</span>
        </h1>
        <p className="muted page-title__desc">
          {mounted && played.size ? `지금까지 ${played.size.toLocaleString()}곡을 들었어요. ` : ''}
          기록은 내 계정에 저장돼서 다른 기기에서도 이어서 볼 수 있어요.
        </p>
      </section>
      <section className="wrap my-account">
        {member.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.image} alt="" width={36} height={36} referrerPolicy="no-referrer" />
        ) : null}
        <span className="my-account__name">
          {member.name}
          {member.friend ? <span className="my-account__badge">Friends</span> : null}
        </span>
        <span className="muted small">{member.email}</span>
        <form action="/auth/logout" method="post" className="my-account__out">
          <button type="submit" className="text-btn">
            로그아웃
          </button>
        </form>
      </section>

      {mounted && now ? (
        <section className="wrap my-sec">
          <p className="label">이어 듣기</p>
          <div className="my-resume">
            {now.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={small(now.coverUrl) || ''} alt="" width={56} height={56} />
            ) : (
              <span className="my-resume__ph" />
            )}
            <div className="my-resume__text">
              <Link href={`/picks/${now.id}`} className="plist__track">
                {now.track || 'Untitled'}
              </Link>
              <span className="plist__artist">
                {now.artistName} · {player!.label} {player!.index + 1}/{player!.queue.length}
              </span>
            </div>
            {player!.idle ? (
              <button type="button" className="btn btn--filled" onClick={() => myPlaylist.resume()}>
                <span>▶ 이어 듣기</span>
              </button>
            ) : (
              <span className="small muted">아래 재생바에서 듣는 중</span>
            )}
          </div>
        </section>
      ) : null}

      <MyPlaylist asSection />

      {mounted && recent.length ? (
        <section className="wrap my-sec">
          <div className="my-sec__row">
            <p className="label">최근 들은 곡</p>
            <button
              type="button"
              className="text-btn"
              onClick={() => myPlaylist.play(recent, 0, '최근 들은 곡')}
            >
              ▶ 다시 듣기
            </button>
          </div>
          <ol className="my-recent">
            {recent.slice(0, moreRecent ? 20 : 5).map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="my-recent__cover"
                  onClick={() => myPlaylist.play(recent, i, '최근 들은 곡')}
                  aria-label={`${s.track} 듣기`}
                >
                  {s.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={small(s.coverUrl) || ''}
                      alt=""
                      width={44}
                      height={44}
                      loading="lazy"
                    />
                  ) : null}
                </button>
                <span className="my-recent__text">
                  <Link href={`/picks/${s.id}`} className="plist__track">
                    {s.track || 'Untitled'}
                  </Link>
                  <span className="plist__artist">{s.artistName}</span>
                </span>
              </li>
            ))}
          </ol>
          {recent.length > 5 ? (
            <button
              type="button"
              className="text-btn my-recent__more"
              onClick={() => setMoreRecent((v) => !v)}
            >
              {moreRecent ? '접기' : `더보기 (${Math.min(recent.length, 20) - 5}곡)`}
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="wrap my-sec my-sec--last">
        <p className="label">내 취향</p>
        {mounted && taste?.genres?.length ? (
          <p className="my-taste">
            {taste.genres.slice(0, 5).join(' · ')}{' '}
            <Link href="/taste" className="text-btn">
              다시 찾기
            </Link>
          </p>
        ) : (
          <p className="my-taste muted">
            아직 취향을 찾지 않았어요.{' '}
            <Link href="/taste" className="text-btn">
              취향 찾기
            </Link>
          </p>
        )}
      </section>
      <section className="wrap my-sec my-withdraw">
        <Withdraw />
      </section>
    </>
  )
}
