import type { Metadata } from 'next'
import Link from 'next/link'
import type { Media } from '@/payload-types'
import { Img } from '@/components/ui'
import { EssentialBadge } from '@/components/EssentialBadge'
import { findEssentialAlbums } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Essential',
  description: '머스캣 매거진 에디터가 「꼭 들어야 할 것」으로 고른 앨범.',
}

export default async function EssentialPage() {
  const albums = await findEssentialAlbums()

  return (
    <>
      <section className="page-title wrap">
        <h1 className="page-title__h">
          <span className="display-lg">Essential</span>
          <sup className="label">{albums.length}</sup>
        </h1>
        <p className="muted page-title__desc">
          에디터가 「꼭 들어야 할 것」으로 고른 앨범이에요.
          <br />
          점수 대신, 이것만은 놓치지 않았으면 하는 앨범을 모았습니다.
        </p>
      </section>

      <section className="wrap section ess-section">
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
    </>
  )
}
