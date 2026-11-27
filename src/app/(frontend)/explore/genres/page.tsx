import type { Metadata } from 'next'
import { ExploreTabs } from '@/components/ExploreTabs'
import { genreGraph } from '@/lib/data'
import { GenreMap } from './GenreMap'

export const metadata: Metadata = {
  title: '장르 지도',
  alternates: { canonical: '/explore/genres' },
  description: '에디터가 고른 곡의 장르들이 한눈에 펼쳐진 지도. 장르를 누르면 이어진 장르와 대표곡이 나와요.',
}
// 장르 자리는 한 시간에 한 번만 다시 계산해요
export const revalidate = 3600

type SP = Promise<{ g?: string }>

export default async function GenreMapPage({ searchParams }: { searchParams: SP }) {
  const [{ g }, graph] = await Promise.all([searchParams, genreGraph()])
  return (
    <>
      <section className="page-title wrap">
        <p className="label">Genre Map</p>
        <h1 className="page-title__h">
          <span className="display-lg">장르 지도</span>
          <sup className="label">{graph.nodes.length}</sup>
        </h1>
        <p className="muted page-title__desc">에디터가 고른 곡의 장르가 모두 펼쳐져 있어요. 장르를 누르면 이어진 장르와 대표곡이 나와요.</p>
      </section>
      <ExploreTabs />
      <section className="wrap web-page">
        <GenreMap graph={graph} initial={g || null} />
      </section>
    </>
  )
}
