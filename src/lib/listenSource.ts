'use client'
import { useSyncExternalStore } from 'react'

// 어떤 플레이어로 들을지: 'youtube'(누구나 전체 듣기) / 'spotify'(로그인하면 전체, 아니면 30초)
export type Source = 'youtube' | 'spotify'
const KEY = 'mm_source'
const listeners = new Set<() => void>()

function read(): Source {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'spotify' ? 'spotify' : 'youtube'
  } catch {
    return 'youtube'
  }
}

export function setSource(s: Source) {
  try {
    localStorage.setItem(KEY, s)
  } catch {}
  listeners.forEach((l) => l())
}

export function useSource(): Source {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => 'youtube',
  )
}

// 곡 ID → YouTube 영상 ID (한 번 물어본 건 기억)
const cache = new Map<number, Promise<string | null>>()
export function youtubeFor(pickId: number, known?: string | null): Promise<string | null> {
  if (known) return Promise.resolve(known)
  let p = cache.get(pickId)
  if (!p) {
    p = fetch(`/youtube/resolve?pick=${pickId}`)
      .then((r) => (r.ok ? r.json() : { id: null }))
      .then((j: { id?: string | null }) => j.id || null)
      .catch(() => null)
    cache.set(pickId, p)
  }
  return p
}

export function reportBadVideo(pickId: number, videoId: string) {
  cache.set(pickId, Promise.resolve(null))
  fetch(`/youtube/resolve?pick=${pickId}&bad=${videoId}`).catch(() => {})
}
