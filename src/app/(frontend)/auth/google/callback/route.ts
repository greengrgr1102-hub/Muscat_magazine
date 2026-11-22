import { NextResponse, type NextRequest } from 'next/server'
import { getClient } from '@/lib/data'
import { FLAG_COOKIE, SESSION_COOKIE, googleProfile, makeSession, safeNext } from '@/lib/member'

// 구글에서 돌아오는 곳 — 회원을 찾거나 새로 만들고 로그인 쿠키를 심어요
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const saved = req.cookies.get('mm_oauth_state')?.value
  const next = safeNext(req.cookies.get('mm_oauth_next')?.value)
  const fail = (why: string) => NextResponse.redirect(new URL(`/my?login=${why}`, req.url))
  if (!code || !state || !saved || state !== saved) return fail('state')
  const prof = await googleProfile(code)
  if (!prof) return fail('google')

  const payload = await getClient()
  const now = new Date().toISOString()
  const found = await payload.find({
    collection: 'members',
    where: { or: [{ googleSub: { equals: prof.sub } }, { email: { equals: prof.email } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const data = {
    email: prof.email,
    name: prof.name,
    image: prof.picture,
    googleSub: prof.sub,
    lastLoginAt: now,
  }
  const member = found.docs[0]
    ? await payload.update({
        collection: 'members',
        id: found.docs[0].id,
        data,
        overrideAccess: true,
      })
    : await payload.create({
        collection: 'members',
        data: { ...data, friend: false },
        overrideAccess: true,
      })

  const s = makeSession(member.id)
  const res = NextResponse.redirect(new URL(next, req.url))
  const secure = process.env.NODE_ENV === 'production'
  res.cookies.set(SESSION_COOKIE, s.value, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: s.maxAge,
  })
  res.cookies.set(FLAG_COOKIE, '1', {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: s.maxAge,
  })
  res.cookies.delete('mm_oauth_state')
  res.cookies.delete('mm_oauth_next')
  return res
}
