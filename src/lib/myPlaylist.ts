'use client'
import { useSyncExternalStore } from 'react'

// 방문자의 "내 플리" — 로그인 없이 그 브라우저에 저장돼요.
// 어디서든 useMyPlaylist()로 읽고, myPlaylist.add() 등으로 바꿔요.

export type Song = {
  id: number
  track?: string | null
  artistName: string
  coverUrl?: string | null
  embed: string | null
  youtubeId?: string | null
}

type State = {
  name: string
  songs: Song[]
  // 지금 재생 중인 목록(내 플리일 수도, 에디터 플리일 수도)
  player: { queue: Song[]; index: number; label: string } | null
}

const KEY = 'mm_playlist_v1'
const DEFAULT_NAME = '내 플리'
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
      state = { name: saved.name || DEFAULT_NAME, songs: Array.isArray(saved.songs) ? saved.songs : [], player: null }
    }
  } catch {
    /* 저장소를 못 쓰는 브라우저 */
  }
}

function set(next: Partial<State>) {
  state = { ...state, ...next }
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ name: state.name, songs: state.songs }))
  } catch {
    /* 저장 실패는 조용히 넘어가요 */
  }
  listeners.forEach((l) => l())
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
  // 재생
  play(queue: Song[], index = 0, label = DEFAULT_NAME) {
    load()
    const q = queue.filter((s) => s.embed)
    if (!q.length) return
    set({ player: { queue: q, index: Math.min(Math.max(0, index), q.length - 1), label } })
  },
  step(dir: -1 | 1) {
    const p = state.player
    if (!p) return
    const index = p.index + dir
    if (index < 0 || index >= p.queue.length) return set({ player: dir > 0 ? null : p })
    set({ player: { ...p, index } })
  },
  stop() {
    set({ player: null })
  },
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
