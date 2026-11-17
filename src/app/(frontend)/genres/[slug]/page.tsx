import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArtistRow } from '@/components/ArtistRow'
import { ArrowLink, CardGrid, Chip, SectionHeader } from '@/components/ui'
import { articleCountFor, artistsByGenre, findArticles, getGenre, getGenres } from '@/lib/data'

type Params = Promise<{ slug: string }>
type SP = Promise<{ page?: string }>
const PER_PAGE = 9

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const g = await getGenre(decodeURIComponent(slug))
  return g ? { title: g.name, description: g.description || undefined } : {}
}

export default async function GenrePage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { slug } = await params
  const page = Math.max(1, Number((await searchParams).page) || 1)
  const genre = await getGenre(decodeURIComponent(slug))
  if (!genre) notFound()

  const [genres, artists, articles] = await Promise.all([
    getGenres(),
    artistsByGenre(genre.id),
    findArticles({ where: { genres: { in: [genre.id] } }, limit: PER_PAGE * page }),
  ])
  const counts = await Promise.all(artists.docs.map((a) => articleCountFor('artists', a.id)))

  return (
    <>
      <section className="wrap artist-head">
        <ArrowLink href="/search" back>
          검색
        </ArrowLink>
        <div className="artist-head__row">
          <div>
            <p className="label">Genre</p>
            <h1 className="display-lg">{genre.name}</h1>
          </div>
          <p className="label">
            아티스트 {artists.totalDocs} · 아티클 {articles.totalDocs}
          </p>
        </div>
        {genre.description ? <p className="muted genre-desc">{genre.description}</p> : null}
        <div className="chips chips--scroll">
          {genres.map((g) => (
            <Chip key={g.id} href={`/genres/${g.slug}`} active={g.id === genre.id}>
              {g.name}
            </Chip>
          ))}
        </div>
      </section>

      {artists.docs.length ? (
        <section className="wrap section">
          <SectionHeader title="Artists" right={<span className="muted">{artists.totalDocs}</span>} />
          <ul className="index-list">
            {artists.docs.map((a, i) => (
              <ArtistRow key={a.id} artist={a} count={counts[i]} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="wrap section">
        <SectionHeader title="Articles" right={<span className="muted">{articles.totalDocs}</span>} />
        <CardGrid articles={articles.docs} empty="이 장르의 글이 아직 없습니다." />
        {articles.totalDocs > articles.docs.length ? (
          <div className="pagination">
            <Link className="btn btn--outline" href={`/genres/${genre.slug}?page=${page + 1}`} scroll={false}>
              <span>더 보기</span>
            </Link>
            <p className="label">
              {articles.docs.length} / {articles.totalDocs}
            </p>
          </div>
        ) : null}
      </section>
    </>
  )
}
