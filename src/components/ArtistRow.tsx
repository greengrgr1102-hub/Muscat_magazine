import Link from 'next/link'
import type { Artist } from '@/payload-types'
import { asGenres } from '@/lib/format'
import { Icon, Img } from './ui'

export function ArtistRow({ artist, count }: { artist: Artist; count?: number }) {
  const genres = asGenres(artist.genres)
    .map((g) => g.name)
    .join(' · ')
  return (
    <li>
      <Link href={`/artists/${artist.slug}`} className="artist-row">
        <Img media={artist.photo} ratio="1 / 1" className="artist-row__img" label="1:1" sizes="120px" />
        <span className="artist-row__info">
          <span className="h-lg">{artist.name}</span>
          {genres ? <span className="muted">{genres}</span> : null}
        </span>
        {typeof count === 'number' ? <span className="label hide-mobile">아티클 {count}</span> : null}
        <Icon name="right" size={24} />
      </Link>
    </li>
  )
}
