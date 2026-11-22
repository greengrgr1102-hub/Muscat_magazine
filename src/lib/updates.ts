import 'server-only'
import { sql } from '@payloadcms/db-postgres'
import { getClient } from './data'

export type UpdateLine = { text: string; href?: string }
export type UpdateDay = {
  day: string
  lines: UpdateLine[]
  newSongs: number
  youtube: number
  genres: { name: string; slug: string }[]
  articles: { title: string; slug: string }[]
}

type Exec = { drizzle: { execute: (x: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }

/** "탐험에 페스티벌이 생겼어요 → /explore/festivals" → 글 + 링크 */
function parseLine(raw: string): UpdateLine | null {
  const t = raw.trim().replace(/^[-·•]\s*/, '')
  if (!t) return null
  const m = t.match(/^(.*?)\s*(?:→|->)\s*(\/\S*)$/)
  return m ? { text: m[1].trim(), href: m[2] } : { text: t }
}

const kst = (col: string) => sql.raw(`to_char(${col} at time zone 'Asia/Seoul', 'YYYY-MM-DD')`)

/** 최근 days일 동안 날짜별로: 손으로 쓴 소식 + 자동으로 센 숫자 */
export async function getUpdates(days = 45): Promise<UpdateDay[]> {
  const payload = await getClient()
  const db = payload.db as unknown as Exec
  const since = new Date(Date.now() + 9 * 3600_000 - days * 86400_000).toISOString().slice(0, 10)
  const [notes, songs, yt, genres, arts] = await Promise.all([
    payload.find({
      collection: 'updates',
      where: { day: { greater_than_equal: since } },
      limit: 200,
      sort: '-day',
      depth: 0,
    }),
    db.drizzle.execute(
      sql`select ${kst('created_at')} as d, count(*)::int as n from picks group by 1`,
    ),
    db.drizzle.execute(
      sql`select ${kst('youtube_checked_at')} as d, count(*)::int as n from picks where youtube_id is not null and youtube_checked_at is not null group by 1`,
    ),
    db.drizzle.execute(sql`select ${kst('created_at')} as d, name, slug from genres order by name`),
    db.drizzle.execute(
      sql`select ${kst('published_at')} as d, title, slug from articles where _status = 'published' and published_at is not null order by published_at`,
    ),
  ])
  const map = new Map<string, UpdateDay>()
  const get = (day: string) => {
    if (!map.has(day))
      map.set(day, { day, lines: [], newSongs: 0, youtube: 0, genres: [], articles: [] })
    return map.get(day)!
  }
  for (const n of notes.docs) {
    const d = get(n.day)
    for (const l of String(n.note || '').split('\n')) {
      const p = parseLine(l)
      if (p) d.lines.push(p)
    }
  }
  for (const r of songs.rows) if (String(r.d) >= since) get(String(r.d)).newSongs = Number(r.n)
  for (const r of yt.rows) if (String(r.d) >= since) get(String(r.d)).youtube = Number(r.n)
  for (const r of genres.rows)
    if (String(r.d) >= since)
      get(String(r.d)).genres.push({ name: String(r.name), slug: String(r.slug) })
  for (const r of arts.rows)
    if (String(r.d) >= since)
      get(String(r.d)).articles.push({ title: String(r.title), slug: String(r.slug) })
  // 첫 가져오기처럼 곡이 수백 곡씩 한꺼번에 들어온 날도 그대로 보여 줘요
  return [...map.values()].sort((a, b) => b.day.localeCompare(a.day))
}
