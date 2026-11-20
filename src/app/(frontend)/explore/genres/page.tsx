import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExploreTabs } from '@/components/ExploreTabs'
import { getGenre, getGenresByUse } from '@/lib/data'
import { SpiderWeb } from '../../web/[id]/SpiderWeb'

export const metadata: Metadata = {
  title: '장르 지도',
  description: '함께 자주 붙는 장르끼리 이어진 지도. 장르를 누르면 대표곡을 들을 수 있어요.',
}

type SP = Promise<{ g?: string }>

// 장르 지도: 장르 하나에서 출발해 같이 자주 붙는 장르로 펼쳐져요
export default async function GenreMapPage({ searchParams }: { searchParams: SP }) {
  const { g } = await searchParams
  const used = await getGenresByUse()
  // 처음엔 곡이 많은 장르 중 너무 넓지 않은 장르(상위 몇 개 다음)에서 시작
  const start = g ? await getGenre(g) : null
  if (g && !start) notFound()
  const slug = start ? String(start.slug) : used[3]?.slug || used[0]?.slug
  if (!slug) notFound()
  const chips = used.slice(0, 24)
  return (
    <>
      <section className="page-title wrap">
        <p className="label">Genre Map</p>
        <h1 className="page-title__h">
          <span className="display-lg">장르 지도</span>
        </h1>
        <p className="muted page-title__desc">
          선이 굵을수록 두 장르가 같은 곡에 자주 함께 붙어요. 장르를 누르면 이어진 이유가 나오고, 한 번 더 누르면 그 장르로 건너가 대표곡이 흘러요.
        </p>
      </section>
      <ExploreTabs />
      <section className="wrap web-page">
        <div className="web-page__head">
          <p className="small muted">어디서 출발할까요?</p>
          <div className="chips chips--wrap">
            {chips.map((c) => (
              <Link key={c.id} href={`/explore/genres?g=${c.slug}`} className={`chip${c.slug === slug ? ' chip--active' : ''}`}>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
        <SpiderWeb key={slug} startId={slug} kind="genre" />
      </section>
    </>
  )
}
