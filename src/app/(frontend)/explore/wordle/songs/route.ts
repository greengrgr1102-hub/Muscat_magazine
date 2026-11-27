import { NextResponse } from 'next/server'
import { findAlbumPicks } from '@/lib/data'
import type { Pick } from '@/payload-types'

function spotifyEmbed(url?: string | null) {
  const m = (url || '').match(
    /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/,
  )
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` : null
}

// 인디 워들: 정답 앨범을 바로 들을 수 있게 그 앨범의 곡들 (?k=앨범 키)
export async function GET(req: Request) {
  const k = new URL(req.url).searchParams.get('k') || ''
  const docs = (await findAlbumPicks(k)) as Pick[] | null
  const songs = (docs || []).map((p) => ({
    id: p.id,
    track: p.track,
    artistName: p.artistName,
    coverUrl: p.coverUrl,
    embed: spotifyEmbed(p.spotifyUrl),
    youtubeId: p.youtubeId || null,
  }))
  return NextResponse.json({ songs }, { headers: { 'Cache-Control': 'public, s-maxage=600' } })
}
