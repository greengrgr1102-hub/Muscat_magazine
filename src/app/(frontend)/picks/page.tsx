import type { Metadata } from 'next'
import Link from 'next/link'
import { after } from 'next/server'
import { PickGrid } from '@/components/Picks'
import { findPicks, getClient, getTag } from '@/lib/data'
import { syncPlaylist } from '@/lib/spotify'

export const metadata: Metadata = {
  title: "Editor's Picks",
  description: '에디터가 들은 곡 중에 좋았던 곡을 골라 한 줄과 함께 소개합니다.',
}

const PER_PAGE = 24

export default async function PicksPage({ searchParams }: { searchParams: Promise<{ page?: string; tag?: string }> }) {
  const sp = await searchParams
  // 페이지를 연 뒤에, 한 시간 넘게 지났으면 Spotify 플레이리스트에서 새 곡을 확인해요.
  after(async () => {
    await syncPlaylist(await getClient(), { minIntervalMin: 60 }).catch(() => null)
  })
  const page = Math.max(1, Number(sp.page) || 1)
  const tag = sp.tag ? await getTag(sp.tag) : null
  const res = await findPicks({ where: tag ? { tags: { in: [tag.id] } } : undefined, limit: PER_PAGE * page })
  const more = `/picks?${new URLSearchParams({ ...(tag?.slug ? { tag: tag.slug } : {}), page: String(page + 1) })}`

  return (
    <>
      <section className="page-title wrap">
        <h1 className="page-title__h">
          <span className="display-lg">Editor&apos;s Picks</span>
          <sup className="label">{res.totalDocs}</sup>
        </h1>
        <p className="muted page-title__desc">
          에디터가 들은 곡 중에 좋았던 곡을 고릅니다.
          <br />
          재생 버튼을 누르면 이 자리에서 바로 들을 수 있어요.
        </p>
      </section>
      {tag ? (
        <section className="wrap">
          <div className="filter-bar">
            <div className="chips">
              <Link className="chip" href="/picks">
                전체
              </Link>
              <span className="chip chip--active">#{tag.name}</span>
            </div>
          </div>
        </section>
      ) : null}
      <section className="wrap section">
        {res.docs.length ? (
          <PickGrid picks={res.docs} />
        ) : (
          <p className="muted">첫 번째 추천곡을 준비하고 있어요.</p>
        )}
        {res.hasNextPage ? (
          <div className="pagination">
            <Link className="btn btn--outline" href={more} scroll={false}>
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
