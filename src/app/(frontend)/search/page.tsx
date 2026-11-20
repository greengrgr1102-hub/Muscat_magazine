import type { Metadata } from 'next'
import Link from 'next/link'
import { ArtistRow } from '@/components/ArtistRow'
import { CardGrid, Chip, Icon, SectionHeader } from '@/components/ui'
import { GenreLine } from '@/components/GenreLine'
import { articleCountFor, getGenresByUse, search } from '@/lib/data'

export const metadata: Metadata = { title: 'Search' }

type SP = Promise<{ q?: string }>

const small = (u: string | null) => (u ? u.replace('ab67616d0000b273', 'ab67616d00001e02') : null)

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const { q = '' } = await searchParams
  const term = q.trim().slice(0, 80)
  const [genres, r] = await Promise.all([getGenresByUse(), search(term)])
  const counts = await Promise.all(r.artists.map((a) => articleCountFor('artists', a.id)))
  const artistTotal = r.artists.length + r.pickArtists.length
  const total = r.genres.length + artistTotal + r.albums.length + r.songs.length + r.articles.length

  return (
    <>
      <section className="wrap search-head">
        <p className="label">Search</p>
        <form action="/search" className="search-input" role="search">
          <input
            name="q"
            defaultValue={term}
            placeholder="아티스트, 앨범, 곡, 장르, 글 제목"
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
            {[
              r.genres.length ? `장르 ${r.genres.length}` : null,
              artistTotal ? `아티스트 ${artistTotal}` : null,
              r.albums.length ? `앨범 ${r.albums.length}` : null,
              r.songs.length ? `곡 ${r.songs.length}` : null,
              r.articles.length ? `아티클 ${r.articles.length}` : null,
            ]
              .filter(Boolean)
              .join(' · ') || '찾은 게 없어요'}
          </p>
        ) : null}
        {!term && genres.length ? (
          <div className="stack-12 search-genres">
            <p className="label">장르로 찾기</p>
            <GenreLine genres={genres} />
          </div>
        ) : null}
      </section>

      {term ? (
        <>
          {r.genres.length ? (
            <section className="wrap section">
              <SectionHeader title="Genres" right={<span className="muted">{r.genres.length}</span>} />
              <div className="chips chips--wrap">
                {r.genres.map((g) => (
                  <Chip key={g.id} href={`/genres/${g.slug}`}>
                    {g.name}
                    {g.n ? <span className="search-count">{g.n}</span> : null}
                  </Chip>
                ))}
              </div>
            </section>
          ) : null}

          {artistTotal ? (
            <section className="wrap section">
              <SectionHeader title="Artists" right={<span className="muted">{artistTotal}</span>} />
              {r.artists.length ? (
                <ul className="index-list">
                  {r.artists.map((a, i) => (
                    <ArtistRow key={a.id} artist={a} count={counts[i]} />
                  ))}
                </ul>
              ) : null}
              {r.pickArtists.length ? (
                <div className="chips chips--wrap search-artists">
                  {r.pickArtists.map((a) => (
                    <Chip key={a.name} href={`/picks?q=${encodeURIComponent(a.name)}`}>
                      {a.name}
                      <span className="search-count">{a.via ? `${a.via} · ` : ''}{a.n}곡</span>
                    </Chip>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {r.albums.length ? (
            <section className="wrap section">
              <SectionHeader title="Albums" right={<span className="muted">{r.albums.length}</span>} />
              <ul className="search-items">
                {r.albums.map((a) => (
                  <li key={a.key}>
                    <Link href={`/picks/albums/${a.key}`} className="search-item">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {a.cover ? <img src={small(a.cover)!} alt="" loading="lazy" /> : <span className="search-item__blank" />}
                      <span>
                        <strong>{a.album}</strong>
                        <span className="muted">{a.artist} · {a.n}곡 담음</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {r.songs.length ? (
            <section className="wrap section">
              <SectionHeader title="Songs" right={<span className="muted">{r.songs.length}</span>} />
              <ul className="search-items">
                {r.songs.map((s) => (
                  <li key={s.id}>
                    <Link href={`/picks/${s.id}`} className="search-item">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {s.cover ? <img src={small(s.cover)!} alt="" loading="lazy" /> : <span className="search-item__blank" />}
                      <span>
                        <strong>{s.track || '곡'}</strong>
                        <span className="muted">{[s.artist, s.album].filter(Boolean).join(' · ')}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="wrap section">
            <SectionHeader title="Articles" right={<span className="muted">{r.articles.length}</span>} />
            <CardGrid articles={r.articles} empty={`'${term}'와 맞는 글이 없습니다.`} />
          </section>

          {!total ? (
            <section className="wrap section">
              <p className="muted">장르는 한국어로도 찾을 수 있어요. 예: 시티팝, 슈게이즈, 알앤비</p>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  )
}
