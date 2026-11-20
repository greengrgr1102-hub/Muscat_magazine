import type { Metadata } from 'next'
import Link from 'next/link'
import { toRow } from '@/components/Picks'
import { PickList } from '@/components/PickList'
import { AddAllButton, PlayAllButton } from '@/components/AddButton'
import { ExportPlaylist } from '@/components/ExportPlaylist'
import { getClient } from '@/lib/data'
import type { Pick } from '@/payload-types'

export const metadata: Metadata = { title: '공유된 플리', robots: { index: false } }

// 친구가 보낸 플리 링크: /share?n=이름&ids=a.b.c (36진수 곡 번호)
export default async function SharePage({ searchParams }: { searchParams: Promise<{ n?: string; ids?: string }> }) {
  const sp = await searchParams
  const name = (sp.n || '공유된 플리').slice(0, 40)
  const ids = (sp.ids || '')
    .split('.')
    .map((x) => parseInt(x, 36))
    .filter((x) => Number.isInteger(x) && x > 0)
    .slice(0, 300)
  const payload = await getClient()
  const found = ids.length
    ? (await payload.find({ collection: 'picks', where: { id: { in: ids } }, limit: ids.length, depth: 0 })).docs
    : []
  const byId = new Map(found.map((p) => [p.id, p as Pick]))
  const rows = ids.map((id) => byId.get(id)).filter((p): p is Pick => Boolean(p)).map(toRow)

  return (
    <>
      <section className="page-title wrap">
        <p className="label">Shared Playlist</p>
        <h1 className="page-title__h">
          <span className="display-lg">{name}</span>
          <sup className="label">{rows.length}</sup>
        </h1>
        <p className="muted page-title__desc">누군가 Muscat Magazine에서 고른 곡들이에요.</p>
      </section>
      <section className="wrap section">
        {rows.length ? (
          <>
            <div className="my-actions">
              <PlayAllButton songs={rows} label={name} />
              <AddAllButton songs={rows} label="좋아요한 곡에 통째로 담기" />
              <ExportPlaylist songs={rows} name={name} />
            </div>
            <PickList rows={rows} groupByMonth={false} label="공유받은 플리" />
          </>
        ) : (
          <p className="muted">
            플리를 찾지 못했어요. <Link href="/picks" className="underline">Editor&apos;s Picks 둘러보기</Link>
          </p>
        )}
      </section>
    </>
  )
}
