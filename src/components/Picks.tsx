import Link from 'next/link'
import type { Pick, Tag } from '@/payload-types'
import { asGenres, formatDate } from '@/lib/format'
import { SpotifyPlayer } from './SpotifyPlayer'

export function spotifyEmbed(url: string) {
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/)
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` : null
}

export function asTags(list: Pick['tags']): Tag[] {
  return (list || []).filter((t): t is Tag => typeof t === 'object' && t !== null)
}

export function TagLinks({ tags, className = '' }: { tags: Tag[]; className?: string }) {
  if (!tags.length) return null
  return (
    <p className={`epick__tags ${className}`}>
      {tags.map((t) => (
        <Link key={t.id} href={`/picks?tag=${encodeURIComponent(t.slug || '')}`}>
          #{t.name}
        </Link>
      ))}
    </p>
  )
}

export function PickCard({ pick }: { pick: Pick }) {
  const embed = spotifyEmbed(pick.spotifyUrl)
  const artist = typeof pick.artist === 'object' && pick.artist ? pick.artist : null
  const genres = asGenres(pick.genres)
  return (
    <article className="epick">
      <SpotifyPlayer embed={embed} cover={pick.coverUrl} title={`${pick.track || ''} — ${pick.artistName}`} pickId={pick.id} />
      <div className="epick__body">
        <p className="epick__meta small muted">
          <span>{formatDate(pick.pickedAt)}</span>
          {genres.slice(0, 2).map((g) => (
            <Link key={g.id} href={`/genres/${g.slug}`}>
              {g.name}
            </Link>
          ))}
        </p>
        <h3 className="epick__track">
          <Link href={`/picks/${pick.id}`}>{pick.track || 'Untitled'}</Link>
        </h3>
        <p className="epick__artist">
          {artist ? <Link href={`/artists/${artist.slug}`}>{pick.artistName}</Link> : pick.artistName}
        </p>
        {pick.comment ? <p className="epick__comment">{pick.comment}</p> : null}
        <TagLinks tags={asTags(pick.tags)} />
        <Link className="arrow-link epick__open" href={`/picks/${pick.id}`}>
          <span>비슷한 곡 보기</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </article>
  )
}

export function PickGrid({ picks }: { picks: Pick[] }) {
  return (
    <div className="epick-grid">
      {picks.map((p) => (
        <PickCard key={p.id} pick={p} />
      ))}
    </div>
  )
}
