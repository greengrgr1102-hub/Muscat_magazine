import { NextResponse, type NextRequest } from 'next/server'
import { getClient } from '@/lib/data'
import {
  SESSION_COOKIE,
  clearSessionCookies,
  parseSession,
  setSessionCookies,
  shouldRenew,
} from '@/lib/member'

// 로그인한 회원의 My Room 기록 읽기·저장·탈퇴
// GET → { member, room, updatedAt } / PUT { room } → 저장 / DELETE → 회원 탈퇴(기록 모두 지움)
const MAX_BYTES = 400_000

async function who(req: NextRequest) {
  const s = parseSession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!s) return null
  const id = s.id
  const payload = await getClient()
  const m = await payload
    .findByID({ collection: 'members', id, depth: 0, overrideAccess: true })
    .catch(() => null)
  return m ? { payload, m, s } : null
}

// 쓰는 동안은 자동 로그아웃 시간을 다시 늘려요
function renew(res: NextResponse, w: NonNullable<Awaited<ReturnType<typeof who>>>) {
  if (shouldRenew(w.s)) setSessionCookies(res, w.m.id, w.s.keep)
  return res
}

export async function GET(req: NextRequest) {
  const w = await who(req)
  if (!w) {
    // 시간이 지나 자동 로그아웃된 경우: 남은 표시 쿠키까지 지워요
    const res = NextResponse.json({ member: null }, { headers: { 'Cache-Control': 'no-store' } })
    if (req.cookies.get(SESSION_COOKIE) || req.cookies.get('mm_in')) clearSessionCookies(res)
    return res
  }
  const { m } = w
  return renew(
    NextResponse.json(
      {
        member: {
          name: m.name || m.email.split('@')[0],
          email: m.email,
          image: m.image || null,
          friend: Boolean(m.friend),
        },
        room: m.room || null,
        updatedAt: m.updatedAt,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    ),
    w,
  )
}

export async function PUT(req: NextRequest) {
  const w = await who(req)
  if (!w) return NextResponse.json({ ok: false }, { status: 401 })
  const text = await req.text()
  if (text.length > MAX_BYTES)
    return NextResponse.json({ ok: false, reason: 'too-big' }, { status: 413 })
  let body: { room?: unknown }
  try {
    body = JSON.parse(text)
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!body.room || typeof body.room !== 'object')
    return NextResponse.json({ ok: false }, { status: 400 })
  const doc = await w.payload.update({
    collection: 'members',
    id: w.m.id,
    data: { room: body.room as Record<string, unknown> },
    overrideAccess: true,
  })
  return renew(NextResponse.json({ ok: true, updatedAt: doc.updatedAt }), w)
}

export async function DELETE(req: NextRequest) {
  const w = await who(req)
  if (!w) return NextResponse.json({ ok: false }, { status: 401 })
  await w.payload.delete({ collection: 'members', id: w.m.id, overrideAccess: true })
  const res = NextResponse.json({ ok: true })
  clearSessionCookies(res)
  return res
}
