import type { Payload } from 'payload'
import { dailySeries, kstDay, topKeys } from '../../lib/stats'

// 관리자 첫 화면 위쪽에 보이는 방문 통계 카드
type Props = { payload: Payload }

const box: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 6,
  padding: '16px 18px',
  background: 'var(--theme-elevation-0)',
}
const label: React.CSSProperties = { fontSize: 12, color: 'var(--theme-elevation-500)', margin: 0 }
const big: React.CSSProperties = { fontSize: 28, fontWeight: 600, margin: '4px 0 0', lineHeight: 1.1 }
const small: React.CSSProperties = { fontSize: 12, color: 'var(--theme-elevation-500)', margin: '4px 0 0' }
const GREEN = '#00bf63'

export async function StatsDashboard({ payload }: Props) {
  let pages: { day: string; count: number }[] = []
  let people: { day: string; count: number }[] = []
  let articles: { id: number; count: number; title: string }[] = []
  let plays: { id: number; count: number; title: string }[] = []
  try {
    const since7 = kstDay(new Date(Date.now() - 6 * 86400_000))
    ;[pages, people] = await Promise.all([dailySeries(payload, 'site', 14), dailySeries(payload, 'visitors', 14)])
    const [topA, topP] = await Promise.all([topKeys(payload, 'article:', since7), topKeys(payload, 'play:', since7)])
    const nameOf = async (collection: 'articles' | 'picks', ids: number[]) => {
      if (!ids.length) return new Map<number, string>()
      const r = await payload.find({
        collection,
        where: { id: { in: ids } },
        limit: ids.length,
        depth: 0,
        draft: true,
        overrideAccess: true,
      })
      return new Map(
        r.docs.map((d) => {
          const doc = d as unknown as { id: number; title?: string; track?: string; artistName?: string }
          return [doc.id, doc.title || [doc.track, doc.artistName].filter(Boolean).join(' — ') || `#${doc.id}`]
        }),
      )
    }
    const [aNames, pNames] = await Promise.all([
      nameOf('articles', topA.map((x) => x.id)),
      nameOf('picks', topP.map((x) => x.id)),
    ])
    articles = topA.map((x) => ({ ...x, title: aNames.get(x.id) || `삭제된 글 #${x.id}` }))
    plays = topP.map((x) => ({ ...x, title: pNames.get(x.id) || `삭제된 곡 #${x.id}` }))
  } catch {
    return (
      <div style={{ ...box, marginBottom: 24 }}>
        <p style={label}>방문 통계를 불러오지 못했어요. 잠시 후 새로고침해 주세요.</p>
      </div>
    )
  }

  const sum = (xs: { count: number }[]) => xs.reduce((a, b) => a + b.count, 0)
  const today = pages.at(-1)?.count || 0
  const yesterday = pages.at(-2)?.count || 0
  const todayPeople = people.at(-1)?.count || 0
  const week = sum(pages.slice(-7))
  const weekPeople = sum(people.slice(-7))
  const lastWeek = sum(pages.slice(0, 7))
  const change = lastWeek ? Math.round(((week - lastWeek) / lastWeek) * 100) : null
  const max = Math.max(1, ...pages.map((p) => p.count))

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>
        <span style={{ display: 'inline-block', width: 4, height: 16, background: GREEN, marginRight: 8, verticalAlign: -2 }} />
        방문 통계
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <div style={box}>
          <p style={label}>오늘 방문자</p>
          <p style={big}>{todayPeople.toLocaleString()}</p>
          <p style={small}>페이지 보기 {today.toLocaleString()}회</p>
        </div>
        <div style={box}>
          <p style={label}>어제 페이지 보기</p>
          <p style={big}>{yesterday.toLocaleString()}</p>
          <p style={small}>방문자 {(people.at(-2)?.count || 0).toLocaleString()}명</p>
        </div>
        <div style={box}>
          <p style={label}>최근 7일 방문자</p>
          <p style={big}>{weekPeople.toLocaleString()}</p>
          <p style={small}>
            페이지 보기 {week.toLocaleString()}회
            {change !== null && (
              <span style={{ color: change >= 0 ? '#008a47' : 'var(--theme-error-500)' }}>
                {' '}
                · 지난주보다 {change >= 0 ? '+' : ''}
                {change}%
              </span>
            )}
          </p>
        </div>
      </div>

      <div style={{ ...box, marginTop: 12 }}>
        <p style={label}>최근 14일 페이지 보기</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, marginTop: 10 }}>
          {pages.map((p) => (
            <div key={p.day} title={`${p.day} · ${p.count}회`} style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  height: Math.max(2, Math.round((p.count / max) * 64)),
                  background: p.day === pages.at(-1)?.day ? GREEN : 'var(--theme-elevation-300)',
                  borderRadius: 2,
                }}
              />
              <div style={{ fontSize: 10, color: 'var(--theme-elevation-500)', marginTop: 4 }}>{p.day.slice(8)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 12 }}>
        <TopList title="이번 주 많이 본 글" unit="회" rows={articles} href={(id) => `/admin/collections/articles/${id}`} empty="아직 기록이 없어요" />
        <TopList title="이번 주 많이 재생한 Editor's Pick" unit="회" rows={plays} href={(id) => `/admin/collections/picks/${id}`} empty="아직 재생 기록이 없어요" />
      </div>
      <p style={{ ...small, marginTop: 10 }}>
        한국 시간 기준 · 검색엔진 로봇은 빼고 세요 · 방문자는 브라우저 하나를 하루 한 명으로 셉니다 (개인정보는 저장하지 않아요)
      </p>
    </section>
  )
}

function TopList({
  title,
  rows,
  unit,
  href,
  empty,
}: {
  title: string
  rows: { id: number; count: number; title: string }[]
  unit: string
  href: (id: number) => string
  empty: string
}) {
  return (
    <div style={box}>
      <p style={label}>{title}</p>
      {rows.length === 0 ? (
        <p style={{ ...small, marginTop: 10 }}>{empty}</p>
      ) : (
        <ol style={{ margin: '10px 0 0', padding: 0, listStyle: 'none' }}>
          {rows.map((r, i) => (
            <li key={r.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderTop: i ? '1px solid var(--theme-elevation-100)' : 'none', fontSize: 14 }}>
              <span style={{ color: i === 0 ? GREEN : 'var(--theme-elevation-500)', width: 16 }}>{i + 1}</span>
              <a href={href(r.id)} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'inherit' }}>
                {r.title}
              </a>
              <span style={{ color: 'var(--theme-elevation-500)' }}>
                {r.count.toLocaleString()}
                {unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
