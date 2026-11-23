import { randomBytes } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { googleAuthUrl, googleConfigured, safeNext } from '@/lib/member'

// 「구글로 로그인」 → 구글 로그인 화면으로 보내요
export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get('next'))
  if (!googleConfigured()) return NextResponse.redirect(new URL(`/my?login=off`, req.url))
  const state = randomBytes(16).toString('base64url')
  const res = NextResponse.redirect(googleAuthUrl(state))
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 600,
  }
  res.cookies.set('mm_oauth_state', state, opts)
  res.cookies.set('mm_oauth_next', next, opts)
  // 「로그인 상태 유지」를 골랐는지
  res.cookies.set('mm_oauth_keep', req.nextUrl.searchParams.get('keep') === '1' ? '1' : '0', opts)
  return res
}
