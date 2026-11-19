import type { Metadata } from 'next'
import Link from 'next/link'
import { after } from 'next/server'
import type { Where } from 'payload'
import { PickGrid, toRow } from '@/components/Picks'
import { PickList } from '@/components/PickList'
import { PlaylistCards } from '@/components/Playlists'
import { TasteBanner } from '@/components/TasteBanner'
import { findPickRows, findPickRowsRandom, findPicks, findPlaylists, getClient, getTag } from '@/lib/data'
import { syncPlaylist } from '@/lib/spotify'
import type { Pick } from '@/payload-types'

export const metadata: Metadata = {
  title: "Editor's Picks",
  description: '에디터가 들은 노래를 모두 기록합니다. 한 줄을 남긴 곡은 따로 모아 보여 드려요.',
}

const PER_PAGE = 100
const hasComment: Where = { and: [{ comment: { exists: true } }, { comment: { not_equals: '' } }] }

export default async function PicksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tag?: string; q?: string; sort?: string; seed?: string }>
}) {
  const sp = await searchParams
  // 페이지를 연 뒤에, 한 시간 넘게 지났으면 Spotify 플레이리스트에서 새 곡을 확인해요.
  after(async () => {
    await syncPlaylist(await getClient(), { minIntervalMin: 60 }).catch(() => null)
  })
  const page = Math.max(1, Number(sp.page) || 1)
  const q = (sp.q || '').trim().slice(0, 60)
  const tag = sp.tag ? await getTag(sp.tag) : null

  const filters: Where[] = []
  if (tag) filters.push({ tags: { in: [tag.id] } })
  if (q) filters.push({ or: [{ track: { like: q } }, { artistName: { like: q } }] })
  const where: Where | undefined = filters.length ? { and: filters } : undefined
  const plain = !q && !tag && page === 1
  // 기본은 랜덤 순서. 검색할 때나 '최신순'을 고르면 최근 곡부터.
  const latest = sp.sort === 'new' || Boolean(q)
  const seed = Number(sp.seed) || Math.floor(Math.random() * 1_000_000) + 1

  const [list, featured] = await Promise.all([
    latest ? findPickRows({ where, page, limit: PER_PAGE }) : findPickRowsRandom({ where, seed, page, limit: PER_PAGE }),
    plain ? findPickRowsRandom({ where: hasComment, seed, limit: 6 }) : Promise.resolve(null),
  ])
  const playlists = plain ? await findPlaylists(4) : null
  const featuredFull = featured?.docs.length
    ? await findPicks({ where: { id: { in: featured.docs.map((d) => d.id) } }, limit: 6 })
    : null
  const rows = list.docs.map((d) => toRow(d as Pick))
  const keep = { ...(tag?.slug ? { tag: tag.slug } : {}), ...(q ? { q } : {}) }
  const href = (p: number) =>
    `/picks?${new URLSearchParams({ ...keep, ...(latest && !q ? { sort: 'new' } : {}), ...(!latest ? { seed: String(seed) } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`
  const from = (page - 1) * PER_PAGE + 1
  const to = from + list.docs.length - 1

  return (
    <>
      <section className="page-title wrap">
        <h1 className="page-title__h">
          <span className="display-lg">Editor&apos;s Picks</span>
          <sup className="label">{list.totalDocs.toLocaleString()}</sup>
        </h1>
        <p className="muted page-title__desc">
          에디터가 들은 노래를 모두 기록합니다.
          <br />
          커버를 누르면 이 자리에서 바로 들을 수 있어요.
        </p>
      </section>

      {plain ? (
        <section className="wrap taste-banner-wrap">
          <TasteBanner />
        </section>
      ) : null}

      {playlists?.docs.length ? (
        <section className="wrap section">
          <div className="section-header">
            <h2 className="h-lg">에디터 플리</h2>
            <Link href="/playlists" className="arrow-link">
              <span>전체 보기</span>
            </Link>
          </div>
          <PlaylistCards lists={playlists.docs} />
        </section>
      ) : null}

      {featuredFull?.docs.length ? (
        <section className="wrap section">
          <div className="section-header">
            <h2 className="h-lg">한 줄 남긴 곡</h2>
          </div>
          <PickGrid picks={featuredFull.docs} />
        </section>
      ) : null}

      <section className="wrap section" id="log">
        <div className="plist-head">
          <h2 className="h-lg">{q ? `‘${q}’ 검색 결과` : tag ? `#${tag.name}` : '전체 기록'}</h2>
          <form action="/picks#log" className="plist-search" role="search">
            {tag?.slug ? <input type="hidden" name="tag" value={tag.slug} /> : null}
            <input type="search" name="q" defaultValue={q} placeholder="곡 또는 아티스트 검색" aria-label="곡 또는 아티스트 검색" />
            <button type="submit" className="btn btn--outline">
              <span>찾기</span>
            </button>
          </form>
        </div>
        {!q ? (
          <p className="small plist-order">
            {latest ? (
              <>
                <Link href={`/picks?${new URLSearchParams(keep)}#log`}>랜덤</Link>
                <span aria-current="true">최신순</span>
              </>
            ) : (
              <>
                <span aria-current="true">랜덤</span>
                <Link href={`/picks?${new URLSearchParams({ ...keep, sort: 'new' })}#log`}>최신순</Link>
                <Link href={`/picks?${new URLSearchParams(keep)}#log`} className="plist-order__shuffle">
                  다시 섞기 ↻
                </Link>
              </>
            )}
          </p>
        ) : null}
        {q || tag ? (
          <p className="small muted plist-filter">
            {list.totalDocs.toLocaleString()}곡 ·{' '}
            <Link href="/picks#log" className="underline">
              전체 보기
            </Link>
          </p>
        ) : null}

        {rows.length ? (
          <PickList rows={rows} groupByMonth={latest} />
        ) : (
          <p className="muted">{q || tag ? '찾는 곡이 없어요.' : '첫 번째 곡을 준비하고 있어요.'}</p>
        )}

        {list.totalPages > 1 ? (
          <nav className="plist-pages" aria-label="페이지">
            {list.hasPrevPage ? (
              <Link className="btn btn--outline" href={`${href(page - 1)}#log`}>
                <span>← 최근</span>
              </Link>
            ) : (
              <span />
            )}
            <p className="label">
              {from.toLocaleString()}–{to.toLocaleString()} / {list.totalDocs.toLocaleString()}
            </p>
            {list.hasNextPage ? (
              <Link className="btn btn--outline" href={`${href(page + 1)}#log`}>
                <span>이전 기록 →</span>
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

// Spotify 가져오기가 도는 화면: 넉넉하게 60초까지 기다려요.
export const maxDuration = 60
