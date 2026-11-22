'use client'
import { useEffect, useRef, useState } from 'react'
import type { Fest } from '@/lib/festivals'
import { myPlaylist, type Song } from '@/lib/myPlaylist'
import { toast } from '@/lib/toast'

export const COUNTRY: Record<string, string> = {
  KR: '한국',
  JP: '일본',
  TW: '대만',
  TH: '태국',
  ID: '인도네시아',
}

function dates(f: Fest) {
  const s = f.start.slice(5).replace('-', '.')
  const e = f.end && f.end !== f.start ? f.end.slice(5).replace('-', '.') : null
  return e ? `${s} – ${e}` : s
}

// 카드에 보일 대표 팀: 날(무대)마다 맨 앞 팀부터 돌아가며 3팀
function headliners(f: Fest, n = 3) {
  const out: string[] = []
  const strip = (t: string) =>
    t
      .replace(/\s*\[[^\]]*\]\s*/g, ' ')
      .replace(/\s*[（(][^）)]*[）)]\s*$/, '')
      .trim()
  for (let i = 0; out.length < n && i < 20; i++)
    for (const d of f.days) {
      const a = d.acts[i]
      if (a && out.length < n && !out.includes(strip(a.text))) out.push(strip(a.text))
    }
  return out
}

async function fetchSongs(names: string[]): Promise<Song[]> {
  const q = new URLSearchParams()
  names.forEach((n) => q.append('a', n))
  const r = await fetch(`/explore/festivals/songs?${q}`)
  if (!r.ok) return []
  return ((await r.json()).songs || []) as Song[]
}

export function FestivalList({ fests }: { fests: Fest[] }) {
  const [openId, setOpenId] = useState<number | null>(null)
  const [busy, setBusy] = useState<string>('')
  const dialog = useRef<HTMLDialogElement>(null)
  const list = fests
  const cur = fests.find((f) => f.id === openId) || null

  // 카드를 누르면 팝업으로 전체 라인업
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (cur && !d.open) d.showModal()
    if (!cur && d.open) d.close()
  }, [cur])

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
      <h2 className="fstat__h fest__h">라인업</h2>
      <ul className="fest-grid">
        {list.map((f) => (
          <li key={f.id}>
            <button type="button" className="fest-tile" onClick={() => setOpenId(f.id)}>
              <span className="fest-tile__date">
                {dates(f)}
                {f.country ? ` · ${COUNTRY[f.country] || f.country}` : ''}
              </span>
              <span className="fest-tile__name">
                {f.name.replace(/\s*(20\d\d|[’']\d\d)\s*$/, '')}
              </span>
              <span className="fest-tile__heads">{headliners(f).join(' · ')}</span>
              <span className="fest-tile__foot">
                <span>
                  {f.total}팀{f.partial ? ' · 일부' : ''}
                </span>
                {f.matched.length ? (
                  <span className="fest-tile__heard">
                    <span className="fest-dot" aria-hidden />
                    {f.matched.length}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        className="fest-modal"
        aria-label={cur?.name || '페스티벌'}
        onClose={() => setOpenId(null)}
        onClick={(e) => {
          // 바깥(어두운 배경)을 누르면 닫기
          if (e.target === e.currentTarget) setOpenId(null)
        }}
      >
        {cur ? (
          <div className="fest-modal__in">
            <header className="fest-card__head">
              <div>
                <p className="label">
                  {dates(cur)}
                  {cur.country ? ` · ${COUNTRY[cur.country] || cur.country}` : ''}
                  {cur.place ? ` · ${cur.place}` : ''}
                </p>
                <h2 className="h-md">
                  {cur.url ? (
                    <a href={cur.url} target="_blank" rel="noreferrer">
                      {cur.name}
                    </a>
                  ) : (
                    cur.name
                  )}
                </h2>
                {cur.nameAlt ? <p className="small muted">{cur.nameAlt}</p> : null}
              </div>
              <button
                type="button"
                className="fest-modal__x"
                aria-label="닫기"
                onClick={() => setOpenId(null)}
              >
                ✕
              </button>
            </header>
            {cur.matched.length ? (
              <button
                type="button"
                className="fest-card__all"
                disabled={busy === `all-${cur.id}`}
                onClick={() => play(`all-${cur.id}`, cur.matched, cur.name)}
              >
                ▶ {cur.matched.length}팀 한 곡씩 듣기
              </button>
            ) : null}
            <div className="fest-poster">
              {cur.days.map((d, di) => {
                // 포스터처럼: 앞 순서일수록 크게 (여러 날이면 날마다 2팀·4팀, 하루면 3팀·5팀)
                // 출연 순서가 없는 페스티벌은 모두 같은 크기
                const multi = cur.days.length > 1
                const t1 = cur.flat ? 0 : multi ? 2 : 3
                const t2 = cur.flat ? 0 : t1 + (multi ? 4 : 5)
                const acts = d.acts.map((a, i) => ({ a, i }))
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
                                  disabled={busy === `${cur.id}-${a.artist}`}
                                  onClick={() =>
                                    play(
                                      `${cur.id}-${a.artist}`,
                                      [a.artist!],
                                      `${cur.name} · ${a.artist}`,
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
              <span>{cur.total}팀</span>
              {cur.partial ? <span>· 공개된 기사 기준 일부</span> : null}
            </footer>
          </div>
        ) : null}
      </dialog>
    </section>
  )
}
