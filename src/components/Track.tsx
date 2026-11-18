'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function sendTrack(data: Record<string, unknown>) {
  try {
    const body = JSON.stringify(data)
    if (navigator.sendBeacon) navigator.sendBeacon('/track', new Blob([body], { type: 'application/json' }))
    else fetch('/track', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } })
  } catch {
    /* 통계는 실패해도 괜찮아요 */
  }
}

// 사이트 전체: 페이지가 바뀔 때마다 1회. 그날 처음 온 브라우저면 방문자 1명으로 셉니다.
export function PageTracker() {
  const path = usePathname()
  useEffect(() => {
    let first = false
    try {
      const k = 'mm_day'
      const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
      if (localStorage.getItem(k) !== today) {
        localStorage.setItem(k, today)
        first = true
      }
    } catch {
      /* 저장소를 못 쓰는 브라우저 */
    }
    sendTrack({ kind: 'page', first })
  }, [path])
  return null
}

// 글·추천곡 상세 페이지 조회
export function ViewTracker({ kind, id }: { kind: 'article' | 'pick'; id: number }) {
  useEffect(() => {
    sendTrack({ kind, id })
  }, [kind, id])
  return null
}
