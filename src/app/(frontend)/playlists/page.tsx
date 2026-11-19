import { ListenTabs } from '@/components/ListenTabs'
import type { Metadata } from 'next'
import { PlaylistCards } from '@/components/Playlists'
import { findPlaylists } from '@/lib/data'

export const metadata: Metadata = {
  title: '에디터 플리',
  description: '머스캣 매거진 에디터가 엮은 플레이리스트. 통째로 담아 내 플리로 들을 수 있어요.',
}

export default async function PlaylistsPage() {
  const lists = await findPlaylists(60)
  return (
    <>
      <section className="page-title wrap">
        <h1 className="page-title__h">
          <span className="display-lg">Playlists</span>
          <sup className="label">{lists.totalDocs}</sup>
        </h1>
        <p className="muted page-title__desc">
          에디터가 엮은 플레이리스트예요.
          <br />
          마음에 들면 「통째로 담기」로 내 플리에 넣어 두세요.
        </p>
      </section>
      <ListenTabs />
      <section className="wrap section">
        {lists.docs.length ? <PlaylistCards lists={lists.docs} /> : <p className="muted">첫 번째 플리를 준비하고 있어요.</p>}
      </section>
    </>
  )
}
