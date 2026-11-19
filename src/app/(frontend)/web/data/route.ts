import { NextResponse } from 'next/server'
import { asGenres, getPick, similarPicks } from '@/lib/data'
import type { Pick } from '@/payload-types'

function spotifyEmbed(url: string) {
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/)
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` : null
}

// 거미줄 탐색용: 곡 하나와, 그 곡과 비슷한 곡 8개를 돌려줘요.
const node = (p: Pick) => ({
  id: p.id,
  track: p.track,
  artistName: p.artistName,
  coverUrl: p.coverUrl,
  embed: spotifyEmbed(p.spotifyUrl),
  genres: asGenres(p.genres).map((g) => g.name),
})

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') || ''
  const pick = await getPick(id)
  if (!pick) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const sim = await similarPicks(pick, 8)
  return NextResponse.json({ center: node(pick), neighbors: sim.docs.map((p) => node(p as Pick)), random: sim.filled })
}
