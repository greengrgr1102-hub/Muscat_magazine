'use client'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { myPlaylist, type Song } from '@/lib/myPlaylist'

// 인디 워들 — 앨범 모드.
// 하루에 한 장, 같은 날·같은 범위면 누구나 같은 정답이에요. 앨범을 넣으면 정답과 항목별로 비교해 줘요.
// 기록은 이 브라우저에만 남아요 (로그인 필요 없음).

type Album = {
  k: string
  t: string
  a: string
  cv: string
  y: number
  c: string
  f: string
  g: string[]
  s?: string
  x?: string
}
type Cell = 'hit' | 'near' | 'miss' | 'unk'
type Scope = 'kr' | 'all'
type Opt = { scope: Scope; from: number; to: number }

const TRIES = 10
const FIRST_DAY = Date.UTC(2026, 10, 28) // #1 = 2026-11-28 (한국 시간)
const OPT_KEY = 'mm_wordle_opt'
const TYPE: Record<string, string> = { album: '정규', ep: 'EP', single: '싱글' }
const COUNTRY: Record<string, string> = {
  KR: '한국',
  JP: '일본',
  US: '미국',
  GB: '영국',
  TW: '대만',
  CN: '중국',
  HK: '홍콩',
  TH: '태국',
  ID: '인도네시아',
  PH: '필리핀',
  SG: '싱가포르',
  CA: '캐나다',
  AU: '호주',
  FR: '프랑스',
  DE: '독일',
  SE: '스웨덴',
  FI: '핀란드',
  BR: '브라질',
}
const SQUARE: Record<Cell, string> = { hit: '🟩', near: '🟨', miss: '⬜', unk: '⬜' }
const KIND: Record<string, string> = { solo: '솔로', band: '밴드·그룹' }
const SEX: Record<string, string> = { male: '남성', female: '여성', mixed: '혼성' }

const todayKST = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
const dayNo = (date: string) => Math.floor((Date.parse(date) - FIRST_DAY) / 86400_000) + 1
const norm = (s: string) => s.toLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim()
const mainArtist = (a: string) => norm(a.split(', ')[0] || a)
const thumb = (u: string) => u.replace('ab67616d00001e02', 'ab67616d00004851')
const big = (u: string) => u.replace('ab67616d00001e02', 'ab67616d0000b273')
function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function compare(g: Album, ans: Album) {
  const dy = ans.y - g.y
  const set = new Set(ans.g)
  const match = g.g.filter((x) => set.has(x)).length
  // 구성·성별은 한쪽이라도 모르면 비교하지 않아요
  const same = (a?: string, b?: string): Cell => (!a || !b ? 'unk' : a === b ? 'hit' : 'miss')
  return {
    artist: (mainArtist(g.a) === mainArtist(ans.a) ? 'hit' : 'miss') as Cell,
    kind: same(g.s, ans.s),
    sex: same(g.x, ans.x),
    country: (g.c === ans.c ? 'hit' : 'miss') as Cell,
    year: (dy === 0 ? 'hit' : Math.abs(dy) <= 2 ? 'near' : 'miss') as Cell,
    dy,
    type: (g.f === ans.f ? 'hit' : 'miss') as Cell,
    genre: (match === ans.g.length && g.g.length === ans.g.length
      ? 'hit'
      : match > 0
        ? 'near'
        : 'miss') as Cell,
    match,
  }
}

function loadOpt(maxYear: number): Opt {
  try {
    const o = JSON.parse(localStorage.getItem(OPT_KEY) || 'null') as Opt | null
    if (o && (o.scope === 'kr' || o.scope === 'all') && o.from <= o.to) return o
  } catch {
    /* 무시 */
  }
  return { scope: 'kr', from: 2010, to: maxYear }
}

export function Wordle() {
  const [albums, setAlbums] = useState<Album[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [date, setDate] = useState('')
  const [opt, setOpt] = useState<Opt | null>(null)
  const [guesses, setGuesses] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDate(todayKST())
    fetch('/explore/wordle/data')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { albums: Album[] }) => setAlbums(d.albums))
      .catch(() => setFailed(true))
  }, [])

  // 연도 고르기: 가장 오래된 앨범 ~ 올해
  const years = useMemo(() => {
    const max = Number(todayKST().slice(0, 4))
    if (!albums?.length) return { min: 1960, max }
    return { min: Math.min(...albums.map((a) => a.y)), max }
  }, [albums])

  useEffect(() => {
    if (albums && !opt) setOpt(loadOpt(years.max))
  }, [albums, opt, years.max])

  const byKey = useMemo(() => new Map((albums || []).map((a) => [a.k, a])), [albums])
  const pool = useMemo(
    () =>
      !albums || !opt
        ? []
        : albums.filter(
            (a) => (opt.scope === 'all' || a.c === 'KR') && a.y >= opt.from && a.y <= opt.to,
          ),
    [albums, opt],
  )
  const saveKey = opt ? `mm_wordle_v1:${date}:${opt.scope}:${opt.from}-${opt.to}` : ''
  // 정답: 날짜·범위로 정해져요. 구성·성별을 아는 앨범이 충분하면 그중에서.
  // 앨범이 새로 늘어도 오늘 정답이 웬만하면 안 바뀌게, 앨범마다 따로 점수를 매겨 가장 낮은 것을 골라요.
  const answer = useMemo(() => {
    const known = pool.filter((a) => a.s && a.x)
    const src = known.length >= 30 ? known : pool
    let best: Album | null = null
    let bestH = Infinity
    for (const a of src) {
      const h = hash(`${saveKey}|${a.k}`)
      if (h < bestH) {
        bestH = h
        best = a
      }
    }
    return best
  }, [pool, saveKey])

  // 오늘·이 범위에서 넣었던 답 불러오기
  useEffect(() => {
    if (!saveKey) return
    try {
      const g = JSON.parse(localStorage.getItem(saveKey) || '[]') as string[]
      setGuesses(Array.isArray(g) ? g.filter((k) => byKey.has(k)).slice(0, TRIES) : [])
    } catch {
      setGuesses([])
    }
  }, [saveKey, byKey])

  const won = Boolean(answer && guesses.includes(answer.k))
  const done = won || guesses.length >= TRIES

  const suggestions = useMemo(() => {
    const s = norm(q)
    if (!s || !albums) return []
    const used = new Set(guesses)
    const scored: { a: Album; score: number }[] = []
    for (const a of albums) {
      if (used.has(a.k)) continue
      const t = norm(a.t)
      const ar = norm(a.a)
      const score = t.startsWith(s)
        ? 0
        : ar.startsWith(s)
          ? 1
          : t.includes(s)
            ? 2
            : ar.includes(s)
              ? 3
              : -1
      if (score >= 0) scored.push({ a, score })
    }
    scored.sort((x, y) => x.score - y.score || x.a.t.localeCompare(y.a.t))
    return scored.slice(0, 8).map((x) => x.a)
  }, [q, albums, guesses])

  const changeOpt = (next: Opt) => {
    setOpt(next)
    try {
      localStorage.setItem(OPT_KEY, JSON.stringify(next))
    } catch {
      /* 무시 */
    }
  }

  const guess = (a?: Album) => {
    if (!a || done || guesses.includes(a.k)) return
    const next = [...guesses, a.k]
    setGuesses(next)
    setQ('')
    setOpen(false)
    setHi(0)
    try {
      localStorage.setItem(saveKey, JSON.stringify(next))
    } catch {
      /* 무시 */
    }
  }

  const rows = guesses.map((k) => byKey.get(k)!).filter(Boolean)

  if (failed)
    return (
      <p className="wrap muted section">
        앨범 목록을 불러오지 못했어요. 잠시 뒤에 다시 들어와 주세요.
      </p>
    )
  if (!albums || !opt || !date) return <p className="wrap muted section">문제를 준비하는 중…</p>

  const lo = Math.min(years.min, opt.from)
  const hiYear = Math.max(years.max, opt.to)
  const yearOptions = Array.from({ length: hiYear - lo + 1 }, (_, i) => hiYear - i)

  return (
    <section className="wrap section wd">
      <p className="label wd-no">
        오늘의 문제 #{dayNo(date)} · {date.replace(/-/g, '.')}
      </p>

      <div className="wd-opts">
        <div className="wd-opt">
          <span className="wd-opt__l">모드</span>
          <button type="button" className="chip" disabled title="준비 중이에요">
            아티스트
          </button>
          <button type="button" className="chip chip--active" aria-pressed>
            앨범
          </button>
        </div>
        <div className="wd-opt">
          <span className="wd-opt__l">범위</span>
          {(
            [
              ['kr', '국내만'],
              ['all', '해외 포함'],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              className={`chip${opt.scope === v ? ' chip--active' : ''}`}
              aria-pressed={opt.scope === v}
              onClick={() => changeOpt({ ...opt, scope: v })}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="wd-opt">
          <span className="wd-opt__l">발매 연도</span>
          <span className="wd-years">
            <select
              aria-label="발매 연도 시작"
              value={opt.from}
              onChange={(e) => {
                const from = Number(e.target.value)
                changeOpt({ ...opt, from, to: Math.max(from, opt.to) })
              }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <span aria-hidden>—</span>
            <select
              aria-label="발매 연도 끝"
              value={opt.to}
              onChange={(e) => {
                const to = Number(e.target.value)
                changeOpt({ ...opt, to, from: Math.min(opt.from, to) })
              }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </span>
        </div>
        <div className="wd-left" aria-label={`남은 기회 ${TRIES - guesses.length}번`}>
          <span className="wd-opt__l">남은 기회</span>
          {Array.from({ length: TRIES }, (_, i) => (
            <i key={i} className={i < TRIES - guesses.length ? 'is-on' : ''} />
          ))}
          <b>{Math.max(0, TRIES - guesses.length)}번</b>
        </div>
      </div>

      {pool.length < 5 ? (
        <p className="muted wd-empty">이 범위에는 문제를 낼 앨범이 부족해요. 범위를 넓혀 보세요.</p>
      ) : (
        <>
          {!done ? (
            <form
              className="wd-input"
              onSubmit={(e) => {
                e.preventDefault()
                guess(suggestions[hi])
              }}
            >
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setOpen(true)
                  setHi(0)
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setHi((h) => Math.min(h + 1, suggestions.length - 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setHi((h) => Math.max(h - 1, 0))
                  } else if (e.key === 'Escape') setOpen(false)
                }}
                placeholder="앨범이나 아티스트 이름 (한글·영어 모두 돼요)"
                aria-label="앨범 이름"
                role="combobox"
                aria-expanded={open && suggestions.length > 0}
                aria-controls="wd-sugg"
                autoComplete="off"
              />
              <button type="submit" className="btn btn--filled" disabled={!suggestions.length}>
                <span>맞히기 ↵</span>
              </button>
              {open && suggestions.length ? (
                <ul className="wd-sugg" id="wd-sugg" role="listbox">
                  {suggestions.map((a, i) => (
                    <li key={a.k} role="option" aria-selected={i === hi}>
                      <button
                        type="button"
                        className={i === hi ? 'is-on' : ''}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => guess(a)}
                        onMouseEnter={() => setHi(i)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumb(a.cv)} alt="" width={36} height={36} loading="lazy" />
                        <span>
                          <b>{a.t}</b>
                          <small>
                            {a.a} · {a.y}
                          </small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </form>
          ) : null}

          {done && answer ? (
            <Result answer={answer} won={won} rows={rows} no={dayNo(date)} />
          ) : null}

          <div className="wd-board-wrap">
            <div className="wd-board" role="table" aria-label="넣은 답">
              <div className="wd-row wd-row--head" role="row">
                {['앨범', '아티스트', '구성', '성별', '나라', '발매', '형태', '장르'].map((h) => (
                  <span key={h} role="columnheader">
                    {h}
                  </span>
                ))}
              </div>
              {rows.map((g) => {
                const r = compare(g, answer!)
                return (
                  <div key={g.k} className="wd-row" role="row">
                    <div className="wd-cell wd-cell--album" role="cell">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumb(g.cv)} alt="" width={40} height={40} />
                      <span>
                        <b>{g.t}</b>
                        <small>{g.a}</small>
                      </span>
                    </div>
                    <div className={`wd-cell is-${r.artist}`} role="cell">
                      {r.artist === 'hit' ? '같은 아티스트' : '다른 아티스트'}
                    </div>
                    <div className={`wd-cell is-${r.kind}`} role="cell">
                      {g.s ? KIND[g.s] || g.s : '모름'}
                    </div>
                    <div className={`wd-cell is-${r.sex}`} role="cell">
                      {g.x ? SEX[g.x] || g.x : '모름'}
                    </div>
                    <div
                      className={`wd-cell is-${r.country}`}
                      role="cell"
                      title={COUNTRY[g.c] || g.c}
                    >
                      {g.c}
                    </div>
                    <div className={`wd-cell is-${r.year}`} role="cell">
                      <b>{g.y}</b>
                      {r.dy ? (
                        <small>
                          {r.dy > 0 ? '↑' : '↓'}{' '}
                          {r.year === 'near' ? '1~2년 차이' : r.dy > 0 ? '더 늦게' : '더 이르게'}
                        </small>
                      ) : null}
                    </div>
                    <div className={`wd-cell is-${r.type}`} role="cell">
                      {TYPE[g.f] || g.f}
                    </div>
                    <div className={`wd-cell wd-cell--genre is-${r.genre}`} role="cell">
                      <b>
                        {r.genre === 'hit'
                          ? `${answer!.g.length}개 모두`
                          : `${answer!.g.length}개 중 ${r.match}개`}
                      </b>
                      <span className="wd-chips">
                        {g.g.slice(0, 6).map((x) => (
                          <span key={x} className={answer!.g.includes(x) ? 'is-ok' : ''}>
                            {x} {answer!.g.includes(x) ? '✓' : '×'}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                )
              })}
              {Array.from({ length: done ? 0 : Math.max(0, TRIES - rows.length) }, (_, i) => (
                <div key={`e${i}`} className="wd-row wd-row--empty" aria-hidden>
                  {Array.from({ length: 8 }, (_, j) => (
                    <span key={j} className="wd-cell" />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <p className="wd-legend small">
            <span>
              <i className="is-hit" /> 일치
            </span>
            <span>
              <i className="is-near" /> 비슷함 — 발매 ±2년 · 장르 일부 겹침
            </span>
            <span>
              <i className="is-miss" /> 다름
            </span>
            <span>
              <i className="is-unk" /> 모름 (비교 안 함)
            </span>
            <span>↑ ↓ 정답이 더 늦게/이르게</span>
          </p>
          <p className="small muted">
            같은 날·같은 범위면 누구나 같은 정답이에요. 범위를 바꾸면 다른 문제가 나오고, 내일은 새
            문제가 나와요.
          </p>
        </>
      )}
    </section>
  )
}

function Result({
  answer,
  won,
  rows,
  no,
}: {
  answer: Album
  won: boolean
  rows: Album[]
  no: number
}) {
  const [busy, setBusy] = useState(false)
  const toast = (text: string) =>
    window.dispatchEvent(new CustomEvent('mm-toast', { detail: text }))
  const play = async () => {
    if (busy) return
    setBusy(true)
    try {
      const r = await fetch(`/explore/wordle/songs?k=${answer.k}`).then((res) => res.json())
      const songs = (r.songs || []) as Song[]
      if (songs.length) myPlaylist.play(songs, 0, `인디 워들 #${no}`)
      else toast('들을 수 있는 곡을 못 찾았어요')
    } catch {
      toast('곡을 불러오지 못했어요')
    } finally {
      setBusy(false)
    }
  }
  const share = async () => {
    const grid = rows
      .map((g) => {
        const r = compare(g, answer)
        return [r.artist, r.kind, r.sex, r.country, r.year, r.type, r.genre]
          .map((c) => SQUARE[c])
          .join('')
      })
      .join('\n')
    const text = `머스캣 인디 워들 #${no} (앨범) ${won ? rows.length : 'X'}/${TRIES}\n${grid}\n${window.location.origin}/explore/wordle`
    try {
      if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(text)
        toast('결과를 복사했어요')
      }
    } catch {
      /* 공유 창을 닫은 경우 */
    }
  }
  return (
    <div className={`wd-result${won ? ' is-won' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={big(answer.cv)} alt="" className="wd-result__cover" />
      <div className="wd-result__body">
        <p className="label">
          {won ? `정답! ${rows.length}번 만에 맞혔어요` : '아쉬워요. 오늘의 정답은'}
        </p>
        <p className="wd-result__t">{answer.t}</p>
        <p className="wd-result__a">{answer.a}</p>
        <p className="small muted">
          {[
            answer.y,
            TYPE[answer.f] || answer.f,
            COUNTRY[answer.c] || answer.c,
            answer.s ? KIND[answer.s] : null,
            answer.x ? SEX[answer.x] : null,
            answer.g.join(', '),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <div className="wd-result__btns">
          <button type="button" className="btn btn--filled" onClick={play} disabled={busy}>
            <span>▶ 이 앨범 들어보기</span>
          </button>
          <Link href={`/picks/albums/${answer.k}`} className="btn btn--outline">
            <span>앨범 페이지</span>
          </Link>
          <button type="button" className="btn btn--outline" onClick={share}>
            <span>결과 공유</span>
          </button>
        </div>
      </div>
    </div>
  )
}
