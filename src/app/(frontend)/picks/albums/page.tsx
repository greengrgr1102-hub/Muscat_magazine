import type { Metadata } from 'next'
import Link from 'next/link'
import { ListenTabs } from '@/components/ListenTabs'
import { PickFilters } from '@/components/PickFilters'
import { GenrePicker } from '@/components/GenrePicker'
import { cleanFilter, findPickAlbums, getGenresByUse } from '@/lib/data'

export const metadata: Metadata = {
  title: "Albums — Editor's Picks",
  alternates: { canonical: '/picks/albums' },
  description: '머스캣 에디터가 들은 곡을 앨범 단위로 묶어 봤어요.',
}

const big = (u: string) => u.replace('ab67616d00004851', 'ab67616d0000b273')
const year = (d: string | null) => (d ? String(d).slice(0, 4) : null)

export default async function PickAlbumsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const sort = sp.sort === 'new' ? 'new' : sp.sort === 'old' ? 'old' : 'most'
  const f = cleanFilter(sp)
  const q = (sp.q || '').slice(0, 60)
  const page = Math.max(1, Number(sp.page) || 1)
  const [{ albums, totalDocs, totalPages }, genres] = await Promise.all([
    findPickAlbums({ page, sort, q, f }),
    getGenresByUse(),
  ])
  const gKeep: Record<string, string> = f.g?.length
    ? { g: f.g.join(','), ...(f.gm ? { gm: f.gm } : {}) }
    : {}
  const href = (o: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams()
    const v = { sort, q, page, ...o }
    if (v.sort === 'new' || v.sort === 'old') p.set('sort', String(v.sort))
    if (v.q) p.set('q', String(v.q))
    if (f.era) p.set('era', f.era)
    if (f.c) p.set('c', f.c)
    if (f.type) p.set('type', f.type)
    if (f.g?.length) p.set('g', f.g.join(','))
    if (f.gm) p.set('gm', f.gm)
    if (Number(v.page) > 1) p.set('page', String(v.page))
    const s = p.toString()
    return `/picks/albums${s ? `?${s}` : ''}`
  }

  return (
    <>
      <section className="page-title wrap">
        <h1 className="page-title__h">
          <span className="display-lg">Albums</span>
          <sup className="label">{totalDocs.toLocaleString()}</sup>
        </h1>
        <p className="muted page-title__desc">
          에디터가 들은 곡을 앨범으로 묶었어요.
          <br />한 앨범에서 여러 곡을 담았을수록 앞에 와요.
        </p>
      </section>
      <ListenTabs />

      <section className="wrap section">
        <div className="plist-head">
          <h2 className="h-lg">{q ? `‘${q}’ 검색 결과` : '앨범으로 보기'}</h2>
          <form action="/picks/albums" className="plist-search" role="search">
            {sort !== 'most' ? <input type="hidden" name="sort" value={sort} /> : null}
            {f.era ? <input type="hidden" name="era" value={f.era} /> : null}
            {f.c ? <input type="hidden" name="c" value={f.c} /> : null}
            {f.type ? <input type="hidden" name="type" value={f.type} /> : null}
            {f.g?.length ? <input type="hidden" name="g" value={f.g.join(',')} /> : null}
            {f.gm ? <input type="hidden" name="gm" value={f.gm} /> : null}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="앨범·아티스트·곡 검색"
              aria-label="앨범 검색"
            />
            <button type="submit" className="btn btn--outline">
              <span>찾기</span>
            </button>
          </form>
        </div>
        <PickFilters
          base="/picks/albums"
          keep={{ ...(sort !== 'most' ? { sort } : {}), ...(q ? { q } : {}), ...gKeep }}
          f={f}
        />
        <GenrePicker
          genres={genres.map((g) => ({ name: g.name, slug: g.slug, n: g.n, aliases: g.aliases }))}
          selected={f.g || []}
          mode={f.gm === 'any' ? 'any' : 'all'}
          base="/picks/albums"
          keep={{
            ...(sort !== 'most' ? { sort } : {}),
            ...(q ? { q } : {}),
            ...(f.era ? { era: f.era } : {}),
            ...(f.c ? { c: f.c } : {}),
            ...(f.type ? { type: f.type } : {}),
          }}
        />
        <p className="small plist-order">
          {sort === 'most' ? (
            <span aria-current="true">많이 담은 순</span>
          ) : (
            <Link href={href({ sort: 'most', page: 1 })}>많이 담은 순</Link>
          )}
          {sort === 'new' ? (
            <span aria-current="true">최신 발매순</span>
          ) : (
            <Link href={href({ sort: 'new', page: 1 })}>최신 발매순</Link>
          )}
          {sort === 'old' ? (
            <span aria-current="true">오래된 순</span>
          ) : (
            <Link href={href({ sort: 'old', page: 1 })}>오래된 순</Link>
          )}
        </p>

        {albums.length ? (
          <ul className="palb-grid">
            {albums.map((a) => (
              <li key={a.key}>
                <Link href={`/picks/albums/${a.key}`} className="palb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={big(a.cover)} alt="" loading="lazy" className="palb__cover" />
                  <span className="palb__title">
                    {a.album || (a.firstTrack ? `「${a.firstTrack}」 수록 앨범` : '앨범')}
                  </span>
                  <span className="palb__artist">{a.artist}</span>
                  <span className="palb__meta">
                    {[year(a.release), `${a.n}곡 담음`].filter(Boolean).join(' · ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">조건에 맞는 앨범이 없어요.</p>
        )}

        {totalPages > 1 ? (
          <nav className="plist-pages" aria-label="페이지">
            {page > 1 ? (
              <Link className="btn btn--outline" href={href({ page: page - 1 })}>
                <span>← 앞</span>
              </Link>
            ) : (
              <span />
            )}
            <p className="label">
              {page} / {totalPages}
            </p>
            {page < totalPages ? (
              <Link className="btn btn--outline" href={href({ page: page + 1 })}>
                <span>다음 →</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </>
  )
}
