import { findPickAlbums, getGenre, pickCountForGenre, relatedGenres } from '@/lib/data'
import { OG_SIZE, shareCard } from '@/lib/og'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = 'Muscat Magazine 장르'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const genre = await getGenre(decodeURIComponent((await params).slug))
  if (!genre) return shareCard({ label: 'Genre', title: '머스캣 매거진' })
  const [albums, n, related] = await Promise.all([
    findPickAlbums({ genreId: genre.id, limit: 1, sort: 'most' }),
    pickCountForGenre(genre.id),
    relatedGenres(genre.id, 3),
  ])
  const cover = albums.albums[0]?.cover
  return shareCard({
    label: 'Genre',
    title: genre.name,
    sub: `에디터가 고른 ${n}곡${related.length ? ` — 같이 듣는 장르 ${related.map((r) => r.name).join(', ')}` : ''}`,
    photo: cover ? { url: cover.replace('ab67616d00004851', 'ab67616d0000b273') } : null,
  })
}
