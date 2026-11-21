'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

/** 거미줄 출발점(곡·앨범)을 다시 뽑아요 */
export default function Reshuffle() {
  const router = useRouter()
  const [busy, start] = useTransition()
  return (
    <button
      type="button"
      className="seed-shuffle"
      onClick={() => start(() => router.refresh())}
      disabled={busy}
      aria-label="다른 곡·앨범으로 다시 뽑기"
    >
      ↻ {busy ? '뽑는 중' : '다시 뽑기'}
    </button>
  )
}
