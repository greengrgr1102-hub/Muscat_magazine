import type { Metadata } from 'next'
import { ExploreTabs } from '@/components/ExploreTabs'
import { TasteFinder } from './TasteFinder'

export const metadata: Metadata = {
  title: '내 취향 찾기',
  description: '질문 네 개에 답하고 10곡만 들어 보면, 에디터가 들은 수천 곡 중에서 내 취향에 맞는 곡을 골라 드려요.',
}

export default function TastePage() {
  return (
    <>
      <div className="listen-tabs-top">
        <ExploreTabs />
      </div>
      <TasteFinder />
    </>
  )
}
