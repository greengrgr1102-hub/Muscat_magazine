import type { Metadata } from 'next'
import { ArtistRow } from '@/components/ArtistRow'
import { CardGrid, Chip, Icon, SectionHeader } from '@/components/ui'
import { articleCountFor, getGenres, search } from '@/lib/data'

export const metadata: Metadata = { title: 'Search' }

type SP = Promise<{ q?: string }>

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const { q = '' } = await searchParams
  const term = q.trim().slice(0, 80)
  const [genres, results] = await Promise.all([getGenres(), search(term)])
  const counts = await Promise.all(results.artists.map((a) => articleCountFor('artists', a.id)))

  return (
    <>
      <section className="wrap search-head">
        <p className="label">Search</p>
        <form action="/search" className="search-input" role="search">
          <input
            name="q"
            defaultValue={term}
            placeholder="아티스트, 앨범, 글 제목"
            aria-label="검색어"
            autoFocus={!term}
            autoComplete="off"
          />
          {term ? (
            <a href="/search" aria-label="검색어 지우기" className="icon-btn">
              <Icon name="close" size={32} />
            </a>
          ) : (
            <button type="submit" aria-label="검색" className="icon-btn">
              <Icon name="search" size={32} />
            </button>
          )}
        </form>
        {term ? (
          <p className="small muted">
            아티스트 {results.artists.length} · 아티클 {results.articles.length}
          </p>
        ) : null}
        {genres.length ? (
          <div className="stack-12 search-genres">
            <p className="label">장르로 찾기</p>
            <div className="chips chips--wrap">
              {genres.map((g) => (
                <Chip key={g.id} href={`/genres/${g.slug}`}>
                  {g.name}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {term ? (
        <>
          <section className="wrap section">
            <SectionHeader title="Artists" right={<span className="muted">{results.artists.length}</span>} />
            {results.artists.length ? (
              <ul className="index-list">
                {results.artists.map((a, i) => (
                  <ArtistRow key={a.id} artist={a} count={counts[i]} />
                ))}
              </ul>
            ) : (
              <p className="empty">&lsquo;{term}&rsquo;와 맞는 아티스트가 없습니다.</p>
            )}
          </section>
          <section className="wrap section">
            <SectionHeader title="Articles" right={<span className="muted">{results.articles.length}</span>} />
            <CardGrid articles={results.articles} empty={`'${term}'와 맞는 글이 없습니다.`} />
          </section>
        </>
      ) : null}
    </>
  )
}
