import type { Metadata } from 'next'
import Link from 'next/link'
import { getUpdates } from '@/lib/updates'

export const metadata: Metadata = {
  title: '업데이트 노트',
  description: '머스캣 매거진에 하루하루 무엇이 새로 생겼는지.',
}
export const revalidate = 600

const fmt = (d: string) => {
  const [, m, day] = d.split('-')
  return `${Number(m)}.${Number(day)}`
}
const WD = ['일', '월', '화', '수', '목', '금', '토']
const weekday = (d: string) => WD[new Date(`${d}T12:00:00Z`).getUTCDay()]

export default async function UpdatesPage() {
  const days = await getUpdates()
  return (
    <>
      <section className="page-title wrap">
        <p className="label">Updates</p>
        <h1 className="page-title__h">
          <span className="display-lg">업데이트 노트</span>
        </h1>
        <p className="muted page-title__desc">
          하루하루 무엇이 새로 생겼는지 적어 둬요. 숫자는 사이트가 알아서 세요.
        </p>
      </section>
      <section className="wrap section updates">
        {days.length ? (
          <ol className="updates__list">
            {days.map((d) => {
              const nums = [
                d.newSongs ? `새로 들어온 곡 ${d.newSongs.toLocaleString()}곡` : null,
                d.youtube ? `YouTube 연결 ${d.youtube.toLocaleString()}곡` : null,
              ].filter(Boolean)
              return (
                <li key={d.day} className="updates__day">
                  <p className="updates__date">
                    <span className="updates__md">{fmt(d.day)}</span>
                    <span className="muted small">{weekday(d.day)}</span>
                  </p>
                  <ul className="updates__lines">
                    {d.lines.map((l, i) => (
                      <li key={`l${i}`}>{l.href ? <Link href={l.href}>{l.text}</Link> : l.text}</li>
                    ))}
                    {d.articles.length ? (
                      <li>
                        새 글{' '}
                        {d.articles.map((a, i) => (
                          <span key={a.slug}>
                            {i ? ', ' : ''}
                            <Link href={`/articles/${a.slug}`}>{a.title}</Link>
                          </span>
                        ))}
                      </li>
                    ) : null}
                    {d.genres.length ? (
                      <li>
                        새 장르 {d.genres.length}개 —{' '}
                        {d.genres.slice(0, 12).map((g, i) => (
                          <span key={g.slug}>
                            {i ? ', ' : ''}
                            <Link href={`/genres/${g.slug}`}>{g.name}</Link>
                          </span>
                        ))}
                        {d.genres.length > 12 ? (
                          <span className="muted"> 외 {d.genres.length - 12}개</span>
                        ) : null}
                      </li>
                    ) : null}
                    {nums.length ? <li className="muted">{nums.join(' · ')}</li> : null}
                  </ul>
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="muted">아직 기록이 없어요.</p>
        )}
      </section>
    </>
  )
}
