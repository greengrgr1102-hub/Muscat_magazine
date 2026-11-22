import { NextResponse } from 'next/server'
import { getClient } from '@/lib/data'
import { fillYoutube } from '@/lib/youtube'

// 하루 한 번 Vercel 예약 실행이 불러요: 아직 YouTube 영상이 없는 곡을 하루 한도 안에서 찾아 연결해요.
export async function GET() {
  const payload = await getClient()
  const r = await fillYoutube(payload, 50_000)
  return NextResponse.json(r, { headers: { 'Cache-Control': 'no-store' } })
}

export const maxDuration = 60
