import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlbumGrid } from '@/components/AlbumGrid'
import { ArtistRow } from '@/components/ArtistRow'
import { ArrowLink, CardGrid, Chip, SectionHeader } from '@/components/ui'
import { articleCountFor, artistsByGenre, findArticles, findPickAlbums, getGenre, pickCountForGenre, relatedGenres } from '@/lib/data'

type Params = Promise<{ slug: string }>
type SP = Promise<{ page?: string; sort?: string }>
const PER_PAGE = 24

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const g = await getGenre(decodeURIComponent(slug))
  return g
    ? { title: g.name, description: g.description || undefined, alternates: { canonical: `/genres/${g.slug}` } }
    : {}
}

// 장르 페이지: Editor's Picks에서 이 장르의 앨범 + 같이 자주 붙는 장르
export default async function GenrePage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { slug } = await params
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const sort = sp.sort === 'new' ? 'new' : sp.sort === 'old' ? 'old' : 'most'
  const genre = await getGenre(decodeURIComponent(slug))
  if (!genre) notFound()

  const [related, albums, songs, artists, articles] = await Promise.all([
    relatedGenres(genre.id),
    findPickAlbums({ genreId: genre.id, limit: PER_PAGE * page, sort }),
    pickCountForGenre(genre.id),
    artistsByGenre(genre.id),
    findArticles({ where: { genres: { in: [genre.id] } }, limit: 6 }),
  ])
  const counts = await Promise.all(artists.docs.map((a) => articleCountFor('artists', a.id)))
  const href = (o: { sort?: string; page?: number }) => {
    const p = new URLSearchParams()
    const v = { sort, page: 1, ...o }
    if (v.sort !== 'most') p.set('sort', v.sort)
    if (v.page > 1) p.set('page', String(v.page))
    const q = p.toString()
    return `/genres/${genre.slug}${q ? `?${q}` : ''}`
  }

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
            앨범 {albums.totalDocs} · 곡 {songs}
          </p>
        </div>
        {genre.description ? <p className="muted genre-desc">{genre.description}</p> : null}
        {related.length ? (
          <div className="stack-12 genre-related">
            <p className="label">같이 듣는 장르</p>
            <div className="chips chips--scroll">
              {related.map((g) => (
                <Chip key={g.id} href={`/genres/${g.slug}`}>
                  {g.name}
                </Chip>
              ))}
            </div>
            <p>
              <ArrowLink href={`/explore/genres?g=${genre.slug}`}>장르 지도에서 보기</ArrowLink>
            </p>
          </div>
        ) : null}
      </section>

      <section className="wrap section">
        <SectionHeader title="Albums" right={<span className="muted">{albums.totalDocs}</span>} />
        <p className="small plist-order">
          {sort === 'most' ? <span aria-current="true">많이 담은 순</span> : <Link href={href({ sort: 'most' })} scroll={false}>많이 담은 순</Link>}
          {sort === 'new' ? <span aria-current="true">최신 발매순</span> : <Link href={href({ sort: 'new' })} scroll={false}>최신 발매순</Link>}
          {sort === 'old' ? <span aria-current="true">오래된 순</span> : <Link href={href({ sort: 'old' })} scroll={false}>오래된 순</Link>}
        </p>
        <AlbumGrid albums={albums.albums} empty="이 장르의 앨범이 아직 없어요." />
        {albums.totalDocs > albums.albums.length ? (
          <div className="pagination">
            <Link className="btn btn--outline" href={href({ page: page + 1 })} scroll={false}>
              <span>더 보기</span>
            </Link>
            <p className="label">
              {albums.albums.length} / {albums.totalDocs}
            </p>
          </div>
        ) : null}
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

      {articles.docs.length ? (
        <section className="wrap section">
          <SectionHeader title="Articles" right={<span className="muted">{articles.totalDocs}</span>} />
          <CardGrid articles={articles.docs} />
        </section>
      ) : null}
    </>
  )
}
