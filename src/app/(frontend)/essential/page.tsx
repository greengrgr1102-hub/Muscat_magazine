import type { Metadata } from 'next'
import Link from 'next/link'
import type { Media, Pick } from '@/payload-types'
import { Img, SectionHeader } from '@/components/ui'
import { PickList } from '@/components/PickList'
import { toRow } from '@/components/Picks'
import { AddAllButton, PlayAllButton } from '@/components/AddButton'
import { EssentialBadge } from '@/components/EssentialBadge'
import { findEssentialAlbums, findEssentialPicks } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Essential',
  description: '머스캣 매거진 에디터가 「꼭 들어야 할 것」으로 고른 앨범과 곡.',
}

export default async function EssentialPage() {
  const [albums, picks] = await Promise.all([findEssentialAlbums(), findEssentialPicks()])
  const rows = picks.docs.map((d) => toRow(d as Pick))

  return (
    <>
      <section className="page-title wrap">
        <h1 className="page-title__h">
          <span className="display-lg">Essential</span>
          <sup className="label">{albums.length + rows.length}</sup>
        </h1>
        <p className="muted page-title__desc">
          에디터가 「꼭 들어야 할 것」으로 고른 앨범과 곡이에요.
          <br />
          점수 대신, 이것만은 놓치지 않았으면 하는 것들을 모았습니다.
        </p>
      </section>

      <section className="wrap section ess-section">
        <SectionHeader title="Essential 앨범" right={<span className="small muted">앨범 리뷰에서 골랐어요</span>} />
        {albums.length ? (
          <ul className="ess-albums">
            {albums.map((a) => (
              <li key={a.key} className="ess-album">
                <Link href={a.href} className="ess-album__link">
                  <Img media={a.cover as Media | number | null} ratio="1 / 1" tone="tint" sizes="(max-width: 768px) 50vw, 25vw" />
                  <div className="ess-album__body">
                    <EssentialBadge />
                    <h3 className="ess-album__title">{a.albumTitle}</h3>
                    {a.artistName ? <p className="ess-album__artist">{a.artistName}</p> : null}
                    {a.line ? <p className="ess-album__line">{a.line}</p> : null}
                    <p className="ess-album__from small muted">리뷰 읽기 · {a.articleTitle}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">앨범 리뷰에서 「Essential」에 체크하면 여기에 모여요.</p>
        )}
      </section>

      <section className="wrap section ess-section">
        <SectionHeader title="Essential 곡" right={<span className="small muted">Editor&apos;s Picks에서 골랐어요</span>} />
        {rows.length ? (
          <div className="ess-actions">
            <PlayAllButton songs={rows} label="Essential" />
            <AddAllButton songs={rows} />
          </div>
        ) : null}
        {rows.length ? (
          <PickList rows={rows} groupByMonth={false} />
        ) : (
          <p className="muted">Editor&apos;s Picks 곡에서 「Essential」에 체크하면 여기에 모여요.</p>
        )}
      </section>
    </>
  )
}
