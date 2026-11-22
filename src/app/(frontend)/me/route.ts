import { NextResponse, type NextRequest } from 'next/server'
import { getClient } from '@/lib/data'
import { FLAG_COOKIE, SESSION_COOKIE, readSession } from '@/lib/member'

// 로그인한 회원의 My Room 기록 읽기·저장·탈퇴
// GET → { member, room, updatedAt } / PUT { room } → 저장 / DELETE → 회원 탈퇴(기록 모두 지움)
const MAX_BYTES = 400_000

async function who(req: NextRequest) {
  const id = readSession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!id) return null
  const payload = await getClient()
  const m = await payload
    .findByID({ collection: 'members', id, depth: 0, overrideAccess: true })
    .catch(() => null)
  return m ? { payload, m } : null
}

export async function GET(req: NextRequest) {
  const w = await who(req)
  if (!w) return NextResponse.json({ member: null }, { headers: { 'Cache-Control': 'no-store' } })
  const { m } = w
  return NextResponse.json(
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
  return NextResponse.json({ ok: true, updatedAt: doc.updatedAt })
}

export async function DELETE(req: NextRequest) {
  const w = await who(req)
  if (!w) return NextResponse.json({ ok: false }, { status: 401 })
  await w.payload.delete({ collection: 'members', id: w.m.id, overrideAccess: true })
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE)
  res.cookies.delete(FLAG_COOKIE)
  return res
}
