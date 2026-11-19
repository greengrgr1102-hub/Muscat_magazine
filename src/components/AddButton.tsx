'use client'
import { myPlaylist, useMyPlaylist, type Song } from '@/lib/myPlaylist'

// 「+ 담기」 / 「✓ 담김」 — 누르면 내 플리에 넣거나 빼요.
export function AddButton({ song, compact = false, className = '' }: { song: Song; compact?: boolean; className?: string }) {
  const { songs } = useMyPlaylist()
  const inList = songs.some((s) => s.id === song.id)
  const name = song.track || 'Untitled'
  return (
    <button
      type="button"
      className={`add-btn${inList ? ' add-btn--on' : ''}${compact ? ' add-btn--compact' : ''} ${className}`}
      aria-pressed={inList}
      aria-label={inList ? `${name} 내 플리에서 빼기` : `${name} 내 플리에 담기`}
      title={inList ? '내 플리에서 빼기' : '내 플리에 담기'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        myPlaylist.toggle(song)
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        {inList ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 5v14M5 12h14" />}
      </svg>
      {compact ? null : <span>{inList ? '담김' : '담기'}</span>}
    </button>
  )
}

// 여러 곡을 한 번에 담기 (에디터 플리·공유 플리·추천 결과)
export function AddAllButton({ songs, label = '통째로 담기' }: { songs: Song[]; label?: string }) {
  const { songs: mine } = useMyPlaylist()
  const have = new Set(mine.map((s) => s.id))
  const left = songs.filter((s) => !have.has(s.id)).length
  return (
    <button
      type="button"
      className="btn btn--filled"
      disabled={!left}
      onClick={() => {
        const n = myPlaylist.addMany(songs)
        if (n) window.dispatchEvent(new CustomEvent('mm-toast', { detail: `${n}곡을 내 플리에 담았어요` }))
      }}
    >
      <span>{left ? `${label} (${left}곡)` : '모두 담겨 있어요'}</span>
    </button>
  )
}

export function PlayAllButton({ songs, label }: { songs: Song[]; label: string }) {
  return (
    <button type="button" className="btn btn--outline" disabled={!songs.length} onClick={() => myPlaylist.play(songs, 0, label)}>
      <span>▶ 전체 듣기</span>
    </button>
  )
}
