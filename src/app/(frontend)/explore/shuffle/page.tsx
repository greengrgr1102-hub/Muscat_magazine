import type { Metadata } from 'next'
import { ExploreTabs } from '@/components/ExploreTabs'
import { COUNTRY_OPTIONS, ERA_OPTIONS, getGenresByUse } from '@/lib/data'
import { Shuffle } from './Shuffle'

export const metadata: Metadata = {
  title: '아무거나 틀어줘',
  description: '장르·나라·시대만 고르면 에디터가 들은 곡 중 아직 안 들어본 곡을 하나씩 틀어 드려요.',
}

export default async function ShufflePage() {
  const genres = (await getGenresByUse()).slice(0, 60).map((g) => ({ slug: g.slug, name: g.name }))
  return (
    <>
      <section className="page-title wrap">
        <p className="label">Shuffle</p>
        <h1 className="page-title__h">
          <span className="display-lg">아무거나 틀어줘</span>
        </h1>
        <p className="muted page-title__desc">고르기 귀찮은 날. 조건만 정하면 아직 안 들어본 곡부터 하나씩 틀어 드려요.</p>
      </section>
      <ExploreTabs />
      <Shuffle genres={genres} countries={[...COUNTRY_OPTIONS]} eras={[...ERA_OPTIONS]} />
    </>
  )
}
