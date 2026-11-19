import { NextResponse, type NextRequest } from 'next/server'
import { getClient } from '@/lib/data'
import { fillAlbumNames, renameToKorean, syncPlaylist } from '@/lib/spotify'

// 하루 두 번 Vercel 예약 실행이 부르는 주소. 10분 안에 이미 동기화했으면 건너뛰어요.
// ?only=albums 로 부르면 앨범 이름 채우기만 해요.
export async function GET(req: NextRequest) {
  const started = Date.now()
  const payload = await getClient()
  if (req.nextUrl.searchParams.get('only') === 'albums') {
    return NextResponse.json({ albums: await fillAlbumNames(payload, 50_000) })
  }
  const r = await syncPlaylist(payload, { minIntervalMin: 10 })
  // 곡 정보 새로 고치기가 중간에 멈춰 있으면 이어서 해요.
  const cfg = await payload.findGlobal({ slug: 'spotify-sync', overrideAccess: true })
  const info = typeof cfg.renameOffset === 'number' ? await renameToKorean(payload) : null
  // 남은 시간으로 앨범 이름 채우기
  const left = 55_000 - (Date.now() - started)
  const albums = left > 8_000 ? await fillAlbumNames(payload, left) : null
  return NextResponse.json({ sync: r, info, albums })
}

// Spotify 가져오기가 도는 화면: 넉넉하게 60초까지 기다려요.
export const maxDuration = 60
