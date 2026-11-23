import type { Metadata } from 'next'
import Link from 'next/link'
import { IDLE_HOURS, KEEP_DAYS, currentMember, googleConfigured } from '@/lib/member'
import { MyHub } from './MyHub'

export const metadata: Metadata = { title: 'My Room', robots: { index: false } }
export const dynamic = 'force-dynamic'

const ERR: Record<string, string> = {
  off: '로그인 준비 중이에요. 조금만 기다려 주세요.',
  state: '로그인이 중간에 끊겼어요. 다시 한 번 눌러 주세요.',
  google: '구글에서 정보를 받지 못했어요. 다시 시도해 주세요.',
}

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string }>
}) {
  const sp = await searchParams
  const member = await currentMember()
  if (member) return <MyHub member={member} />
  const ready = googleConfigured()
  return (
    <>
      <section className="page-title wrap">
        <p className="label">My Room</p>
        <h1 className="page-title__h">
          <span className="display-lg">My Room</span>
        </h1>
        <p className="muted page-title__desc">
          좋아요한 곡, 들은 곡, 취향 찾기 결과를 내 계정에 모아 두는 곳이에요. 로그인하면 폰이든
          컴퓨터든 어디서나 이어서 볼 수 있어요.
        </p>
      </section>
      <section className="wrap my-login">
        <div className="login-card">
          <h2 className="login-card__title">로그인</h2>
          <p className="login-card__sub">기록을 계정에 모아 두고 어느 기기에서든 이어 보세요.</p>
          {sp.login && ERR[sp.login] ? <p className="form-error">{ERR[sp.login]}</p> : null}
          {ready ? (
            <form action="/auth/google" method="get" className="login-card__form">
              <input type="hidden" name="next" value="/my" />
              <button type="submit" className="login-card__google">
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    fill="#FFC107"
                    d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z"
                  />
                  <path
                    fill="#FF3D00"
                    d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z"
                  />
                </svg>
                <span>Google로 계속하기</span>
              </button>
              <label className="login-keep">
                <span className="login-keep__text">
                  <span>로그인 상태 유지</span>
                  <small>
                    켜면 {KEEP_DAYS}일 동안 로그인돼 있어요. 끄면 브라우저를 닫거나 {IDLE_HOURS}시간
                    동안 쓰지 않을 때 로그아웃돼요.
                  </small>
                </span>
                <input
                  type="checkbox"
                  name="keep"
                  value="1"
                  className="login-keep__switch"
                  role="switch"
                />
              </label>
            </form>
          ) : (
            <p className="muted">로그인은 곧 열려요.</p>
          )}
          <ul className="login-card__notes">
            <li>로그인 없이도 듣기·검색·탐험·글은 전부 그대로 쓸 수 있어요.</li>
            <li>로그인 전에 담아 둔 좋아요한 곡은 로그인하면 계정으로 옮겨져요.</li>
            <li>
              이름·이메일·프로필 사진만 받아요. <Link href="/privacy">개인정보 처리방침</Link>
            </li>
          </ul>
        </div>
      </section>
    </>
  )
}
