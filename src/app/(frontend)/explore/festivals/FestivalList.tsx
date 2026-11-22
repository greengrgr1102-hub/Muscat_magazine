'use client'
import { useState } from 'react'
import type { Fest } from '@/lib/festivals'
import { myPlaylist, type Song } from '@/lib/myPlaylist'
import { toast } from '@/lib/toast'

const COUNTRY: Record<string, string> = {
  KR: '한국',
  JP: '일본',
  TW: '대만',
  TH: '태국',
  ID: '인도네시아',
}
const SHOW = 40 // 접혀 있을 때 보이는 팀 수

function dates(f: Fest) {
  const s = f.start.slice(5).replace('-', '.')
  const e = f.end && f.end !== f.start ? f.end.slice(5).replace('-', '.') : null
  return e ? `${s} – ${e}` : s
}

async function fetchSongs(names: string[]): Promise<Song[]> {
  const q = new URLSearchParams()
  names.forEach((n) => q.append('a', n))
  const r = await fetch(`/explore/festivals/songs?${q}`)
  if (!r.ok) return []
  return ((await r.json()).songs || []) as Song[]
}

export function FestivalList({ fests }: { fests: Fest[] }) {
  const countries = [...new Set(fests.map((f) => f.country).filter(Boolean) as string[])]
  const [c, setC] = useState<string>('')
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const [busy, setBusy] = useState<string>('')
  const list = c ? fests.filter((f) => f.country === c) : fests

  const play = async (key: string, names: string[], label: string) => {
    if (busy) return
    setBusy(key)
    try {
      const songs = await fetchSongs(names)
      if (!songs.length) toast('들을 수 있는 곡이 아직 없어요')
      else myPlaylist.play(songs, 0, label)
    } finally {
      setBusy('')
    }
  }

  if (!fests.length)
    return (
      <section className="wrap section">
        <p className="muted">아직 정리된 페스티벌이 없어요.</p>
      </section>
    )

  return (
    <section className="wrap section fest">
      {countries.length > 1 ? (
        <div className="fest__filter" role="group" aria-label="나라">
          <button
            type="button"
            className={`chip${!c ? ' chip--active' : ''}`}
            onClick={() => setC('')}
          >
            전체
          </button>
          {countries.map((x) => (
            <button
              key={x}
              type="button"
              className={`chip${c === x ? ' chip--active' : ''}`}
              onClick={() => setC(x)}
            >
              {COUNTRY[x] || x}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="fest__list">
        {list.map((f) => {
          const isOpen = open[f.id]
          let shown = 0
          return (
            <li key={f.id} className="fest-card">
              <header className="fest-card__head">
                <div>
                  <p className="label">
                    {dates(f)}
                    {f.country ? ` · ${COUNTRY[f.country] || f.country}` : ''}
                    {f.place ? ` · ${f.place}` : ''}
                  </p>
                  <h2 className="h-md">
                    {f.url ? (
                      <a href={f.url} target="_blank" rel="noreferrer">
                        {f.name}
                      </a>
                    ) : (
                      f.name
                    )}
                  </h2>
                  {f.nameAlt ? <p className="small muted">{f.nameAlt}</p> : null}
                </div>
                {f.matched.length ? (
                  <button
                    type="button"
                    className="fest-card__all"
                    disabled={busy === `all-${f.id}`}
                    onClick={() => play(`all-${f.id}`, f.matched, f.name)}
                  >
                    ▶ {f.matched.length}팀 한 곡씩 듣기
                  </button>
                ) : null}
              </header>
              <div className="fest-poster">
                {f.days.map((d, di) => {
                  // 접혀 있을 땐 앞쪽 팀 + 에디터가 들은 팀은 항상 보여요
                  const acts = d.acts
                    .map((a, i) => ({ a, i }))
                    .filter(({ a }) => isOpen || shown++ < SHOW || Boolean(a.artist))
                  if (!acts.length) return null
                  // 포스터처럼: 앞 순서일수록 크게 (여러 날이면 날마다 2팀·4팀, 하루면 3팀·5팀)
                  // 출연 순서가 없는 페스티벌은 모두 같은 크기
                  const multi = f.days.length > 1
                  const t1 = f.flat ? 0 : multi ? 2 : 3
                  const t2 = f.flat ? 0 : t1 + (multi ? 4 : 5)
                  const tiers = [
                    acts.filter(({ i }) => i < t1),
                    acts.filter(({ i }) => i >= t1 && i < t2),
                    acts.filter(({ i }) => i >= t2),
                  ]
                  return (
                    <div key={di} className="fest-day">
                      {d.label ? <p className="fest-day__label">{d.label}</p> : null}
                      {tiers.map((tier, ti) =>
                        tier.length ? (
                          <p key={ti} className={`fest-day__acts fest-tier fest-tier--${ti + 1}`}>
                            {tier.map(({ a, i }) => (
                              <span key={i} className="fest-act">
                                {a.artist ? (
                                  <button
                                    type="button"
                                    className="fest-act__on"
                                    title={`${a.artist} 듣기`}
                                    disabled={busy === `${f.id}-${a.artist}`}
                                    onClick={() =>
                                      play(
                                        `${f.id}-${a.artist}`,
                                        [a.artist!],
                                        `${f.name} · ${a.artist}`,
                                      )
                                    }
                                  >
                                    <span className="fest-dot" aria-hidden />
                                    {a.text}
                                  </button>
                                ) : (
                                  <span>{a.text}</span>
                                )}
                              </span>
                            ))}
                          </p>
                        ) : null,
                      )}
                    </div>
                  )
                })}
              </div>
              <footer className="fest-card__foot small muted">
                {f.total > SHOW ? (
                  <button
                    type="button"
                    className="fest-card__more"
                    onClick={() => setOpen((o) => ({ ...o, [f.id]: !isOpen }))}
                  >
                    {isOpen ? '접기' : `전체 ${f.total}팀 보기`}
                  </button>
                ) : (
                  <span>{f.total}팀</span>
                )}
                {f.partial ? <span>· 공개된 기사 기준 일부</span> : null}
              </footer>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
