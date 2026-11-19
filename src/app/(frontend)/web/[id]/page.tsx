import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLink } from '@/components/ui'
import { albumKeyOf, getPick } from '@/lib/data'
import { SpiderWeb } from './SpiderWeb'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const pick = await getPick((await params).id)
  return { title: pick ? `${pick.track} 거미줄` : '거미줄 탐색', robots: { index: false } }
}

// 곡 하나에서 비슷한 곡이 거미줄처럼 펼쳐지는 화면
export default async function WebPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pick = await getPick(id)
  if (!pick) notFound()
  const albumKey = albumKeyOf(pick.coverUrl)
  return (
    <section className="wrap web-page">
      <div className="web-page__head">
        <ArrowLink href={`/picks/${pick.id}`} back>
          {pick.track || '곡'}
        </ArrowLink>
        <h1 className="h-lg">비슷한 곡 거미줄</h1>
        <p className="muted small">곡을 누르면 바로 들을 수 있고, 거기서 또 비슷한 곡이 펼쳐져요. 화면을 끌어서 움직일 수 있어요.</p>
        {albumKey ? (
          <p className="web-page__switch">
            <ArrowLink href={`/web/album/${albumKey}`}>앨범 거미줄로 보기</ArrowLink>
          </p>
        ) : null}
      </div>
      <SpiderWeb startId={String(pick.id)} />
    </section>
  )
}
