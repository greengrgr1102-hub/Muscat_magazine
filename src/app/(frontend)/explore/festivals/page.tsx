import type { Metadata } from 'next'
import { ExploreTabs } from '@/components/ExploreTabs'
import { getFestivals } from '@/lib/festivals'
import { FestivalList } from './FestivalList'

export const metadata: Metadata = {
  title: '페스티벌',
  description: '올해 페스티벌에 누가 나왔는지. 에디터가 들은 아티스트는 바로 들어볼 수 있어요.',
}
export const revalidate = 3600

export default async function FestivalsPage() {
  const fests = await getFestivals()
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
      <FestivalList fests={fests} />
    </>
  )
}
