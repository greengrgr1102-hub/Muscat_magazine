import { NextResponse } from 'next/server'
import { getClient } from '@/lib/data'
import { syncPlaylist } from '@/lib/spotify'

// 하루 한 번 Vercel 예약 실행이 부르는 주소. 10분 안에 이미 동기화했으면 건너뛰어요.
export async function GET() {
  const payload = await getClient()
  const r = await syncPlaylist(payload, { minIntervalMin: 10 })
  return NextResponse.json(r)
}

// Spotify 가져오기가 도는 화면: 넉넉하게 60초까지 기다려요.
export const maxDuration = 60
