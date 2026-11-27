import { NextResponse } from 'next/server'
import { wordleAlbums } from '@/lib/wordle'

// 인디 워들: 문제·답으로 쓸 앨범 목록 (30분마다 새로)
export async function GET() {
  const albums = await wordleAlbums()
  return NextResponse.json(
    { albums },
    { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } },
  )
}
