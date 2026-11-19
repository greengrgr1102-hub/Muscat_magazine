import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AddAllButton, PlayAllButton } from '@/components/AddButton'
import { PickList } from '@/components/PickList'
import { toRow } from '@/components/Picks'
import { PlaylistCover, playlistSongs } from '@/components/Playlists'
import { ArrowLink } from '@/components/ui'
import { getPlaylist } from '@/lib/data'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const pl = await getPlaylist(decodeURIComponent((await params).slug))
  return pl ? { title: pl.title, description: pl.description || `${playlistSongs(pl).length}곡 · 머스캣 매거진 에디터 플리` } : {}
}

export default async function PlaylistPage({ params }: { params: Promise<{ slug: string }> }) {
  const pl = await getPlaylist(decodeURIComponent((await params).slug))
  if (!pl) notFound()
  const rows = playlistSongs(pl).map(toRow)
  return (
    <>
      <section className="wrap pl-head">
        <ArrowLink href="/playlists" back>
          Playlists
        </ArrowLink>
        <div className="pl-head__grid">
          <PlaylistCover pl={pl} size="lg" />
          <div className="pl-head__info">
            <p className="label">Editor&apos;s Playlist · {rows.length}곡</p>
            <h1 className="h-xl">{pl.title}</h1>
            {pl.description ? <p className="pl-head__desc">{pl.description}</p> : null}
            <div className="my-actions">
              <PlayAllButton songs={rows} label={pl.title} />
              <AddAllButton songs={rows} />
            </div>
          </div>
        </div>
      </section>
      <section className="wrap section">
        <PickList rows={rows} groupByMonth={false} />
      </section>
    </>
  )
}
