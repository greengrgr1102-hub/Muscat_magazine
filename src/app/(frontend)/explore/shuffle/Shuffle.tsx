'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { AddButton } from '@/components/AddButton'
import { SongPlayer } from '@/components/SongPlayer'

type Opt = { v: string; label: string }
type Song = {
  id: number
  track?: string | null
  artistName: string
  album?: string | null
  coverUrl?: string | null
  embed: string | null
  youtubeId?: string | null
  releaseDate?: string | null
  genres: { name: string; slug: string }[]
}

// 들은 곡은 이 브라우저에 기억해 두고, 다음엔 안 들은 곡부터 골라요
const KEY = 'mm_heard'
const readHeard = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}
const writeHeard = (ids: number[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(-2000)))
  } catch {
    /* 저장이 막힌 브라우저 */
  }
}

export function Shuffle({ genres, countries, eras }: { genres: { slug: string; name: string }[]; countries: Opt[]; eras: Opt[] }) {
  const [g, setG] = useState('')
  const [c, setC] = useState('')
  const [era, setEra] = useState('')
  const [song, setSong] = useState<Song | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [heard, setHeard] = useState(0)
  const [busy, setBusy] = useState(false)
  const [allHeard, setAllHeard] = useState(false)

  useEffect(() => setHeard(readHeard().length), [])

  const next = useCallback(async () => {
    setBusy(true)
    const h = readHeard()
    const p = new URLSearchParams()
    if (g) p.set('g', g)
    if (c) p.set('c', c)
    if (era) p.set('era', era)
    if (h.length) p.set('x', h.slice(-400).join(','))
    const r = await fetch(`/explore/shuffle/next?${p}`)
      .then((x) => x.json() as Promise<{ song: Song | null; total: number; fresh?: boolean }>)
      .catch(() => null)
    setBusy(false)
    if (!r) return
    setTotal(r.total)
    setAllHeard(Boolean(r.song) && r.fresh === false)
    setSong(r.song)
    if (r.song) {
      const list = [...readHeard().filter((x) => x !== r.song!.id), r.song.id]
      writeHeard(list)
      setHeard(list.length)
    }
  }, [g, c, era])

  const chips = (opts: Opt[], value: string, set: (v: string) => void) => (
    <div className="chips chips--wrap">
      <button type="button" className={`chip${value === '' ? ' chip--active' : ''}`} onClick={() => set('')}>
        상관없음
      </button>
      {opts.map((o) => (
        <button key={o.v} type="button" className={`chip${value === o.v ? ' chip--active' : ''}`} onClick={() => set(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  )

  return (
    <section className="wrap section shuffle">
      <div className="shuffle__opts">
        <label className="shuffle__row">
          <span className="label">장르</span>
          <select value={g} onChange={(e) => setG(e.target.value)} aria-label="장르">
            <option value="">상관없음</option>
            {genres.map((x) => (
              <option key={x.slug} value={x.slug}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <div className="shuffle__row">
          <span className="label">나라</span>
          {chips(countries, c, setC)}
        </div>
        <div className="shuffle__row">
          <span className="label">시대</span>
          {chips(eras, era, setEra)}
        </div>
        <div className="my-actions">
          <button type="button" className="btn btn--filled" onClick={next} disabled={busy}>
            <span>{busy ? '고르는 중…' : song ? '▶ 다른 곡' : '▶ 아무거나 틀어줘'}</span>
          </button>
          {heard ? <span className="small muted">지금까지 이 브라우저에서 {heard}곡 들었어요</span> : null}
        </div>
      </div>

      {total === 0 ? <p className="muted">이 조건에 맞는 곡이 없어요. 조건을 조금 풀어 보세요.</p> : null}
      {song ? (
        <div className="shuffle__now">
          <div className="shuffle__player">
            {song.embed ? (
              <SongPlayer
                key={song.id}
                pickId={song.id}
                embed={song.embed}
                youtubeId={song.youtubeId}
                title={`${song.track || ''} — ${song.artistName}`}
                autoPlay
                onEnded={next}
              />
            ) : null}
          </div>
          <div className="shuffle__info">
            <p className="label">
              {allHeard ? '조건에 맞는 곡은 다 들었어요 · 다시 한 바퀴' : `조건에 맞는 ${total ?? 0}곡 중에서`}
            </p>
            <h2 className="h-lg">{song.track || 'Untitled'}</h2>
            <p className="muted">{[song.artistName, song.album].filter(Boolean).join(' · ')}</p>
            {song.genres.length ? (
              <div className="chips chips--wrap">
                {song.genres.slice(0, 6).map((x) => (
                  <Link key={x.slug} href={`/genres/${x.slug}`} className="chip chip--link">
                    {x.name}
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="my-actions">
              <AddButton song={song} />
              <Link href={`/picks/${song.id}`} className="arrow-link">
                <span>곡 페이지</span>
              </Link>
              <Link href={`/web/${song.id}`} className="arrow-link">
                <span>여기서 거미줄</span>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
