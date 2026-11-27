import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { searchKey } from './searchKey'

// 아티스트 검색 정보에 구성(솔로/밴드)·성별을 MusicBrainz로 채워요 (인디 워들 비교용).
// 사람이 고쳐 둔 값은 덮어쓰지 않고, 빈 칸만 채워요. MusicBrainz는 1초에 한 번만 물어볼 수 있어요.

type DB = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
type MbArtist = {
  id: string
  name: string
  'sort-name'?: string
  score?: number
  type?: string
  gender?: string
  aliases?: { name?: string }[]
}
type MbRel = { type?: string; direction?: string; artist?: { id?: string } }

const MB_UA = 'MuscatMagazine/1.0 ( https://muscat-magazine.vercel.app )'
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
let last = 0

async function mb<T>(path: string): Promise<T | 'busy' | null> {
  for (let k = 0; k < 3; k++) {
    const gap = 1100 - (Date.now() - last)
    if (gap > 0) await wait(gap)
    last = Date.now()
    const res = await fetch(`https://musicbrainz.org/ws/2/${path}`, {
      headers: { 'User-Agent': MB_UA, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    }).catch(() => null)
    if (!res) return null
    if (res.status === 503 || res.status === 429) {
      await wait(2500)
      continue
    }
    if (!res.ok) return null
    return (await res.json()) as T
  }
  return 'busy'
}

const sexOf = (g?: string) => (g === 'Male' ? 'male' : g === 'Female' ? 'female' : null)

async function profileOf(
  name: string,
): Promise<{ kind: string | null; gender: string | null } | 'busy' | null> {
  const want = searchKey(name)
  const res = await mb<{ artists?: MbArtist[] }>(
    `artist?query=${encodeURIComponent(`artist:"${name.replace(/"/g, '')}"`)}&fmt=json&limit=5`,
  )
  if (res === 'busy') return 'busy'
  // 이름(또는 다른 이름)이 똑같은 아티스트가 딱 하나일 때만 믿어요
  const same = (res?.artists || []).filter(
    (a) =>
      (a.score ?? 0) >= 90 &&
      [a.name, a['sort-name'], ...(a.aliases || []).map((x) => x.name)].some(
        (n) => n && searchKey(n) === want,
      ),
  )
  if (same.length !== 1) return null
  const a = same[0]
  if (a.type === 'Person' || a.type === 'Character')
    return { kind: 'solo', gender: sexOf(a.gender) }
  if (a.type !== 'Group' && a.type !== 'Orchestra' && a.type !== 'Choir') return null
  // 그룹: 멤버들의 성별로 남성만·여성만·혼성
  const full = await mb<{ relations?: MbRel[] }>(`artist/${a.id}?inc=artist-rels&fmt=json`)
  if (full === 'busy') return 'busy'
  const ids = [
    ...new Set(
      (full?.relations || [])
        .filter((r) => r.type === 'member of band' && r.direction === 'backward' && r.artist?.id)
        .map((r) => r.artist!.id!),
    ),
  ].slice(0, 20)
  if (!ids.length) return { kind: 'band', gender: null }
  const mem = await mb<{ artists?: MbArtist[] }>(
    `artist?query=${encodeURIComponent(ids.map((id) => `arid:${id}`).join(' OR '))}&fmt=json&limit=25`,
  )
  if (mem === 'busy') return 'busy'
  const sexes = new Set((mem?.artists || []).map((m) => sexOf(m.gender)).filter(Boolean))
  return {
    kind: 'band',
    gender: sexes.size === 2 ? 'mixed' : sexes.size === 1 ? [...sexes][0]! : null,
  }
}

export async function fillArtistProfile(payload: Payload, deadline: number) {
  const db = payload.db as unknown as DB
  // 사이트 아티스트 페이지에 멤버가 있으면 밴드 (MusicBrainz보다 먼저)
  await db.drizzle.execute(sql`
    update artist_info i set kind = 'band'
    from artists a
    where i.kind is null and lower(i.name) = lower(a.name)
      and (select count(*) from artists_members m where m._parent_id = a.id) >= 2`)
  // 곡이 많은 아티스트부터
  const rows = (
    await db.drizzle.execute(sql`
      select i.id, i.name from artist_info i
      left join (select split_part(artist_name, ', ', 1) as a, count(*)::int as n from picks group by 1) p on p.a = i.name
      where i.profile_checked_at is null and (i.kind is null or i.gender is null)
      order by coalesce(p.n, 0) desc, i.id
      limit 400`)
  ).rows
  let done = 0
  let found = 0
  let busy = false
  for (const r of rows) {
    if (Date.now() > deadline - 9000) break
    const p = await profileOf(String(r.name)).catch(() => null)
    if (p === 'busy') {
      busy = true
      break
    }
    const kind = p?.kind ?? null
    const gender = p?.gender ?? null
    if (kind || gender) found++
    await db.drizzle.execute(sql`
      update artist_info set
        kind = coalesce(kind, ${kind}::enum_artist_info_kind),
        gender = coalesce(gender, ${gender}::enum_artist_info_gender),
        profile_checked_at = now()
      where id = ${Number(r.id)}`)
    done++
  }
  const left = Number(
    (
      await db.drizzle.execute(
        sql`select count(*)::int as c from artist_info where profile_checked_at is null and (kind is null or gender is null)`,
      )
    ).rows[0]?.c || 0,
  )
  return { done, found, busy, left }
}
