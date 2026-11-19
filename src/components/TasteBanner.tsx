'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadTaste, type Taste } from '@/lib/taste'

// Editor's Picks 맨 위: 취향을 아직 안 찾았으면 시작 안내, 찾았으면 내 취향 요약
export function TasteBanner() {
  const [taste, setTaste] = useState<Taste | null | undefined>(undefined)
  useEffect(() => setTaste(loadTaste()), [])
  if (taste === undefined) return <div className="taste-banner taste-banner--ghost" aria-hidden="true" />
  return (
    <Link href="/taste" className="taste-banner">
      <span className="label">{taste ? 'Your taste' : 'Find your taste'}</span>
      <span className="taste-banner__h">
        {taste ? (
          <>
            내 취향 <em>{taste.genres.slice(0, 3).join(' · ') || '추천'}</em> — 추천곡 {taste.recs.length}곡 보기
          </>
        ) : (
          <>10곡만 들어 보면, 수천 곡 중에서 내 취향에 맞는 곡을 골라 드려요</>
        )}
      </span>
      <span className="taste-banner__go" aria-hidden="true">
        →
      </span>
    </Link>
  )
}
