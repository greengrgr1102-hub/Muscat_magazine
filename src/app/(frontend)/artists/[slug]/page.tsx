import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RichText } from '@/components/RichText'
import { ArrowLink, CardGrid, Chip, Img, Lines, ListenLinks, SectionHeader, articleHref, Button } from '@/components/ui'
import { PickGrid } from '@/components/Picks'
import { TYPE_LABEL, TYPE_ORDER, asGenres, asMedia, findArticles, findPicks, formatDate, getArtist } from '@/lib/data'

type Params = Promise<{ slug: string }>
type SP = Promise<{ type?: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const a = await getArtist(decodeURIComponent(slug))
  if (!a) return {}
  const photo = asMedia(a.photo)
  return {
    title: a.name,
    description: a.noteHeadline || undefined,
    openGraph: { title: a.name, images: photo?.url ? [photo.url] : undefined },
  }
}

export default async function ArtistPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { slug } = await params
  const sp = await searchParams
  const artist = await getArtist(decodeURIComponent(slug))
  if (!artist) notFound()

  const genres = asGenres(artist.genres)
  const filter = TYPE_ORDER.includes(sp.type as never) ? sp.type : undefined
  const [interviews, all, picks] = await Promise.all([
    findArticles({ where: { and: [{ artists: { in: [artist.id] } }, { type: { equals: 'interview' } }] }, limit: 10 }),
    findArticles({ where: { artists: { in: [artist.id] } }, limit: 100 }),
    findPicks({ where: { artist: { equals: artist.id } }, limit: 12 }),
  ])
  const nonInterview = all.docs.filter((a) => a.type !== 'interview')
  const shown = filter ? all.docs.filter((a) => a.type === filter) : nonInterview
  const types = TYPE_ORDER.filter((t) => t !== 'interview' && nonInterview.some((a) => a.type === t))
  const info = [
    ['Genre', genres.map((g) => g.name).join(', ')],
    ['Based in', artist.basedIn],
    ['Active', artist.active],
  ].filter(([, v]) => v)

  return (
    <>
      <section className="wrap artist-head">
        <ArrowLink href="/search" back>
          검색
        </ArrowLink>
        <div className="artist-head__row">
          <div>
            <p className="label">Artist</p>
            <h1 className="display-lg">{artist.name}</h1>
          </div>
          {genres.length ? (
            <div className="chips">
              {genres.map((g) => (
                <Chip key={g.id} href={`/genres/${g.slug}`}>
                  {g.name}
                </Chip>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="wrap section grid12 artist-intro">
        <div className="col-5">
          <Img media={artist.photo} label="Artist photo 4:5" sizes="(max-width: 768px) 100vw, 40vw" priority />
        </div>
        <div className="col-6 col-start-7 artist-intro__text">
          {artist.noteHeadline || artist.note ? (
            <div className="stack-20">
              <p className="label">Editor&apos;s Note</p>
              {artist.noteHeadline ? (
                <p className="h-md">
                  <Lines text={artist.noteHeadline} />
                </p>
              ) : null}
              <RichText data={artist.note} className="prose prose--lead" />
            </div>
          ) : null}
          {info.length ? (
            <dl className="info-rows">
              {info.map(([k, v]) => (
                <div key={k}>
                  <dt className="label">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <ListenLinks links={artist.links} label="Listen" />
        </div>
      </section>

      {interviews.docs.length ? (
        <section className="wrap section">
          <SectionHeader title="Interview" right={<span className="muted">{interviews.docs.length}</span>} />
          <div className="stack-48">
            {interviews.docs.map((iv) => (
              <div key={iv.id} className="interview-item grid12">
                <Link href={articleHref(iv)} className="col-6">
                  <Img media={iv.cover} ratio="3 / 2" tone="dark" label="Interview image 3:2" sizes="(max-width: 768px) 100vw, 50vw" />
                </Link>
                <div className="col-5 col-start-8 interview-item__copy">
                  <p className="label">Interview · {formatDate(iv.publishedAt)}</p>
                  <h3 className="h-lg">{iv.title}</h3>
                  {iv.excerpt ? <p className="muted">{iv.excerpt}</p> : null}
                  <Button href={articleHref(iv)} variant="outline">
                    인터뷰 읽기
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {nonInterview.length ? (
        <section className="wrap section">
          <SectionHeader
            title="Articles"
            right={
              types.length > 1 ? (
                <div className="chips chips--scroll">
                  <Chip href={`/artists/${artist.slug}`} active={!filter}>
                    All {nonInterview.length}
                  </Chip>
                  {types.map((t) => (
                    <Chip key={t} href={`/artists/${artist.slug}?type=${t}`} active={filter === t}>
                      {TYPE_LABEL[t]}
                    </Chip>
                  ))}
                </div>
              ) : (
                <span className="muted">{nonInterview.length}</span>
              )
            }
          />
          <CardGrid articles={shown} />
        </section>
      ) : null}

      {picks.docs.length ? (
        <section className="wrap section">
          <SectionHeader title="Editor's Picks" right={<span className="muted">{picks.totalDocs}</span>} />
          <PickGrid picks={picks.docs} />
        </section>
      ) : null}
    </>
  )
}
