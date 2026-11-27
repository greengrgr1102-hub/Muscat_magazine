import { sql } from '@payloadcms/db-postgres'
import 'server-only'
import { getClient } from './data'

// 인디 워들(앨범 모드)에 쓰는 앨범 목록.
// 커버(앨범) 하나당 한 줄: 발매 연도·나라·형태·장르가 모두 있는 앨범만 문제·답으로 써요.
export type WordleAlbum = {
  /** 앨범 키 (커버 주소 끝 24자) — 앨범 페이지 주소와 같아요 */
  k: string
  /** 앨범 이름 */
  t: string
  /** 아티스트 */
  a: string
  /** 커버 (작은 것) */
  cv: string
  /** 발매 연도 */
  y: number
  /** 나라 두 글자 */
  c: string
  /** 형태: album · ep · single */
  f: string
  /** 장르 이름 */
  g: string[]
}

type Row = Record<string, unknown>
let memo: { at: number; list: WordleAlbum[] } | null = null
const TTL = 30 * 60 * 1000

export async function wordleAlbums(): Promise<WordleAlbum[]> {
  if (memo && memo.list.length && Date.now() - memo.at < TTL) return memo.list
  const payload = await getClient()
  const db = payload.db as unknown as {
    drizzle: { execute: (x: unknown) => Promise<{ rows: Row[] }> }
  }
  const base = await db.drizzle.execute(sql`
    select right(cover_url, 24) as k,
           max(album) as t,
           mode() within group (order by artist_name) as a,
           max(cover_url) as cv,
           min(left(release_date, 4)) as y,
           mode() within group (order by country) as c,
           mode() within group (order by release_type) as f
    from picks
    where cover_url like 'https://%/image/%' and release_date ~ '^[0-9]{4}' and album is not null
    group by right(cover_url, 24)`)
  const gen = await db.drizzle.execute(sql`
    select right(p.cover_url, 24) as k, array_agg(distinct g.name) as gs
    from picks p
    join picks_rels r on r.parent_id = p.id and r.path = 'genres'
    join genres g on g.id = r.genres_id
    where p.cover_url like 'https://%/image/%'
    group by right(p.cover_url, 24)`)
  const gmap = new Map(gen.rows.map((r) => [String(r.k), (r.gs as string[]) || []]))
  const list: WordleAlbum[] = []
  for (const r of base.rows) {
    const k = String(r.k)
    const g = gmap.get(k) || []
    const y = Number(r.y)
    if (!r.c || !r.f || !g.length || !y) continue
    list.push({
      k,
      t: String(r.t),
      a: String(r.a || ''),
      cv: String(r.cv).replace('ab67616d0000b273', 'ab67616d00001e02'),
      y,
      c: String(r.c),
      f: String(r.f),
      g: g.slice(0, 8),
    })
  }
  list.sort((x, z) => (x.k < z.k ? -1 : 1))
  memo = { at: Date.now(), list }
  return list
}
