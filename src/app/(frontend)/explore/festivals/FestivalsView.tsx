'use client'
import { useState } from 'react'
import type { Fest } from '@/lib/festivals'
import type { FestStats } from '@/lib/festivalShared'
import { COUNTRY, FestivalList } from './FestivalList'
import { FestivalStats } from './FestivalStats'

// 나라 칩 하나로 통계와 페스티벌 카드를 같이 거르기
export function FestivalsView({
  fests,
  stats,
}: {
  fests: Fest[]
  stats: Record<string, FestStats>
}) {
  const countries = Object.keys(stats).filter(Boolean)
  const [c, setC] = useState('')
  const list = c ? fests.filter((f) => f.country === c) : fests
  return (
    <>
      {countries.length > 1 ? (
        <div className="wrap fest__filter fest__filter--top" role="group" aria-label="나라">
          <button
            type="button"
            className={`chip${!c ? ' chip--active' : ''}`}
            aria-pressed={!c}
            onClick={() => setC('')}
          >
            전체 <span className="chip__n">{fests.length}</span>
          </button>
          {countries.map((x) => (
            <button
              key={x}
              type="button"
              className={`chip${c === x ? ' chip--active' : ''}`}
              aria-pressed={c === x}
              onClick={() => setC(x)}
            >
              {COUNTRY[x] || x} <span className="chip__n">{stats[x].fests}</span>
            </button>
          ))}
        </div>
      ) : null}
      <FestivalStats s={stats[c] || stats['']} />
      <FestivalList fests={list} />
    </>
  )
}
