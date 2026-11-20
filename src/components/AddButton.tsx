'use client'
import { myPlaylist, useMyPlaylist, type Song } from '@/lib/myPlaylist'
import { toast } from '@/lib/toast'
import { sendTrack } from './Track'

const HEART = 'M12 20.2s-7.2-4.5-7.2-10.2a4.1 4.1 0 0 1 7.2-2.7 4.1 4.1 0 0 1 7.2 2.7c0 5.7-7.2 10.2-7.2 10.2z'

/** 좋아요 켜고 끄기 — 좋아요한 곡 목록에 넣거나 빼고, 몇 명이 눌렀는지만 익명으로 세요(숫자는 관리자만). */
export function toggleLike(song: Song) {
  const added = myPlaylist.toggle(song)
  sendTrack({ kind: 'like', id: song.id, on: Boolean(added) })
  if (added)
    toast({
      text: '좋아요한 곡에 담았어요',
      undo: () => {
        myPlaylist.remove(song.id)
        sendTrack({ kind: 'like', id: song.id, on: false })
      },
    })
}

// 하트 — 누르면 좋아요한 곡에 넣거나 빼요. (예전의 「+ 담기」 자리)
export function AddButton({
  song,
  compact = false,
  className = '',
  tone = 'light',
}: {
  song: Song
  compact?: boolean
  className?: string
  /** 'dark' = 검은 재생바 위 */
  tone?: 'light' | 'dark'
}) {
  const { songs } = useMyPlaylist()
  const on = songs.some((s) => s.id === song.id)
  const name = song.track || 'Untitled'
  return (
    <button
      type="button"
      className={`add-btn heart-btn${on ? ' add-btn--on' : ''}${compact ? ' add-btn--compact' : ''}${tone === 'dark' ? ' heart-btn--dark' : ''} ${className}`}
      aria-pressed={on}
      aria-label={on ? `${name} 좋아요 취소` : `${name} 좋아요`}
      title={on ? '좋아요 취소' : '좋아요 — 좋아요한 곡에 담아요'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleLike(song)
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d={HEART} fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      {compact ? null : <span>{on ? '좋아요함' : '좋아요'}</span>}
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
        if (n) toast(`${n}곡을 좋아요한 곡에 담았어요`)
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
