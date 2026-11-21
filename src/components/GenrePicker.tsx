'use client'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

type G = { name: string; slug: string; n: number; aliases?: string }

const norm = (x: string) => x.toLowerCase().replace(/[\s_\-·&]+/g, '')

// 앨범 보기의 장르 필터 — 여러 개 고르면 기본은 "모두 포함", 바꾸면 "하나라도".
// 고른 장르는 주소(?g=dream-pop,shoegaze)에 남아서 그대로 공유할 수 있어요.
export function GenrePicker({
  genres,
  selected,
  mode,
  base,
  keep,
}: {
  genres: G[]
  selected: string[]
  mode: 'all' | 'any'
  base: string
  keep: Record<string, string>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const bySlug = useMemo(() => new Map(genres.map((g) => [g.slug, g])), [genres])
  const go = (next: string[], m: 'all' | 'any' = mode) => {
    const p = new URLSearchParams(keep)
    p.delete('page')
    if (next.length) p.set('g', next.join(','))
    else p.delete('g')
    if (next.length > 1 && m === 'any') p.set('gm', 'any')
    else p.delete('gm')
    const s = p.toString()
    router.push(`${base}${s ? `?${s}` : ''}`, { scroll: false })
  }
  const toggle = (slug: string) => {
    if (selected.includes(slug)) go(selected.filter((x) => x !== slug))
    else if (selected.length < 5) go([...selected, slug])
    setQ('')
  }
  const key = norm(q.trim())
  const list = (
    key
      ? genres.filter(
          (g) =>
            norm(g.name).includes(key) ||
            g.slug.replace(/-/g, '').includes(key) ||
            norm(g.aliases || '').includes(key),
        )
      : genres
  )
    .filter((g) => !selected.includes(g.slug))
    .slice(0, key ? 40 : 30)

  return (
    <div className="pfilters__row pfilters__row--genre">
      <span className="pfilters__label">장르</span>
      <div className="gpick">
        <div className="gpick__on">
          {selected.map((slug) => (
            <button
              key={slug}
              type="button"
              className="chip chip--active"
              onClick={() => toggle(slug)}
              aria-label={`${bySlug.get(slug)?.name || slug} 빼기`}
            >
              {bySlug.get(slug)?.name || slug} ×
            </button>
          ))}
          {selected.length > 1 ? (
            <span className="gpick__mode" role="group" aria-label="여러 장르 조건">
              <button
                type="button"
                className={mode === 'all' ? 'is-on' : ''}
                onClick={() => go(selected, 'all')}
              >
                모두 포함
              </button>
              <button
                type="button"
                className={mode === 'any' ? 'is-on' : ''}
                onClick={() => go(selected, 'any')}
              >
                하나라도
              </button>
            </span>
          ) : null}
          {selected.length < 5 ? (
            <button
              type="button"
              className="chip gpick__add"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? '닫기' : selected.length ? '＋ 장르 더' : '＋ 장르 고르기'}
            </button>
          ) : null}
        </div>
        {open ? (
          <div className="gpick__panel">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="장르 찾기 — dream pop, 시티팝…"
              aria-label="장르 찾기"
              autoFocus
            />
            <div className="gpick__list">
              {list.map((g) => (
                <button key={g.slug} type="button" className="chip" onClick={() => toggle(g.slug)}>
                  {g.name} <span className="gpick__n">{g.n}</span>
                </button>
              ))}
              {!list.length ? <span className="small muted">맞는 장르가 없어요</span> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
