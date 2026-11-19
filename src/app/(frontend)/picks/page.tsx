import { ListenTabs } from '@/components/ListenTabs'
import type { Metadata } from 'next'
import Link from 'next/link'
import { after } from 'next/server'
import type { Where } from 'payload'
import { PickGrid, toRow } from '@/components/Picks'
import { PickList } from '@/components/PickList'
import { PlaylistCards } from '@/components/Playlists'
import { TasteBanner } from '@/components/TasteBanner'
import { PickFilters } from '@/components/PickFilters'
import { cleanFilter, findPickRows, findPickRowsRandom, findPicks, findPlaylists, getClient, getTag, pickFilterWhere } from '@/lib/data'
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
  searchParams: Promise<{ page?: string; tag?: string; q?: string; sort?: string; seed?: string; era?: string; c?: string; type?: string }>
}) {
  const sp = await searchParams
  // 페이지를 연 뒤에, 한 시간 넘게 지났으면 Spotify 플레이리스트에서 새 곡을 확인해요.
  after(async () => {
    await syncPlaylist(await getClient(), { minIntervalMin: 60 }).catch(() => null)
  })
  const page = Math.max(1, Number(sp.page) || 1)
  const q = (sp.q || '').trim().slice(0, 60)
  const tag = sp.tag ? await getTag(sp.tag) : null

  const f = cleanFilter(sp)
  const filtered = Boolean(f.era || f.c || f.type)
  // 정렬: 랜덤(기본) · 담은 순(new) · 발매 최신순(rel) · 발매 오래된 순(old)
  const order = sp.sort === 'new' || sp.sort === 'rel' || sp.sort === 'old' ? sp.sort : q ? 'new' : 'random'
  const filters: Where[] = [...pickFilterWhere(f)]
  if (tag) filters.push({ tags: { in: [tag.id] } })
  if (q) filters.push({ or: [{ track: { like: q } }, { artistName: { like: q } }] })
  if (order === 'rel' || order === 'old') filters.push({ releaseDate: { exists: true } })
  const where: Where | undefined = filters.length ? { and: filters } : undefined
  const plain = !q && !tag && !filtered && page === 1
  const latest = order !== 'random'
  const sortBy = order === 'rel' ? '-releaseDate' : order === 'old' ? 'releaseDate' : '-pickedAt'
  const seed = Number(sp.seed) || Math.floor(Math.random() * 1_000_000) + 1

  const [list, featured] = await Promise.all([
    latest ? findPickRows({ where, page, limit: PER_PAGE, sort: sortBy }) : findPickRowsRandom({ where, seed, page, limit: PER_PAGE }),
    plain ? findPickRowsRandom({ where: hasComment, seed, limit: 6 }) : Promise.resolve(null),
  ])
  const playlists = plain ? await findPlaylists(4) : null
  const featuredFull = featured?.docs.length
    ? await findPicks({ where: { id: { in: featured.docs.map((d) => d.id) } }, limit: 6 })
    : null
  const rows = list.docs.map((d) => toRow(d as Pick))
  const fkeep: Record<string, string> = { ...(f.era ? { era: f.era } : {}), ...(f.c ? { c: f.c } : {}), ...(f.type ? { type: f.type } : {}) }
  const keep: Record<string, string> = { ...(tag?.slug ? { tag: tag.slug } : {}), ...(q ? { q } : {}), ...fkeep }
  const sortKeep: Record<string, string> = latest && order !== 'new' ? { sort: order } : latest && !q ? { sort: 'new' } : {}
  const href = (p: number) =>
    `/picks?${new URLSearchParams({ ...keep, ...sortKeep, ...(!latest ? { seed: String(seed) } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`
  const orderLink = (o: string, label: string) =>
    order === o ? (
      <span aria-current="true">{label}</span>
    ) : (
      <Link href={`/picks?${new URLSearchParams({ ...keep, ...(o === 'random' ? {} : { sort: o }) })}#log`}>{label}</Link>
    )
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
      <ListenTabs />

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
          <h2 className="h-lg">{q ? `‘${q}’ 검색 결과` : tag ? `#${tag.name}` : filtered ? '골라 보기' : '전체 기록'}</h2>
          <form action="/picks#log" className="plist-search" role="search">
            {tag?.slug ? <input type="hidden" name="tag" value={tag.slug} /> : null}
            {Object.entries(fkeep).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <input type="search" name="q" defaultValue={q} placeholder="곡 또는 아티스트 검색" aria-label="곡 또는 아티스트 검색" />
            <button type="submit" className="btn btn--outline">
              <span>찾기</span>
            </button>
          </form>
        </div>
        <PickFilters base="/picks" keep={{ ...(tag?.slug ? { tag: tag.slug } : {}), ...(q ? { q } : {}), ...sortKeep }} f={f} anchor="#log" />
        {!q ? (
          <p className="small plist-order">
            {orderLink('random', '랜덤')}
            {orderLink('new', '담은 순')}
            {orderLink('rel', '발매 최신순')}
            {orderLink('old', '오래된 순')}
            {order === 'random' ? (
              <Link href={`/picks?${new URLSearchParams(keep)}#log`} className="plist-order__shuffle">
                다시 섞기 ↻
              </Link>
            ) : null}
          </p>
        ) : null}
        {q || tag || filtered ? (
          <p className="small muted plist-filter">
            {list.totalDocs.toLocaleString()}곡 ·{' '}
            <Link href="/picks#log" className="underline">
              전체 보기
            </Link>
          </p>
        ) : null}

        {rows.length ? (
          <PickList rows={rows} groupByMonth={order === 'new'} />
        ) : (
          <p className="muted">{q || tag || filtered ? '조건에 맞는 곡이 없어요.' : '첫 번째 곡을 준비하고 있어요.'}</p>
        )}

        {list.totalPages > 1 ? (
          <nav className="plist-pages" aria-label="페이지">
            {list.hasPrevPage ? (
              <Link className="btn btn--outline" href={`${href(page - 1)}#log`}>
                <span>← 앞으로</span>
              </Link>
            ) : (
              <span />
            )}
            <p className="label">
              {from.toLocaleString()}–{to.toLocaleString()} / {list.totalDocs.toLocaleString()}
            </p>
            {list.hasNextPage ? (
              <Link className="btn btn--outline" href={`${href(page + 1)}#log`}>
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

// Spotify 가져오기가 도는 화면: 넉넉하게 60초까지 기다려요.
export const maxDuration = 60
