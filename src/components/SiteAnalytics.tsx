'use client'
import { Analytics } from '@vercel/analytics/next'

// Vercel 방문 분석 — 에디터 본인 브라우저(「나는 빼 줘」 표시)는 보내지 않아요.
export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        try {
          if (localStorage.getItem('mm_notrack') === '1') return null
        } catch {
          /* 저장소를 못 쓰는 브라우저 */
        }
        return event
      }}
    />
  )
}
