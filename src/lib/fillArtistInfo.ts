import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { searchKey } from './searchKey'

type DB = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
const MB_UA = 'MuscatMagazine/1.0 ( https://muscat-magazine.vercel.app )'
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

type MbArtist = {
  id: string
  name: string
  'sort-name'?: string
  score?: number
  type?: string
  country?: string
  aliases?: { name?: string }[]
}
type MbRel = { type?: string; direction?: string; artist?: { name?: string } }

async function mb<T>(path: string): Promise<T | 'busy' | null> {
  const res = await fetch(`https://musicbrainz.org/ws/2/${path}`, {
    headers: { 'User-Agent': MB_UA, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  if (!res) return null
  if (res.status === 503 || res.status === 429) return 'busy'
  if (!res.ok) return null
  return (await res.json()) as T
}

/**
 * 곡 기록에 나오는 아티스트마다 MusicBrainz에서 멤버와 다른 이름(영어 이름 등)을 가져와
 * 「아티스트 검색 정보」에 적어요. 멤버 이름이나 영어 이름으로 검색해도 아티스트가 나오게.
 * MusicBrainz는 1초에 한 번만 물어볼 수 있어서 곡이 많은 아티스트부터 조금씩 해요.
 */
export async function fillArtistInfo(payload: Payload, deadline: number) {
  const db = payload.db as unknown as DB
  const rows = (
    await db.drizzle.execute(sql`
      select a, count(*)::int as n from (select split_part(artist_name, ', ', 1) as a from picks) x
      where a <> '' and not exists (select 1 from artist_info i where i.name = x.a)
      group by a order by n desc, a`)
  ).rows.map((r) => String(r.a))
  let done = 0
  let found = 0
  let busy = false
  for (const name of rows) {
    if (Date.now() > deadline - 4000) break
    const want = searchKey(name)
    const res = await mb<{ artists?: MbArtist[] }>(`artist?query=${encodeURIComponent(`artist:"${name.replace(/"/g, '')}"`)}&fmt=json&limit=5`)
    if (res === 'busy') {
      busy = true
      break
    }
    // 이름(또는 다른 이름)이 똑같은 아티스트가 딱 하나일 때만 믿어요
    const same = (res?.artists || []).filter(
      (a) => (a.score ?? 0) >= 90 && [a.name, a['sort-name'], ...(a.aliases || []).map((x) => x.name)].some((n) => n && searchKey(n) === want),
    )
    let members: string[] = []
    let aliases: string[] = []
    if (same.length === 1) {
      await wait(1100)
      const full = await mb<{ relations?: MbRel[]; aliases?: { name?: string }[]; name: string; 'sort-name'?: string }>(
        `artist/${same[0].id}?inc=artist-rels+aliases&fmt=json`,
      )
      if (full === 'busy') {
        busy = true
        break
      }
      if (full) {
        members = [
          ...new Set(
            (full.relations || [])
              .filter((r) => r.type === 'member of band' && r.direction === 'backward' && r.artist?.name)
              .map((r) => r.artist!.name!.trim()),
          ),
        ]
        const sortName = full['sort-name'] && !full['sort-name'].includes(',') ? full['sort-name'] : null
        aliases = [...new Set([full.name, sortName, ...(full.aliases || []).map((x) => x.name)].filter((x): x is string => Boolean(x)).map((x) => x.trim()))]
          .filter((x) => searchKey(x) !== want && !/[,，、]/.test(x))
          .slice(0, 12)
        if (members.length || aliases.length) found++
      }
    }
    await payload
      .create({
        collection: 'artist-info',
        overrideAccess: true,
        data: { name, members: members.join(', ') || null, aliases: aliases.join(', ') || null, checkedAt: new Date().toISOString() },
      })
      .catch(() => null)
    done++
    await wait(1100)
  }
  return { done, found, busy, left: Math.max(0, rows.length - done) }
}
