import type { Metadata } from 'next'
import { ExploreTabs } from '@/components/ExploreTabs'
import { artistCats, getFestivalStats, getFestivals } from '@/lib/festivals'
import type { FestStats } from '@/lib/festivalShared'
import { FestivalsView } from './FestivalsView'

export const metadata: Metadata = {
  title: '페스티벌',
  description: '올해 페스티벌에 누가 나왔는지. 에디터가 들은 아티스트는 바로 들어볼 수 있어요.',
}
export const revalidate = 3600

export default async function FestivalsPage() {
  const fests = await getFestivals()
  // 전체 + 나라별 통계 (나라 칩을 누르면 통계와 카드가 같이 바뀌어요)
  const cats = artistCats()
  const countries = [...new Set(fests.map((f) => f.country).filter(Boolean) as string[])]
  const stats: Record<string, FestStats> = { '': await getFestivalStats(fests, cats) }
  for (const c of countries)
    stats[c] = await getFestivalStats(
      fests.filter((f) => f.country === c),
      cats,
    )
  const year = fests[0]?.start.slice(0, 4) || String(new Date().getFullYear())
  return (
    <>
      <section className="page-title wrap">
        <p className="label">Festivals {year}</p>
        <h1 className="page-title__h">
          <span className="display-lg">페스티벌</span>
          <sup className="label">{fests.length}</sup>
        </h1>
        <p className="muted page-title__desc">
          올해 페스티벌 무대에 선 팀들. <span className="fest-dot" aria-hidden /> 표시는 에디터가
          들은 아티스트라 바로 들어볼 수 있어요.
        </p>
      </section>
      <ExploreTabs />
      <FestivalsView fests={fests} stats={stats} />
    </>
  )
}
