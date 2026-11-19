import { NextResponse } from 'next/server'
import { asGenres, getPick, similarAlbums, similarPicks, type WebAlbum } from '@/lib/data'
import type { Pick } from '@/payload-types'

function spotifyEmbed(url: string) {
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/)
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` : null
}

// 거미줄 칸 하나 — 곡이든 앨범이든 같은 모양으로 돌려줘요.
const songNode = (p: Pick) => ({
  id: String(p.id),
  title: p.track || '곡',
  sub: p.artistName,
  coverUrl: p.coverUrl,
  genres: asGenres(p.genres).map((g) => g.name),
  href: `/picks/${p.id}`,
  songs: [{ id: p.id, track: p.track, artistName: p.artistName, coverUrl: p.coverUrl, embed: spotifyEmbed(p.spotifyUrl), youtubeId: p.youtubeId || null }],
})

const albumNode = (a: WebAlbum) => ({
  id: a.key,
  title: a.album || '앨범',
  sub: a.artist,
  coverUrl: a.cover,
  genres: a.genres,
  href: `/picks/albums/${a.key}`,
  songs: a.songs.map((s) => ({ id: s.id, track: s.track, artistName: s.artistName, coverUrl: s.coverUrl, embed: spotifyEmbed(s.spotifyUrl), youtubeId: s.youtubeId })),
})

// ?id=곡번호 → 곡 하나와 비슷한 곡 8개 / ?album=앨범키 → 앨범 하나와 비슷한 앨범 8개
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams
  const album = q.get('album')
  if (album) {
    const res = await similarAlbums(album, 8)
    if (!res) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ center: albumNode(res.center), neighbors: res.neighbors.map(albumNode), random: res.random })
  }
  const pick = await getPick(q.get('id') || '')
  if (!pick) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const sim = await similarPicks(pick, 8)
  return NextResponse.json({ center: songNode(pick), neighbors: sim.docs.map((p) => songNode(p as Pick)), random: sim.filled })
}
