import Link from 'next/link'
import { COUNTRY_OPTIONS, ERA_OPTIONS, TYPE_OPTIONS, eraDecade, type PickFilter } from '@/lib/data'

// 곡·앨범 목록 위의 필터: 발매 시기 · 나라 · 앨범 형태.
// 누르면 주소가 바뀌는 링크라, 필터를 건 화면을 그대로 공유할 수 있어요. 켜진 칩을 다시 누르면 꺼져요.
export function PickFilters({
  base,
  keep,
  f,
  anchor = '',
}: {
  base: string
  /** 필터 말고 유지할 값 (검색어, 정렬 등) */
  keep: Record<string, string>
  f: PickFilter
  anchor?: string
}) {
  const href = (next: PickFilter) => {
    const p = new URLSearchParams(keep)
    if (next.era) p.set('era', next.era)
    if (next.c) p.set('c', next.c)
    if (next.type) p.set('type', next.type)
    const s = p.toString()
    return `${base}${s ? `?${s}` : ''}${anchor}`
  }
  const rows = [
    { key: 'era' as const, label: '시기', options: ERA_OPTIONS },
    { key: 'c' as const, label: '나라', options: COUNTRY_OPTIONS },
    { key: 'type' as const, label: '형태', options: TYPE_OPTIONS },
  ]
  const any = Boolean(f.era || f.c || f.type)
  // 10년 묶음을 고르면 그 안의 연도를 하나씩 고를 수 있어요 (2020년대 → 2026 … 2020)
  const dec = eraDecade(f.era)
  const thisYear = new Date().getFullYear()
  const years =
    dec && dec.key !== 'old'
      ? Array.from({ length: 10 }, (_, i) => dec.from + 9 - i).filter((y) => y <= thisYear)
      : []
  // 장르(g)는 앨범 보기의 장르 고르기가 따로 다뤄요 — 여기서는 keep으로만 이어 받아요
  return (
    <div className="pfilters" role="group" aria-label="필터">
      {rows.map((r) => (
        <div key={r.key} className="pfilters__row">
          <span className="pfilters__label">{r.label}</span>
          <div className="pfilters__chips">
            {r.options.map((o) => {
              const on = f[r.key] === o.v
              // 연도를 골랐을 때는 그 연도가 속한 10년 묶음도 켜진 것처럼 보이고, 누르면 묶음 전체로 돌아가요
              const inside = r.key === 'era' && !on && dec?.key === o.v && f.era !== o.v
              return (
                <Link
                  key={o.v}
                  href={href({ ...f, [r.key]: on ? undefined : o.v })}
                  className={`chip${on || inside ? ' chip--active' : ''}`}
                  aria-pressed={on || inside}
                  scroll={false}
                >
                  {o.label}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
      {years.length ? (
        <div className="pfilters__row pfilters__row--years">
          <span className="pfilters__label">연도</span>
          <div className="pfilters__chips">
            {years.map((y) => {
              const on = f.era === String(y)
              return (
                <Link
                  key={y}
                  href={href({ ...f, era: on ? dec!.key : String(y) })}
                  className={`chip${on ? ' chip--active' : ''}`}
                  aria-pressed={on}
                  scroll={false}
                >
                  {y}
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}
      {any ? (
        <Link href={href({})} className="pfilters__reset small" scroll={false}>
          필터 지우기
        </Link>
      ) : null}
    </div>
  )
}
