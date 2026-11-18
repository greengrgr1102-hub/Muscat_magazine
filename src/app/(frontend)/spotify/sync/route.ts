import { NextResponse } from 'next/server'
import { getClient } from '@/lib/data'
import { renameToKorean, syncPlaylist } from '@/lib/spotify'

// 하루 한 번 Vercel 예약 실행이 부르는 주소. 10분 안에 이미 동기화했으면 건너뛰어요.
export async function GET() {
  const payload = await getClient()
  const r = await syncPlaylist(payload, { minIntervalMin: 10 })
  // 곡 정보 새로 고치기가 중간에 멈춰 있으면 이어서 해요.
  const cfg = await payload.findGlobal({ slug: 'spotify-sync', overrideAccess: true })
  const info = typeof cfg.renameOffset === 'number' ? await renameToKorean(payload) : null
  return NextResponse.json({ sync: r, info })
}

// Spotify 가져오기가 도는 화면: 넉넉하게 60초까지 기다려요.
export const maxDuration = 60
