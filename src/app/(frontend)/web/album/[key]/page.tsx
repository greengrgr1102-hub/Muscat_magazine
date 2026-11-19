import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { Pick } from '@/payload-types'
import { ArrowLink } from '@/components/ui'
import { findAlbumPicks } from '@/lib/data'
import { SpiderWeb } from '../../[id]/SpiderWeb'

type Props = { params: Promise<{ key: string }> }

const titleOf = (docs: Pick[]) => docs.find((d) => d.album)?.album || `「${docs[0].track}」 수록 앨범`

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const docs = (await findAlbumPicks((await params).key)) as Pick[] | null
  return { title: docs ? `${titleOf(docs)} 앨범 거미줄` : '앨범 거미줄', robots: { index: false } }
}

// 앨범 하나에서 비슷한 앨범이 거미줄처럼 펼쳐지는 화면
export default async function AlbumWebPage({ params }: Props) {
  const { key } = await params
  const docs = (await findAlbumPicks(key)) as Pick[] | null
  if (!docs) notFound()
  return (
    <section className="wrap web-page">
      <div className="web-page__head">
        <ArrowLink href={`/picks/albums/${key}`} back>
          {titleOf(docs)}
        </ArrowLink>
        <h1 className="h-lg">비슷한 앨범 거미줄</h1>
        <p className="muted small">앨범을 누르면 에디터가 담은 수록곡이 차례로 나오고, 거기서 또 비슷한 앨범이 펼쳐져요. 화면을 끌어서 움직일 수 있어요.</p>
      </div>
      <SpiderWeb startId={key} kind="album" />
    </section>
  )
}
