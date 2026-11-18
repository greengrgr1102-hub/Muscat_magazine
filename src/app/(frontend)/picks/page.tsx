import type { Metadata } from 'next'
import Link from 'next/link'
import { after } from 'next/server'
import type { Where } from 'payload'
import { PickGrid, toRow } from '@/components/Picks'
import { PickList } from '@/components/PickList'
import { findPickRows, findPicks, getClient, getTag } from '@/lib/data'
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
  searchParams: Promise<{ page?: string; tag?: string; q?: string }>
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

  const [list, featured] = await Promise.all([
    findPickRows({ where, page, limit: PER_PAGE }),
    plain ? findPicks({ where: hasComment, limit: 6 }) : Promise.resolve(null),
  ])
  const rows = list.docs.map((d) => toRow(d as Pick))
  const href = (p: number) =>
    `/picks?${new URLSearchParams({ ...(tag?.slug ? { tag: tag.slug } : {}), ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`
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

      {featured?.docs.length ? (
        <section className="wrap section">
          <div className="section-header">
            <h2 className="h-lg">한 줄 남긴 곡</h2>
          </div>
          <PickGrid picks={featured.docs} />
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
        {q || tag ? (
          <p className="small muted plist-filter">
            {list.totalDocs.toLocaleString()}곡 ·{' '}
            <Link href="/picks#log" className="underline">
              전체 보기
            </Link>
          </p>
        ) : null}

        {rows.length ? (
          <PickList rows={rows} />
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
