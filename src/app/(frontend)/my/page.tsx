import { ListenTabs } from '@/components/ListenTabs'
import type { Metadata } from 'next'
import { MyPlaylist } from './MyPlaylist'

export const metadata: Metadata = { title: '좋아요한 곡', robots: { index: false } }

export default function MyPage() {
  return (
    <>
      <div className="listen-tabs-top">
        <ListenTabs />
      </div>
      <MyPlaylist />
    </>
  )
}
