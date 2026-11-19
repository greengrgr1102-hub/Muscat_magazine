import Link from 'next/link'
import type { Media, Pick, Playlist } from '@/payload-types'

export const playlistSongs = (pl: Playlist) => (pl.songs || []).filter((s): s is Pick => typeof s === 'object' && s !== null)

// 커버: 직접 올린 사진이 있으면 그것, 없으면 앞쪽 곡 커버 4장 모자이크
export function PlaylistCover({ pl, size = 'md' }: { pl: Playlist; size?: 'md' | 'lg' }) {
  const cover = typeof pl.cover === 'object' && pl.cover ? (pl.cover as Media) : null
  const covers = playlistSongs(pl)
    .map((s) => s.coverUrl)
    .filter((u): u is string => Boolean(u))
    .filter((u, i, a) => a.indexOf(u) === i)
    .slice(0, 4)
  return (
    <div className={`pl-cover pl-cover--${size}`}>
      {cover?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover.sizes?.card?.url || cover.url} alt="" />
      ) : covers.length >= 4 ? (
        <div className="pl-cover__grid">
          {covers.map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={u.replace('ab67616d0000b273', 'ab67616d00001e02')} alt="" />
          ))}
        </div>
      ) : covers[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={covers[0]} alt="" />
      ) : null}
    </div>
  )
}

export function PlaylistCards({ lists }: { lists: Playlist[] }) {
  return (
    <div className="pl-cards">
      {lists.map((pl) => (
        <Link key={pl.id} href={`/playlists/${pl.slug}`} className="pl-card">
          <PlaylistCover pl={pl} />
          <span className="pl-card__title">{pl.title}</span>
          <span className="small muted">{playlistSongs(pl).length}곡</span>
          {pl.description ? <span className="pl-card__desc">{pl.description}</span> : null}
        </Link>
      ))}
    </div>
  )
}
