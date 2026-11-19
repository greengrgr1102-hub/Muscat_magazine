import type { Metadata } from 'next'
import Link from 'next/link'
import { SongPlayer } from '@/components/SongPlayer'
import { notFound } from 'next/navigation'
import { PickGrid, TagLinks, toRow, asTags, spotifyEmbed } from '@/components/Picks'
import { ArrowLink, SectionHeader } from '@/components/ui'
import { ViewTracker } from '@/components/Track'
import { AddButton } from '@/components/AddButton'
import { asGenres, getPick, similarPicks } from '@/lib/data'

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const pick = await getPick((await params).id)
  if (!pick) return {}
  const title = `${pick.track || 'Untitled'} — ${pick.artistName}`
  return {
    title,
    description: pick.comment || "머스캣 매거진 Editor's Picks",
    openGraph: { title },
  }
}

export default async function PickPage({ params }: { params: Params }) {
  const pick = await getPick((await params).id)
  if (!pick) notFound()
  const embed = spotifyEmbed(pick.spotifyUrl)
  const artist = typeof pick.artist === 'object' && pick.artist ? pick.artist : null
  const genres = asGenres(pick.genres)
  const tags = asTags(pick.tags)
  const similar = await similarPicks(pick)

  return (
    <>
      <ViewTracker kind="pick" id={pick.id} />
      <section className="wrap pick-detail">
        <ArrowLink href="/picks" back>
          Editor&apos;s Picks
        </ArrowLink>
        <div className="pick-detail__grid">
          <div className="pick-detail__player">
            {embed ? (
              <SongPlayer
                pickId={pick.id}
                embed={embed}
                youtubeId={pick.youtubeId}
                title={`${pick.track || ''} — ${pick.artistName}`}
                spotifyHeight={352}
                size="large"
              />
            ) : null}
          </div>
          <div className="pick-detail__info">
            <p className="label">
              Editor&apos;s Pick{pick.releaseDate ? ` · ${releaseLabel(pick.releaseDate)} 발매` : ''}
            </p>
            <h1 className="h-xl">{pick.track || 'Untitled'}</h1>
            <p className="pick-detail__artist">
              {artist ? <Link href={`/artists/${artist.slug}`}>{pick.artistName}</Link> : pick.artistName}
            </p>
            {pick.comment ? <p className="pick-detail__comment">{pick.comment}</p> : null}
            {pick.album || genres.length ? (
              <dl className="pick-detail__facts">
                {pick.album ? (
                  <div>
                    <dt className="label">Album</dt>
                    <dd>{pick.album}</dd>
                  </div>
                ) : null}
                {genres.length ? (
                  <div>
                    <dt className="label">Genre</dt>
                    <dd className="pick-detail__genres">
                      {genres.map((g) => (
                        <Link key={g.id} href={`/genres/${g.slug}`}>
                          {g.name}
                        </Link>
                      ))}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
            <TagLinks tags={tags} />
            <div className="pick-detail__actions">
              <AddButton song={toRow(pick)} />
              <Link href={`/web/${pick.id}`} className="add-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <circle cx="12" cy="12" r="2.5" />
                  <circle cx="4" cy="6" r="1.8" />
                  <circle cx="20" cy="6" r="1.8" />
                  <circle cx="5" cy="19" r="1.8" />
                  <circle cx="19" cy="18" r="1.8" />
                  <path d="M10 11 5.5 7M14 11l4.5-4M10.2 13.6 6.3 17.7M13.9 13.5l3.8 3.4" />
                </svg>
                <span>거미줄로 보기</span>
              </Link>
            </div>
            <a className="arrow-link" href={pick.spotifyUrl} target="_blank" rel="noreferrer">
              <span>Spotify에서 열기</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M7 17L17 7M8 7h9v9" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {similar.docs.length ? (
        <section className="wrap section">
          <SectionHeader
            title={similar.filled ? '이런 곡은 어때요' : '비슷한 곡 추천'}
            right={
              <Link href={`/web/${pick.id}`} className="arrow-link">
                <span>거미줄로 펼쳐 보기</span>
              </Link>
            }
          />
          <PickGrid picks={similar.docs} />
        </section>
      ) : null}
    </>
  )
}

// 2019-07-12 → 2019년 7월, 2019 → 2019년
function releaseLabel(d: string) {
  const [y, m] = d.split('-')
  return m ? `${y}년 ${Number(m)}월` : `${y}년`
}
