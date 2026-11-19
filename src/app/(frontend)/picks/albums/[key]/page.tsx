import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Pick } from '@/payload-types'
import { ListenTabs } from '@/components/ListenTabs'
import { PickList } from '@/components/PickList'
import { toRow } from '@/components/Picks'
import { AddAllButton, PlayAllButton } from '@/components/AddButton'
import { findAlbumPicks } from '@/lib/data'
import { Icon } from '@/components/ui'

type Props = { params: Promise<{ key: string }> }

// 피처링이 붙은 곡이 섞여 있어도 앨범 아티스트는 가장 많이 나온 첫 번째 이름으로
const artistOf = (docs: Pick[]) => {
  const count = new Map<string, number>()
  for (const d of docs) {
    const a = (d.artistName || '').split(', ')[0]
    if (a) count.set(a, (count.get(a) || 0) + 1)
  }
  return [...count.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] || docs[0].artistName
}

const titleOf = (docs: Pick[]) => docs.find((d) => d.album)?.album || `「${docs[0].track}」 수록 앨범`

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params
  const docs = (await findAlbumPicks(key)) as Pick[] | null
  if (!docs) return {}
  return { title: `${titleOf(docs)} — ${artistOf(docs)}`, description: `머스캣 에디터가 이 앨범에서 담은 ${docs.length}곡` }
}

export default async function PickAlbumPage({ params }: Props) {
  const { key } = await params
  const docs = (await findAlbumPicks(key)) as Pick[] | null
  if (!docs) notFound()
  const rows = docs.map((d) => toRow(d))
  const first = docs[0]
  const release = docs.find((d) => d.releaseDate)?.releaseDate
  const cover = (first.coverUrl || '').replace('ab67616d00004851', 'ab67616d0000b273')
  const title = titleOf(docs)
  const genres = [...new Set(docs.flatMap((d) => (d.genres || []).map((g) => (typeof g === 'object' && g ? g.name : null)).filter(Boolean)))] as string[]

  return (
    <>
      <div className="wrap palb-back">
        <Link href="/picks/albums" className="arrow-link">
          <Icon name="left" />
          <span>Albums</span>
        </Link>
      </div>
      <section className="wrap palb-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {cover ? <img src={cover} alt="" className="palb-hero__cover" /> : null}
        <div className="palb-hero__body">
          <p className="label">Album{release ? ` · ${String(release).slice(0, 7).replace('-', '.')} 발매` : ''}</p>
          <h1 className="palb-hero__title">{title}</h1>
          <p className="palb-hero__artist">{artistOf(docs)}</p>
          {genres.length ? <p className="small palb-hero__genres">{genres.slice(0, 4).join(' · ')}</p> : null}
          <p className="small muted">에디터가 이 앨범에서 {docs.length}곡을 담았어요.</p>
          <div className="palb-hero__actions">
            <PlayAllButton songs={rows} label={title} />
            <AddAllButton songs={rows} />
          </div>
        </div>
      </section>
      <ListenTabs />
      <section className="wrap section">
        <PickList rows={rows} groupByMonth={false} />
      </section>
    </>
  )
}
