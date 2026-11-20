import { NextResponse } from 'next/server'
import { getClient } from '@/lib/data'
import { bump, bumpBy } from '@/lib/stats'

// 브라우저가 페이지를 열 때 보내는 신호를 받아 숫자만 셉니다. (쿠키·IP 저장 없음)
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|headless|lighthouse|vercel|monitor/i

export async function POST(req: Request) {
  const ua = req.headers.get('user-agent') || ''
  if (!ua || BOT.test(ua)) return new NextResponse(null, { status: 204 })
  try {
    const payload = await getClient()
    // 관리자로 로그인한 브라우저(에디터 본인)는 세지 않고, 브라우저에 「나는 빼 줘」 표시를 남기라고 알려줘요.
    const { user } = await payload.auth({ headers: req.headers }).catch(() => ({ user: null }))
    if (user) return NextResponse.json({ me: true })
    const body = (await req.json()) as { kind?: string; id?: number; first?: boolean; on?: boolean }
    // 좋아요: 누르면 +1, 취소하면 -1 (숫자는 관리자 화면에만)
    if (body.kind === 'like' && Number.isInteger(body.id)) {
      await bumpBy(payload, `like:${body.id}`, body.on ? 1 : -1)
      return new NextResponse(null, { status: 204 })
    }
    const keys: string[] = []
    if (body.kind === 'page') {
      keys.push('site')
      if (body.first) keys.push('visitors')
    } else if ((body.kind === 'article' || body.kind === 'pick' || body.kind === 'play') && Number.isInteger(body.id)) {
      keys.push(`${body.kind}:${body.id}`)
    }
    if (keys.length) await bump(payload, keys)
  } catch {
    // 잘못된 신호는 조용히 무시해요.
  }
  return new NextResponse(null, { status: 204 })
}
