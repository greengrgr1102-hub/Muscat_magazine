'use client'
import { useSyncExternalStore } from 'react'

// 방문자가 이 브라우저에서 한 번이라도 들은 곡 — 목록에 작은 점으로 표시해요. (로그인 없음)
const KEY = 'mm_played_v1'
const MAX = 5000
const EMPTY = new Set<number>()
let ids: Set<number> | null = null
const listeners = new Set<() => void>()

function load(): Set<number> {
  if (ids) return ids
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(KEY)
    ids = new Set(raw ? (JSON.parse(raw) as number[]) : [])
  } catch {
    ids = new Set()
  }
  return ids
}

export function markPlayed(id: number) {
  const cur = load()
  if (cur.has(id)) return
  const next = new Set(cur)
  next.add(id)
  ids = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...next].slice(-MAX)))
  } catch {
    /* 저장 실패는 넘어가요 */
  }
  listeners.forEach((l) => l())
}

export function usePlayed(): Set<number> {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    load,
    () => EMPTY,
  )
}

// 최근 들은 곡 (My 페이지용) — 곡 정보까지 최근 30곡만
export type RecentSong = {
  id: number
  track?: string | null
  artistName: string
  coverUrl?: string | null
  embed: string | null
  youtubeId?: string | null
  at: number
}
const RKEY = 'mm_recent_v1'
const REMPTY: RecentSong[] = []
let recent: RecentSong[] | null = null
const rListeners = new Set<() => void>()
function loadRecent(): RecentSong[] {
  if (recent) return recent
  if (typeof window === 'undefined') return REMPTY
  try {
    recent = JSON.parse(window.localStorage.getItem(RKEY) || '[]') as RecentSong[]
  } catch {
    recent = []
  }
  return recent
}
export function pushRecent(s: Omit<RecentSong, 'at'>) {
  const cur = loadRecent().filter((x) => x.id !== s.id)
  recent = [
    {
      id: s.id,
      track: s.track,
      artistName: s.artistName,
      coverUrl: s.coverUrl,
      embed: s.embed,
      youtubeId: s.youtubeId,
      at: Date.now(),
    },
    ...cur,
  ].slice(0, 30)
  try {
    window.localStorage.setItem(RKEY, JSON.stringify(recent))
  } catch {
    /* 무시 */
  }
  rListeners.forEach((l) => l())
}
export function useRecent(): RecentSong[] {
  return useSyncExternalStore(
    (cb) => {
      rListeners.add(cb)
      return () => rListeners.delete(cb)
    },
    loadRecent,
    () => REMPTY,
  )
}
