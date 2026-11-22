'use client'
import { useEffect } from 'react'

// 로그인한 방문자의 My Room 기록(브라우저에 저장된 것)을 계정과 맞춰요.
// - 이 기기에서 처음 로그인하면: 기기 기록 + 계정 기록을 합쳐요 (아무것도 잃지 않게)
// - 다른 기기에서 바뀐 게 있으면 받아오고, 이 기기에서 바뀐 건 몇 초 뒤 올려요
const KEYS = {
  liked: 'mm_playlist_v1',
  played: 'mm_played_v1',
  recent: 'mm_recent_v1',
  taste: 'mm_taste_v1',
} as const
const OWNER = 'mm_room_owner'
const HASH = 'mm_room_hash'
const SYNCED = 'mm_room_synced'

type Song = { id: number; [k: string]: unknown }
type Room = {
  liked?: { name?: string; songs?: Song[] } | null
  played?: number[] | null
  recent?: (Song & { at: number })[] | null
  taste?: unknown
}

const ls = {
  get(k: string) {
    try {
      return window.localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v === null) window.localStorage.removeItem(k)
      else window.localStorage.setItem(k, v)
    } catch {
      /* 무시 */
    }
  },
}
const parse = <T,>(s: string | null, d: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : d
  } catch {
    return d
  }
}

function readLocal(): Room {
  return {
    liked: parse(ls.get(KEYS.liked), null),
    played: parse(ls.get(KEYS.played), null),
    recent: parse(ls.get(KEYS.recent), null),
    taste: parse(ls.get(KEYS.taste), null),
  }
}
function writeLocal(r: Room) {
  ls.set(KEYS.liked, r.liked ? JSON.stringify(r.liked) : null)
  ls.set(KEYS.played, r.played ? JSON.stringify(r.played) : null)
  ls.set(KEYS.recent, r.recent ? JSON.stringify(r.recent) : null)
  ls.set(KEYS.taste, r.taste ? JSON.stringify(r.taste) : null)
}
const hashOf = (r: Room) => {
  const s = JSON.stringify(r)
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return `${s.length}:${h}`
}

/** 두 기록 합치기 — 좋아요·들은 곡은 합집합, 최근 들은 곡은 시간순, 취향 결과는 있는 쪽 */
function merge(a: Room, b: Room): Room {
  const songs: Song[] = []
  const seen = new Set<number>()
  for (const s of [...(a.liked?.songs || []), ...(b.liked?.songs || [])]) {
    if (s && !seen.has(s.id)) {
      seen.add(s.id)
      songs.push(s)
    }
  }
  const played = [...new Set([...(a.played || []), ...(b.played || [])])].slice(-5000)
  const rmap = new Map<number, Song & { at: number }>()
  for (const s of [...(a.recent || []), ...(b.recent || [])]) {
    const cur = rmap.get(s.id)
    if (!cur || cur.at < s.at) rmap.set(s.id, s)
  }
  const recent = [...rmap.values()].sort((x, y) => y.at - x.at).slice(0, 50)
  return {
    liked:
      songs.length || a.liked || b.liked ? { name: a.liked?.name || b.liked?.name, songs } : null,
    played: played.length ? played : null,
    recent: recent.length ? recent : null,
    taste: a.taste || b.taste || null,
  }
}

async function push(r: Room) {
  const res = await fetch('/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room: r }),
  }).catch(() => null)
  if (!res?.ok) return false
  ls.set(HASH, hashOf(r))
  ls.set(SYNCED, String(Date.now()))
  return true
}

export function RoomSync() {
  useEffect(() => {
    if (!/(?:^|;\s*)mm_in=1/.test(document.cookie)) return
    let stop = false
    let timer: ReturnType<typeof setInterval> | null = null
    ;(async () => {
      const me = (await fetch('/me', { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => null)) as {
        member: { email: string } | null
        room: Room | null
        updatedAt?: string
      } | null
      if (stop || !me?.member) return
      const local = readLocal()
      const server: Room = me.room || {}
      const owner = ls.get(OWNER)
      let next: Room
      if (owner !== me.member.email) {
        // 이 기기에서 이 계정으로 처음 — 합쳐요
        next = merge(server, local)
        ls.set(OWNER, me.member.email)
      } else {
        const localChanged = ls.get(HASH) !== hashOf(local)
        const serverNewer = me.updatedAt
          ? Date.parse(me.updatedAt) > Number(ls.get(SYNCED) || 0)
          : false
        next = localChanged ? local : serverNewer ? server : local
      }
      const changedHere = hashOf(next) !== hashOf(local)
      if (changedHere) writeLocal(next)
      await push(next)
      // 받아온 기록을 화면에 보이려면 한 번 새로 고쳐요
      if (changedHere && !stop) window.location.reload()
      // 이후로는 바뀐 게 있으면 올려요
      timer = setInterval(() => {
        const cur = readLocal()
        if (ls.get(HASH) !== hashOf(cur)) void push(cur)
      }, 5000)
    })()
    return () => {
      stop = true
      if (timer) clearInterval(timer)
    }
  }, [])
  return null
}
