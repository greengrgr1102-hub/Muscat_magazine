import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'
import { CardGrid, Chip } from '@/components/ui'
import { TYPE_LABEL, TYPE_ORDER, findArticles, getArticleGenres } from '@/lib/data'

export const metadata: Metadata = { title: 'Articles', alternates: { canonical: '/articles' } }

const PER_PAGE = 12

type SP = Promise<{ type?: string; genre?: string; page?: string; sort?: string }>

export default async function ArticlesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const type = TYPE_ORDER.includes(sp.type as never) ? sp.type : undefined
  const genres = await getArticleGenres()
  const genre = genres.find((g) => g.slug === sp.genre)
  const page = Math.max(1, Number(sp.page) || 1)
  const sort = sp.sort === 'old' ? 'publishedAt' : '-publishedAt'

  const and: Where[] = []
  if (type) and.push({ type: { equals: type } })
  if (genre) and.push({ genres: { in: [genre.id] } })
  const res = await findArticles({ where: and.length ? { and } : undefined, limit: PER_PAGE * page, sort })

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const next = { type, genre: genre?.slug, sort: sp.sort, ...patch }
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v)
    const s = p.toString()
    return s ? `/articles?${s}` : '/articles'
  }

  return (
    <>
      <section className="page-title wrap">
        <h1 className="page-title__h">
          <span className="display-lg">Articles</span>
          <sup className="label">{res.totalDocs}</sup>
        </h1>
        <p className="muted page-title__desc">
          리뷰, 큐레이션, 인터뷰, 발매 소식까지.
          <br />
          머스캣 매거진의 모든 글을 모았습니다.
        </p>
      </section>

      <section className="wrap">
        <div className="filter-bar">
          <div className="chips chips--scroll">
            <Chip href={qs({ type: undefined })} active={!type}>
              All
            </Chip>
            {TYPE_ORDER.map((t) => (
              <Chip key={t} href={qs({ type: t })} active={type === t}>
                {TYPE_LABEL[t]}
              </Chip>
            ))}
          </div>
          <div className="filter-bar__right">
            <details className="dropdown">
              <summary>
                {genre ? genre.name : '장르 전체'}
                <span aria-hidden="true">↓</span>
              </summary>
              <div className="dropdown__menu">
                <Link href={qs({ genre: undefined })}>장르 전체</Link>
                {genres.map((g) => (
                  <Link key={g.id} href={qs({ genre: g.slug || undefined })}>
                    {g.name}
                  </Link>
                ))}
              </div>
            </details>
            <Link className="dropdown-link" href={qs({ sort: sp.sort === 'old' ? undefined : 'old' })}>
              {sp.sort === 'old' ? '오래된순' : '최신순'} <span aria-hidden="true">↓</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="wrap section">
        <CardGrid articles={res.docs} empty="조건에 맞는 글이 아직 없습니다." />
        {res.totalDocs > res.docs.length ? (
          <div className="pagination">
            <Link className="btn btn--outline" href={qs({ page: String(page + 1) })} scroll={false}>
              <span>더 보기</span>
            </Link>
            <p className="label">
              {res.docs.length} / {res.totalDocs}
            </p>
          </div>
        ) : null}
      </section>
    </>
  )
}
