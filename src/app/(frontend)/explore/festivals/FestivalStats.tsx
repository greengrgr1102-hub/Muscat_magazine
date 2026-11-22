import type { ReactNode } from 'react'
import { FEST_CATS, type FestStats } from '@/lib/festivalShared'

const CAT_CLASS: Record<string, string> = {
  록: 'rock',
  팝: 'pop',
  'R&B·소울': 'rnb',
  힙합: 'hiphop',
  일렉트로닉: 'electronic',
  재즈: 'jazz',
  포크: 'folk',
}
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
const TOP = 3

// 상위 3개만 보이고 나머지는 펼쳐 보기
function Top3<T>({ items, row, more }: { items: T[]; row: (x: T) => ReactNode; more: string }) {
  return (
    <>
      <ul className="fstat__rows">{items.slice(0, TOP).map(row)}</ul>
      {items.length > TOP ? (
        <details className="fstat__more">
          <summary>{more}</summary>
          <ul className="fstat__rows">{items.slice(TOP).map(row)}</ul>
        </details>
      ) : null}
    </>
  )
}

// 올해 페스티벌을 숫자로 — 팀 수, 에디터가 들은 비율, 장르, 겹치는 팀
export function FestivalStats({ s }: { s: FestStats }) {
  if (!s.fests) return null
  const maxPair = Math.max(1, ...s.pairs.map((p) => p.n))
  const maxOften = Math.max(1, ...s.often.map((o) => o.n))
  return (
    <section className="wrap section fstat" aria-label="페스티벌 통계">
      <dl className="fstat__nums">
        <div>
          <dt>페스티벌</dt>
          <dd>{s.fests}곳</dd>
        </div>
        <div>
          <dt>무대에 선 팀</dt>
          <dd>{s.teams.toLocaleString()}</dd>
        </div>
        <div>
          <dt>두 곳 이상</dt>
          <dd>{s.multi}팀</dd>
        </div>
        <div>
          <dt>에디터가 들은 팀</dt>
          <dd>{s.heard}</dd>
        </div>
      </dl>

      <div className="fstat__grid">
        <div className="fstat__block">
          <h2 className="fstat__h">머스캣 싱크로율</h2>
          <p className="fstat__sub">라인업 중 에디터가 들어 본 팀의 비율</p>
          <Top3
            items={s.sync}
            more={`전체 ${s.sync.length}곳 보기`}
            row={(x) => (
              <li key={x.id} className="fstat__row">
                <span className="fstat__name">{x.short}</span>
                <span className="fstat__bar" aria-hidden>
                  <span className="fstat__fill" style={{ width: `${pct(x.heard, x.total)}%` }} />
                </span>
                <span className="fstat__val">
                  {pct(x.heard, x.total)}%{' '}
                  <small>
                    {x.heard}/{x.total}
                  </small>
                </span>
              </li>
            )}
          />
        </div>

        {s.genres.length ? (
          <div className="fstat__block">
            <h2 className="fstat__h">무슨 음악이 섰나</h2>
            <p className="fstat__sub">에디터가 들은 팀의 대표 장르 기준</p>
            <ul className="fstat__legend" aria-hidden>
              {FEST_CATS.map((c) => (
                <li key={c}>
                  <i className={`fstat-c fstat-c--${CAT_CLASS[c]}`} />
                  {c}
                </li>
              ))}
            </ul>
            <Top3
              items={s.genres}
              more={`전체 ${s.genres.length}곳 보기`}
              row={(g) => {
                const top = [...g.mix].sort((p, q) => q.n - p.n)[0]
                return (
                  <li key={g.id} className="fstat__row">
                    <span className="fstat__name">{g.short}</span>
                    <span className="fstat__bar fstat__bar--stack">
                      {g.mix.map((m) => (
                        <span
                          key={m.cat}
                          className={`fstat-c fstat-c--${CAT_CLASS[m.cat]}`}
                          style={{ width: `${(m.n / g.n) * 100}%` }}
                          title={`${m.cat} ${m.n}팀`}
                        />
                      ))}
                    </span>
                    <span className="fstat__val">
                      {top.cat} {pct(top.n, g.n)}%
                    </span>
                  </li>
                )
              }}
            />
          </div>
        ) : null}

        {s.pairs.length ? (
          <div className="fstat__block">
            <h2 className="fstat__h">같은 팀을 나눈 페스티벌</h2>
            <p className="fstat__sub">두 페스티벌에 함께 선 팀 수</p>
            <Top3
              items={s.pairs}
              more={`전체 ${s.pairs.length}쌍 보기`}
              row={(p) => (
                <li key={`${p.a}-${p.b}`} className="fstat__row fstat__row--pair">
                  <span className="fstat__name">
                    {p.a} <span className="fstat__x">↔</span> {p.b}
                  </span>
                  <span className="fstat__bar fstat__bar--bare" aria-hidden>
                    <span
                      className="fstat__fill fstat__fill--pair"
                      style={{ width: `${(p.n / maxPair) * 100}%` }}
                    />
                  </span>
                  <span className="fstat__val">{p.n}팀</span>
                </li>
              )}
            />
          </div>
        ) : null}
      </div>
      {s.often.length ? (
        <div className="fstat__block fstat__rank">
          <h2 className="fstat__h">아티스트별 출연 횟수</h2>
          <p className="fstat__sub">
            올해 두 곳 이상 무대에 선 {s.often.length}팀 · <span className="fest-dot" aria-hidden />
            에디터가 들은 아티스트
          </p>
          <ol className="frank">
            {s.often.slice(0, 10).map((o, i) => (
              <RankRow key={o.name} o={o} i={i} max={maxOften} />
            ))}
          </ol>
          {s.often.length > 10 ? (
            <details className="fstat__more">
              <summary>나머지 {s.often.length - 10}팀 보기</summary>
              <ol className="frank" start={11}>
                {s.often.slice(10).map((o, i) => (
                  <RankRow key={o.name} o={o} i={i + 10} max={maxOften} />
                ))}
              </ol>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function RankRow({ o, i, max }: { o: FestStats['often'][number]; i: number; max: number }) {
  return (
    <li className="frank__row">
      <span className="frank__no">{i + 1}</span>
      <span className="frank__name">
        {o.heard ? <span className="fest-dot" aria-hidden /> : null}
        {o.name}
      </span>
      <span className="frank__bar" aria-hidden>
        <span style={{ width: `${(o.n / max) * 100}%` }} />
      </span>
      <span className="frank__n">{o.n}곳</span>
      <span className="frank__fests">{o.fests.join(' · ')}</span>
    </li>
  )
}
