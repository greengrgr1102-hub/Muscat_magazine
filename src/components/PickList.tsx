'use client'
import Link from 'next/link'
import { myPlaylist, useMyPlaylist } from '@/lib/myPlaylist'
import { usePlayed } from '@/lib/played'
import { AddButton } from './AddButton'
import { releaseShort } from '@/lib/format'

export type PickRow = {
  id: number
  track?: string | null
  artistName: string
  coverUrl?: string | null
  pickedAt?: string | null
  releaseDate?: string | null
  comment?: string | null
  embed: string | null
  youtubeId?: string | null
}

// Spotify 커버는 640px짜리라, 목록에서는 64px짜리 주소로 바꿔서 가볍게 불러옵니다.
const small = (u?: string | null) => (u ? u.replace('ab67616d0000b273', 'ab67616d00004851') : null)

const monthOf = (d?: string | null) => {
  if (!d) return '날짜 없음'
  const k = new Date(new Date(d).getTime() + 9 * 3600_000)
  return `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월`
}

// 한 줄에 한 곡씩: 작은 커버 · 곡 · 아티스트 · 날짜 · 하트
// 커버를 누르면 아래 재생바에서 재생되고, 이 목록이 그대로 대기열이 돼요.
export function PickList({
  rows,
  groupByMonth = true,
  label = "Editor's Picks",
}: {
  rows: PickRow[]
  groupByMonth?: boolean
  /** 재생바에 보일 대기열 이름 */
  label?: string
}) {
  const { player } = useMyPlaylist()
  const played = usePlayed()
  const nowId = player && !player.idle ? player.queue[player.index]?.id : null
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
              const isNow = nowId === r.id
              const title = `${r.track || 'Untitled'} — ${r.artistName}`
              return (
                <li key={r.id} className={`plist__row${isNow ? ' plist__row--open plist__row--now' : ''}`}>
                  <div className="plist__line">
                    <button
                      type="button"
                      className="plist__cover"
                      disabled={!r.embed}
                      aria-label={isNow ? `${title} 재생 중` : `${title} 듣기`}
                      onClick={() => {
                        if (isNow) return
                        myPlaylist.play(rows, rows.indexOf(r), label)
                      }}
                    >
                      {r.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={small(r.coverUrl) || ''} alt="" loading="lazy" width={48} height={48} />
                      ) : null}
                      <span className="plist__play" aria-hidden="true">
                        {isNow ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4 10h3v10H4zM10.5 5h3v15h-3zM17 12h3v8h-3z" />
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
                        {played.has(r.id) && !isNow ? <span className="plist__heard" title="들은 곡" aria-label="들은 곡" /> : null}
                      </Link>
                      <span className="plist__artist">{r.artistName}</span>
                      {r.comment ? <span className="plist__comment">{r.comment}</span> : null}
                    </div>
                    <span className="plist__date" title={r.releaseDate ? '발매' : undefined}>
                      {releaseShort(r.releaseDate)}
                    </span>
                    <AddButton song={r} compact />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
