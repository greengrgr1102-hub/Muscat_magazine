import { NextResponse, type NextRequest } from 'next/server'
import { getClient } from '@/lib/data'
import { markYoutubeBad, resolveYoutube } from '@/lib/youtube'

// 곡(pick) 하나의 YouTube 영상 ID를 알려줘요. 처음이면 찾아서 저장해요.
// ?pick=123            → { id: "영상ID" | null }
// ?pick=123&bad=영상ID → 재생이 막힌 영상이라고 알려 주기
export async function GET(req: NextRequest) {
  const pick = Number(req.nextUrl.searchParams.get('pick'))
  if (!Number.isInteger(pick) || pick <= 0) return NextResponse.json({ id: null }, { status: 400 })
  const payload = await getClient()
  const bad = req.nextUrl.searchParams.get('bad')
  if (bad && /^[A-Za-z0-9_-]{11}$/.test(bad)) {
    await markYoutubeBad(payload, pick, bad)
    return NextResponse.json({ ok: true })
  }
  const r = await resolveYoutube(payload, pick, { debug: req.nextUrl.searchParams.get('debug') === '1' })
  return NextResponse.json(r, { headers: { 'Cache-Control': r.id ? 'public, max-age=3600' : 'no-store' } })
}
