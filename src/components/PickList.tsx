'use client'
import Link from 'next/link'
import { useState } from 'react'
import { sendTrack } from './Track'

export type PickRow = {
  id: number
  track?: string | null
  artistName: string
  coverUrl?: string | null
  pickedAt?: string | null
  comment?: string | null
  embed: string | null
}

// Spotify 커버는 640px짜리라, 목록에서는 64px짜리 주소로 바꿔서 가볍게 불러옵니다.
const small = (u?: string | null) => (u ? u.replace('ab67616d0000b273', 'ab67616d00004851') : null)

const monthOf = (d?: string | null) => {
  if (!d) return '날짜 없음'
  const k = new Date(new Date(d).getTime() + 9 * 3600_000)
  return `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월`
}
const dayOf = (d?: string | null) => {
  if (!d) return ''
  const k = new Date(new Date(d).getTime() + 9 * 3600_000)
  return `${String(k.getUTCMonth() + 1).padStart(2, '0')}.${String(k.getUTCDate()).padStart(2, '0')}`
}

// 한 줄에 한 곡씩: 작은 커버(누르면 바로 아래에서 재생) · 곡 · 아티스트 · 날짜
export function PickList({ rows, groupByMonth = true }: { rows: PickRow[]; groupByMonth?: boolean }) {
  const [open, setOpen] = useState<number | null>(null)
  const groups: { title: string; rows: PickRow[] }[] = []
  for (const r of rows) {
    const t = groupByMonth ? monthOf(r.pickedAt) : ''
    const last = groups.at(-1)
    if (last && last.title === t) last.rows.push(r)
    else groups.push({ title: t, rows: [r] })
  }
  return (
    <div className="plist">
      {groups.map((g, gi) => (
        <section key={`${g.title}-${gi}`} className="plist__group">
          {g.title ? <h3 className="label plist__month">{g.title}</h3> : null}
          <ul className="plist__rows">
            {g.rows.map((r) => {
              const isOpen = open === r.id
              const title = `${r.track || 'Untitled'} — ${r.artistName}`
              return (
                <li key={r.id} className={`plist__row${isOpen ? ' plist__row--open' : ''}`}>
                  <div className="plist__line">
                    <button
                      type="button"
                      className="plist__cover"
                      disabled={!r.embed}
                      aria-label={isOpen ? `${title} 플레이어 닫기` : `${title} 듣기`}
                      onClick={() => {
                        setOpen(isOpen ? null : r.id)
                        if (!isOpen) sendTrack({ kind: 'play', id: r.id })
                      }}
                    >
                      {r.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={small(r.coverUrl) || ''} alt="" loading="lazy" width={48} height={48} />
                      ) : null}
                      <span className="plist__play" aria-hidden="true">
                        {isOpen ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5.5v13l11-6.5z" />
                          </svg>
                        )}
                      </span>
                    </button>
                    <div className="plist__text">
                      <Link href={`/picks/${r.id}`} className="plist__track">
                        {r.track || 'Untitled'}
                      </Link>
                      <span className="plist__artist">{r.artistName}</span>
                      {r.comment ? <span className="plist__comment">{r.comment}</span> : null}
                    </div>
                    <span className="plist__date">{dayOf(r.pickedAt)}</span>
                  </div>
                  {isOpen && r.embed ? (
                    <iframe
                      className="plist__player"
                      src={r.embed}
                      title={`Spotify 플레이어: ${title}`}
                      width="100%"
                      height="80"
                      loading="lazy"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    />
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
