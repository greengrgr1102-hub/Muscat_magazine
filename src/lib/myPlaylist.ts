'use client'
import { useSyncExternalStore } from 'react'

// 방문자의 "좋아요한 곡"(예전 이름: 내 플리) — 로그인 없이 그 브라우저에 저장돼요.
// 어디서든 useMyPlaylist()로 읽고, myPlaylist.add() 등으로 바꿔요.
// 아래 재생바의 상태(player)도 여기서 관리하고, 다시 들어와도 이어 듣도록 따로 저장해요.

export type Song = {
  id: number
  track?: string | null
  artistName: string
  coverUrl?: string | null
  embed: string | null
  youtubeId?: string | null
}

export type Player = {
  queue: Song[]
  index: number
  label: string
  /** true면 재생바만 떠 있고 플레이어(영상)는 내려 둔 상태 — ▶를 누르면 이어서 재생 */
  idle: boolean
}

type State = {
  name: string
  songs: Song[]
  // 지금 재생 중인 목록(좋아요한 곡일 수도, 에디터 플리·Editor's Picks 목록일 수도)
  player: Player | null
}

const KEY = 'mm_playlist_v1'
const PKEY = 'mm_player_v1'
export const DEFAULT_NAME = '좋아요한 곡'
let state: State = { name: DEFAULT_NAME, songs: [], player: null }
let loaded = false
const listeners = new Set<() => void>()

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<State>
      const nm = !saved.name || saved.name === '내 플리' ? DEFAULT_NAME : saved.name
      state = { name: nm, songs: Array.isArray(saved.songs) ? saved.songs : [], player: null }
    }
    // 지난번에 듣던 재생바 (멈춘 상태로 되살려요)
    const rawP = window.localStorage.getItem(PKEY)
    if (rawP) {
      const p = JSON.parse(rawP) as { queue?: Song[]; index?: number; label?: string }
      if (Array.isArray(p.queue) && p.queue.length) {
        state.player = { queue: p.queue, index: Math.min(Math.max(0, p.index || 0), p.queue.length - 1), label: p.label || DEFAULT_NAME, idle: true }
      }
    }
  } catch {
    /* 저장소를 못 쓰는 브라우저 */
  }
}

function set(next: Partial<State>, resetTime = false) {
  state = { ...state, ...next }
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ name: state.name, songs: state.songs }))
    if ('player' in next) {
      const p = state.player
      if (!p) window.localStorage.removeItem(PKEY)
      else {
        // 대기열은 앞뒤로 잘라서 가볍게 저장 (지금 곡 기준 앞 20곡 · 뒤 180곡)
        const from = Math.max(0, p.index - 20)
        const t = resetTime ? 0 : savedTime()
        window.localStorage.setItem(
          PKEY,
          JSON.stringify({ queue: p.queue.slice(from, from + 200), index: p.index - from, label: p.label, t }),
        )
      }
    }
  } catch {
    /* 저장 실패는 조용히 넘어가요 */
  }
  listeners.forEach((l) => l())
}

/** 지금 곡을 몇 초까지 들었는지 (이어 듣기용) */
export function savedTime(): number {
  try {
    const p = JSON.parse(window.localStorage.getItem(PKEY) || '{}') as { t?: number }
    return Number(p.t) || 0
  } catch {
    return 0
  }
}
function saveTime(t: number) {
  try {
    const p = JSON.parse(window.localStorage.getItem(PKEY) || 'null') as Record<string, unknown> | null
    if (p) window.localStorage.setItem(PKEY, JSON.stringify({ ...p, t: Math.floor(t) }))
  } catch {
    /* 무시 */
  }
}

const clean = (s: Song): Song => ({ id: s.id, track: s.track, artistName: s.artistName, coverUrl: s.coverUrl, embed: s.embed })

export const myPlaylist = {
  get: () => (load(), state),
  has: (id: number) => (load(), state.songs.some((s) => s.id === id)),
  add(song: Song) {
    load()
    if (state.songs.some((s) => s.id === song.id)) return false
    set({ songs: [...state.songs, clean(song)] })
    return true
  },
  addMany(songs: Song[]) {
    load()
    const have = new Set(state.songs.map((s) => s.id))
    const fresh = songs.filter((s) => !have.has(s.id)).map(clean)
    if (fresh.length) set({ songs: [...state.songs, ...fresh] })
    return fresh.length
  },
  remove(id: number) {
    load()
    set({ songs: state.songs.filter((s) => s.id !== id) })
  },
  toggle(song: Song) {
    return myPlaylist.has(song.id) ? (myPlaylist.remove(song.id), false) : myPlaylist.add(song)
  },
  move(id: number, dir: -1 | 1) {
    load()
    const i = state.songs.findIndex((s) => s.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= state.songs.length) return
    const songs = [...state.songs]
    ;[songs[i], songs[j]] = [songs[j], songs[i]]
    set({ songs })
  },
  rename(name: string) {
    load()
    set({ name: name.trim().slice(0, 40) || DEFAULT_NAME })
  },
  clear() {
    load()
    set({ songs: [] })
  },
  // 재생 — queue는 지금 보던 목록 전체, index는 누른 곡
  play(queue: Song[], index = 0, label = DEFAULT_NAME) {
    load()
    const target = queue[index]
    const q = queue
      .filter((s) => s.embed)
      .map((s) => ({ id: s.id, track: s.track, artistName: s.artistName, coverUrl: s.coverUrl, embed: s.embed, youtubeId: s.youtubeId }))
    if (!q.length) return
    const i = target ? Math.max(0, q.findIndex((s) => s.id === target.id)) : 0
    set({ player: { queue: q, index: Math.min(i, q.length - 1), label, idle: false } }, true)
  },
  /** 내려 둔 재생바를 다시 재생 */
  resume() {
    if (state.player) set({ player: { ...state.player, idle: false } })
  },
  step(dir: -1 | 1) {
    const p = state.player
    if (!p) return
    const index = p.index + dir
    if (index < 0) return
    // 마지막 곡이 끝나면 재생바는 그대로 두고 멈춰요
    if (index >= p.queue.length) return set({ player: { ...p, idle: true } }, true)
    set({ player: { ...p, index, idle: false } }, true)
  },
  jump(index: number) {
    const p = state.player
    if (!p || index < 0 || index >= p.queue.length) return
    set({ player: { ...p, index, idle: false } }, true)
  },
  /** 대기열에서 한 곡 빼기 (지금 곡은 못 빼요) */
  dequeue(index: number) {
    const p = state.player
    if (!p || index === p.index) return
    const queue = p.queue.filter((_, i) => i !== index)
    set({ player: { ...p, queue, index: index < p.index ? p.index - 1 : p.index } })
  },
  /** 다른 플레이어가 소리를 내기 시작할 때 등: 재생바는 남기고 플레이어만 내려요 */
  stop(t?: number) {
    if (!state.player || state.player.idle) return
    if (t !== undefined) saveTime(t)
    set({ player: { ...state.player, idle: true } })
  },
  /** × — 재생바를 닫고 이어 듣기 기록도 지워요 */
  close() {
    set({ player: null })
  },
  saveTime,
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}
const serverState: State = { name: DEFAULT_NAME, songs: [], player: null }

export function useMyPlaylist() {
  return useSyncExternalStore(subscribe, myPlaylist.get, () => serverState)
}

// 공유 링크: /share?n=이름&ids=1.2.3 (숫자는 36진수로 짧게)
export function shareUrl(name: string, songs: Song[]) {
  const ids = songs.map((s) => s.id.toString(36)).join('.')
  const q = new URLSearchParams({ n: name, ids })
  return `${window.location.origin}/share?${q}`
}
