import { NextResponse } from 'next/server'
import { asGenres, cleanFilter, getGenre, randomPick } from '@/lib/data'

function spotifyEmbed(url: string) {
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/)
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` : null
}

// 아무거나 틀어줘: ?g=장르&c=나라&era=시대&x=최근에 들은 곡 번호(쉼표)
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams
  const f = cleanFilter({ c: q.get('c') || undefined, era: q.get('era') || undefined })
  const g = q.get('g') ? await getGenre(q.get('g')!) : null
  const exclude = (q.get('x') || '').split(',').map(Number).filter(Boolean)
  const r = await randomPick({ genreId: g?.id, f, exclude })
  if (!r) return NextResponse.json({ song: null, total: 0 }, { headers: { 'Cache-Control': 'no-store' } })
  const p = r.pick
  return NextResponse.json(
    {
      total: r.total,
      fresh: r.fresh,
      song: {
        id: p.id,
        track: p.track,
        artistName: p.artistName,
        album: p.album,
        coverUrl: p.coverUrl,
        embed: spotifyEmbed(p.spotifyUrl),
        youtubeId: p.youtubeId || null,
        releaseDate: p.releaseDate || null,
        genres: asGenres(p.genres).map((x) => ({ name: x.name, slug: x.slug })),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
