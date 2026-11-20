'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// 에디터 본인 브라우저는 방문 통계에서 빼요.
// - 관리자로 로그인한 채 사이트를 열면 자동으로 표시돼요.
// - 아무 주소 뒤에 ?notrack=1 을 붙여 열어도 표시되고, ?notrack=0 이면 다시 세요.
// Vercel 방문 분석도 같은 표시(va-disable)를 보고 빼요.
const ME = 'mm_notrack'
export function isMe() {
  try {
    return localStorage.getItem(ME) === '1'
  } catch {
    return false
  }
}
function markMe(on: boolean) {
  try {
    if (on) {
      localStorage.setItem(ME, '1')
      localStorage.setItem('va-disable', 'true')
    } else {
      localStorage.removeItem(ME)
      localStorage.removeItem('va-disable')
    }
  } catch {
    /* 저장소를 못 쓰는 브라우저 */
  }
}

export function sendTrack(data: Record<string, unknown>) {
  if (isMe()) return
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
    const flag = new URLSearchParams(window.location.search).get('notrack')
    if (flag === '1' || flag === '0') markMe(flag === '1')
    if (isMe()) return
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
    // 응답을 읽어서, 관리자 브라우저라고 하면 다음부터는 아예 보내지 않아요
    fetch('/track', { method: 'POST', body: JSON.stringify({ kind: 'page', first }), keepalive: true, headers: { 'Content-Type': 'application/json' } })
      .then((r) => (r.status === 200 ? r.json() : null))
      .then((j) => {
        if (j?.me) markMe(true)
      })
      .catch(() => {})
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
