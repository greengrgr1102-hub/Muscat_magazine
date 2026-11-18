import type { Metadata } from 'next'
import Link from 'next/link'
import { PickGrid } from '@/components/Picks'
import { findPicks } from '@/lib/data'

export const metadata: Metadata = {
  title: "Editor's Picks",
  description: '에디터가 들은 곡 중에 좋았던 곡을 골라 한 줄과 함께 소개합니다.',
}

const PER_PAGE = 24

export default async function PicksPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const res = await findPicks({ limit: PER_PAGE * page })

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
      <section className="wrap section">
        {res.docs.length ? (
          <PickGrid picks={res.docs} />
        ) : (
          <p className="muted">첫 번째 추천곡을 준비하고 있어요.</p>
        )}
        {res.hasNextPage ? (
          <div className="pagination">
            <Link className="btn btn--outline" href={`/picks?page=${page + 1}`} scroll={false}>
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
