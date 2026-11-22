import { FEST_CATS, type FestStats } from '@/lib/festivals'

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

// 올해 페스티벌을 숫자로 — 팀 수, 에디터가 들은 비율, 장르, 겹치는 팀
export function FestivalStats({ s }: { s: FestStats }) {
  if (!s.fests) return null
  const maxPair = Math.max(1, ...s.pairs.map((p) => p.n))
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
          <ul className="fstat__rows">
            {s.sync.map((x) => (
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
            ))}
          </ul>
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
            <ul className="fstat__rows">
              {s.genres.map((g) => {
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
              })}
            </ul>
          </div>
        ) : null}

        {s.pairs.length ? (
          <div className="fstat__block">
            <h2 className="fstat__h">같은 팀을 나눈 페스티벌</h2>
            <p className="fstat__sub">두 페스티벌에 함께 선 팀 수</p>
            <ul className="fstat__rows">
              {s.pairs.map((p) => (
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
              ))}
            </ul>
          </div>
        ) : null}

        {s.often.length ? (
          <div className="fstat__block">
            <h2 className="fstat__h">올해 가장 바빴던 팀</h2>
            <p className="fstat__sub">세 곳 이상 무대에 선 팀</p>
            <ul className="fstat__often">
              {s.often.map((o) => (
                <li key={o.name}>
                  {o.name} <span>{o.n}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}
