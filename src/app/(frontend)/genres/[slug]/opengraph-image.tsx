import { findPickAlbums, getGenre, pickCountForGenre, relatedGenres } from '@/lib/data'
import { OG_SIZE, ogCard } from '@/lib/ogCard'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = 'Muscat Magazine 장르'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const genre = await getGenre(decodeURIComponent((await params).slug))
  if (!genre) return ogCard({ kicker: 'GENRE', title: 'Muscat Magazine' })
  const [albums, n, related] = await Promise.all([
    findPickAlbums({ genreId: genre.id, limit: 4, sort: 'most' }),
    pickCountForGenre(genre.id),
    relatedGenres(genre.id, 4),
  ])
  return ogCard({
    kicker: 'GENRE',
    title: genre.name,
    sub: `에디터가 고른 ${n}곡`,
    chips: related.map((r) => r.name),
    covers: albums.albums.map((a) => a.cover),
  })
}
