import Link from 'next/link'
import type { Pick } from '@/payload-types'
import { asGenres, formatDate } from '@/lib/format'
import { SpotifyPlayer } from './SpotifyPlayer'

function spotifyEmbed(url: string) {
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/)
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` : null
}

export function PickCard({ pick }: { pick: Pick }) {
  const embed = spotifyEmbed(pick.spotifyUrl)
  const artist = typeof pick.artist === 'object' && pick.artist ? pick.artist : null
  const genres = asGenres(pick.genres)
  return (
    <article className="epick">
      <SpotifyPlayer embed={embed} cover={pick.coverUrl} title={`${pick.track || ''} — ${pick.artistName}`} />
      <div className="epick__body">
        <p className="epick__meta small muted">
          <span>{formatDate(pick.pickedAt)}</span>
          {genres.slice(0, 2).map((g) => (
            <Link key={g.id} href={`/genres/${g.slug}`}>
              {g.name}
            </Link>
          ))}
        </p>
        <h3 className="epick__track">{pick.track || 'Untitled'}</h3>
        <p className="epick__artist">
          {artist ? <Link href={`/artists/${artist.slug}`}>{pick.artistName}</Link> : pick.artistName}
        </p>
        <p className="epick__comment">{pick.comment}</p>
        <a className="arrow-link epick__open" href={pick.spotifyUrl} target="_blank" rel="noreferrer">
          <span>Spotify에서 열기</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M7 17L17 7M8 7h9v9" />
          </svg>
        </a>
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
