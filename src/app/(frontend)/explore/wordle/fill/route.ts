import { NextResponse } from 'next/server'
import { getClient } from '@/lib/data'
import { fillArtistProfile } from '@/lib/fillArtistProfile'

// 관리자만: 아티스트 구성(솔로/밴드)·성별을 MusicBrainz로 채우기 (한 번에 50초씩, 여러 번 불러요)
export async function POST(req: Request) {
  const payload = await getClient()
  const { user } = await payload.auth({ headers: req.headers }).catch(() => ({ user: null }))
  if (!user || (user as { collection?: string }).collection !== 'users')
    return NextResponse.json({ error: 'admin only' }, { status: 401 })
  const r = await fillArtistProfile(payload, Date.now() + 52_000)
  return NextResponse.json(r, { headers: { 'Cache-Control': 'no-store' } })
}

export const maxDuration = 60
