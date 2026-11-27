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

// 피처링이 붙은 곡이 섞여 있어도 앨범 아티스트는 가장 많이 나온 이름으로
// (쉼표로 자르면 "Tyler, The Creator" 같은 이름이 잘려서, 곡에 적힌 이름 그대로 셈)
const artistOf = (docs: Pick[]) => {
  const count = new Map<string, number>()
  for (const d of docs) {
    const a = d.artistName || ''
    if (a) count.set(a, (count.get(a) || 0) + 1)
  }
  return [...count.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] || docs[0].artistName
}

// 앨범 곡에 연결된 아티스트 페이지 (가장 많이 연결된 것)
const artistPageOf = (docs: Pick[]) => {
  const count = new Map<string, { slug: string; n: number }>()
  for (const d of docs) {
    const a = d.artist
    if (a && typeof a === 'object' && a.slug) {
      const c = count.get(a.slug) || { slug: a.slug, n: 0 }
      c.n++
      count.set(a.slug, c)
    }
  }
  return [...count.values()].sort((x, y) => y.n - x.n)[0]?.slug || null
}

const titleOf = (docs: Pick[]) =>
  docs.find((d) => d.album)?.album || `「${docs[0].track}」 수록 앨범`

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params
  const docs = (await findAlbumPicks(key)) as Pick[] | null
  if (!docs) return {}
  return {
    title: `${titleOf(docs)} — ${artistOf(docs)}`,
    alternates: { canonical: `/picks/albums/${key}` },
    description: `머스캣 에디터가 이 앨범에서 담은 ${docs.length}곡`,
  }
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
  const artistSlug = artistPageOf(docs)
  // 수록곡에 많이 붙은 장르부터
  const gcount = new Map<string, { name: string; slug: string; n: number }>()
  for (const d of docs)
    for (const g of d.genres || [])
      if (typeof g === 'object' && g?.slug) {
        const c = gcount.get(g.slug) || { name: g.name, slug: g.slug, n: 0 }
        c.n++
        gcount.set(g.slug, c)
      }
  const genres = [...gcount.values()].sort((a, b) => b.n - a.n)
  const TYPE: Record<string, string> = {
    album: 'Album',
    ep: 'EP',
    single: 'Single',
    compilation: 'Compilation',
  }
  const kind = TYPE[docs.find((d) => d.releaseType)?.releaseType || ''] || 'Album'

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
          <p className="label">
            {kind}
            {release ? ` · ${String(release).slice(0, 7).replace('-', '.')} 발매` : ''}
          </p>
          <h1 className="palb-hero__title">{title}</h1>
          <p className="palb-hero__artist">
            {artistSlug ? (
              <Link href={`/artists/${artistSlug}`} className="palb-hero__artist-link">
                {artistOf(docs)}
              </Link>
            ) : (
              artistOf(docs)
            )}
          </p>
          {genres.length ? (
            <div className="chips palb-hero__genres">
              {genres.map((g) => (
                <Link key={g.slug} href={`/genres/${g.slug}`} className="chip chip--link">
                  {g.name}
                </Link>
              ))}
            </div>
          ) : null}
          <p className="small muted">에디터가 이 앨범에서 {docs.length}곡을 담았어요.</p>
          <div className="palb-hero__actions">
            <PlayAllButton songs={rows} label={title} />
            <AddAllButton songs={rows} />
            <Link href={`/web/album/${key}`} className="add-btn">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="2.5" />
                <circle cx="4" cy="6" r="1.8" />
                <circle cx="20" cy="6" r="1.8" />
                <circle cx="5" cy="19" r="1.8" />
                <circle cx="19" cy="18" r="1.8" />
                <path d="M10 11 5.5 7M14 11l4.5-4M10.2 13.6 6.3 17.7M13.9 13.5l3.8 3.4" />
              </svg>
              <span>거미줄로 보기</span>
            </Link>
          </div>
        </div>
      </section>
      <ListenTabs />
      <section className="wrap section">
        <PickList rows={rows} groupByMonth={false} label={title} />
      </section>
    </>
  )
}
