import type { Metadata } from 'next'
import { MyHub } from './MyHub'

export const metadata: Metadata = { title: 'My', robots: { index: false } }

export default function MyPage() {
  return <MyHub />
}
