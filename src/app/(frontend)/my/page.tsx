import type { Metadata } from 'next'
import { MyPlaylist } from './MyPlaylist'

export const metadata: Metadata = { title: '내 플리', robots: { index: false } }

export default function MyPage() {
  return <MyPlaylist />
}
