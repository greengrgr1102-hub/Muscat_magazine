'use client'
// 방문자가 찾은 취향 — 그 브라우저에만 저장돼요.
export type TasteSong = {
  id: number
  track?: string | null
  artistName: string
  coverUrl?: string | null
  embed: string | null
  genres: string[]
}
export type Taste = { genres: string[]; era: string | null; liked: TasteSong[]; recs: TasteSong[]; at: number }

const KEY = 'mm_taste_v1'
export function loadTaste(): Taste | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Taste) : null
  } catch {
    return null
  }
}
export function saveTaste(t: Taste) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(t))
  } catch {
    /* 저장 실패는 조용히 */
  }
}
