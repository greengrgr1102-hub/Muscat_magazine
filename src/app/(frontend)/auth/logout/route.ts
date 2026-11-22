import { NextResponse, type NextRequest } from 'next/server'
import { FLAG_COOKIE, SESSION_COOKIE } from '@/lib/member'

// 로그아웃 — 쿠키만 지워요 (이 기기에 남은 기록은 그대로)
export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/my', req.url), 303)
  res.cookies.delete(SESSION_COOKIE)
  res.cookies.delete(FLAG_COOKIE)
  return res
}
