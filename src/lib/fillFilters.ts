import 'server-only'
import type { Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { parseSpotify } from '../collections/Picks'
import { metaOf } from './spotify'

// 곡·앨범 필터(앨범 형태, 나라)에 쓸 정보를 자동으로 채워요.
// - 앨범 형태: Spotify 공개 곡 페이지 → 앨범 페이지의 "아티스트 · EP · 2025 · 5 songs"
// - 나라: 한글 이름이면 한국, 가나가 있으면 일본 → 아티스트 페이지의 「활동 지역」 → MusicBrainz(공개 음악 데이터베이스)
// 못 찾은 건 30일 동안 다시 찾지 않아요. 관리자 화면에서 직접 고친 값은 덮어쓰지 않아요.

type DB = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
const dbOf = (payload: Payload) => payload.db as unknown as DB

const UA = 'Mozilla/5.0 (compatible; MuscatMagazineBot/1.0; +https://muscat-magazine.vercel.app)'
// MusicBrainz는 누가 요청하는지 알 수 있게 앱 이름과 연락처(사이트 주소)를 적어 달라고 해요
const MB_UA = 'MuscatMagazine/1.0 ( https://muscat-magazine.vercel.app )'

/* ───────── 앨범 형태 ───────── */

type ReleaseType = 'album' | 'ep' | 'single' | 'compilation'
const TYPES: Record<string, ReleaseType> = { album: 'album', ep: 'ep', single: 'single', compilation: 'compilation' }

async function page(url: string) {
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': UA },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (res.status === 429) return 'busy' as const
  if (!res.ok) return null
  return res.text()
}

async function releaseTypeOf(trackId: string): Promise<ReleaseType | 'busy' | null> {
  const t = await page(`https://open.spotify.com/track/${trackId}`)
  if (t === 'busy') return 'busy'
  if (!t) return null
  const albumUrl = metaOf(t, 'music:album')
  if (!albumUrl || !/^https:\/\/open\.spotify\.com\/album\/[A-Za-z0-9]+$/.test(albumUrl)) return null
  const a = await page(albumUrl)
  if (a === 'busy') return 'busy'
  if (!a) return null
  // "jisokuryClub · EP · 2025 · 5 songs"
  const parts = (metaOf(a, 'og:description') || '').split(' · ').map((p) => p.trim().toLowerCase())
  for (const p of parts) if (TYPES[p]) return TYPES[p]
  return null
}

export async function fillReleaseTypes(payload: Payload, deadline: number) {
  const db = dbOf(payload)
  const todo = (
    await db.drizzle.execute(sql`
      select right(cover_url, 24) as key, min(spotify_url) as url, count(*)::int as n
      from picks
      where cover_url like 'https://%/image/%'
        and release_type is null
        and (type_checked_at is null or type_checked_at < now() - interval '30 days')
      group by right(cover_url, 24)
      order by count(*) desc
      limit 400`)
  ).rows.map((r) => ({ key: String(r.key), id: parseSpotify(String(r.url))?.id }))
  let done = 0
  let missed = 0
  let busy = false
  let i = 0
  const worker = async () => {
    while (i < todo.length && !busy && Date.now() < deadline - 6000) {
      const t = todo[i++]
      try {
        const r = t.id ? await releaseTypeOf(t.id) : null
        if (r === 'busy') {
          busy = true
          break
        }
        if (r) {
          await db.drizzle.execute(sql`
            update picks set release_type = ${r}::enum_picks_release_type, type_checked_at = now()
            where right(cover_url, 24) = ${t.key} and release_type is null`)
          done++
        } else {
          await db.drizzle.execute(sql`update picks set type_checked_at = now() where right(cover_url, 24) = ${t.key} and release_type is null`)
          missed++
        }
      } catch {
        missed++
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  return { done, missed, busy, left: Math.max(0, todo.length - done - missed) }
}

/* ───────── 나라 ───────── */

// 아티스트 페이지 「활동 지역」에 적힌 말 → 나라 코드
const PLACE: [RegExp, string][] = [
  [/한국|서울|부산|대구|인천|광주|대전|제주|korea|seoul|busan/i, 'KR'],
  [/일본|도쿄|오사카|교토|후쿠오카|삿포로|나고야|japan|tokyo|osaka|kyoto/i, 'JP'],
  [/대만|타이베이|taiwan|taipei/i, 'TW'],
  [/중국|베이징|상하이|china|beijing|shanghai/i, 'CN'],
  [/홍콩|hong ?kong/i, 'HK'],
  [/영국|런던|맨체스터|글래스고|united kingdom|england|london|manchester|glasgow|scotland/i, 'GB'],
  [/미국|뉴욕|로스앤젤레스|시카고|usa|united states|new york|los angeles|chicago|brooklyn/i, 'US'],
  [/캐나다|토론토|몬트리올|canada|toronto|montreal/i, 'CA'],
  [/호주|시드니|멜버른|australia|sydney|melbourne/i, 'AU'],
  [/프랑스|파리|france|paris/i, 'FR'],
  [/독일|베를린|germany|berlin/i, 'DE'],
]

const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[\s'’".,!?·\-–—_()[\]]/g, '')

type MbArtist = {
  name?: string
  'sort-name'?: string
  score?: number
  country?: string
  area?: { 'iso-3166-1-codes'?: string[] }
  'begin-area'?: { 'iso-3166-1-codes'?: string[] }
  aliases?: { name?: string }[]
}

/** MusicBrainz에서 이름이 똑같은 아티스트를 찾아 나라를 돌려줘요. 같은 이름이 여러 나라에 있으면 모른다고 해요. */
async function countryFromMusicBrainz(name: string): Promise<string | null | 'busy'> {
  const q = `artist:"${name.replace(/"/g, '')}"`
  const res = await fetch(`https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(q)}&fmt=json&limit=5`, {
    headers: { 'User-Agent': MB_UA, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (res.status === 503 || res.status === 429) return 'busy'
  if (!res.ok) return null
  const list = ((await res.json()) as { artists?: MbArtist[] }).artists || []
  const want = norm(name)
  const same = list.filter(
    (a) =>
      (a.score ?? 0) >= 90 &&
      [a.name, a['sort-name'], ...(a.aliases || []).map((x) => x.name)].some((n) => n && norm(n) === want),
  )
  const codes = new Set(
    same
      .map((a) => a.country || a.area?.['iso-3166-1-codes']?.[0] || a['begin-area']?.['iso-3166-1-codes']?.[0] || null)
      .filter((c): c is string => Boolean(c) && /^[A-Z]{2}$/.test(c!) && c !== 'XW' && c !== 'XE'),
  )
  return codes.size === 1 ? [...codes][0] : null
}

export async function fillCountries(payload: Payload, deadline: number) {
  const db = dbOf(payload)
  let quick = 0

  // 1) 이름에 한글 → 한국, 가나 → 일본
  quick += (
    await db.drizzle.execute(sql`
      update picks set country = 'KR', country_checked_at = now()
      where country is null and split_part(artist_name, ', ', 1) ~ '[가-힣]' returning id`)
  ).rows.length
  quick += (
    await db.drizzle.execute(sql`
      update picks set country = 'JP', country_checked_at = now()
      where country is null and split_part(artist_name, ', ', 1) ~ '[ぁ-んァ-ヶ]' returning id`)
  ).rows.length

  // 2) 아티스트 페이지 「활동 지역」
  const linked = (
    await db.drizzle.execute(sql`
      select distinct a.id, a.based_in from picks p join artists a on a.id = p.artist_id
      where p.country is null and a.based_in is not null and a.based_in <> ''`)
  ).rows
  for (const r of linked) {
    const code = PLACE.find(([re]) => re.test(String(r.based_in)))?.[1]
    if (!code) continue
    quick += (
      await db.drizzle.execute(
        sql`update picks set country = ${code}, country_checked_at = now() where country is null and artist_id = ${Number(r.id)} returning id`,
      )
    ).rows.length
  }

  // 3) 같은 아티스트의 다른 곡에 나라가 있으면 그대로 (관리자가 한 곡만 고쳐도 퍼지게)
  quick += (
    await db.drizzle.execute(sql`
      update picks p set country = x.c, country_checked_at = now()
      from (
        select lower(split_part(artist_name, ', ', 1)) as a, mode() within group (order by country) as c
        from picks where country is not null group by 1
      ) x
      where p.country is null and lower(split_part(p.artist_name, ', ', 1)) = x.a
      returning p.id`)
  ).rows.length

  // 4) MusicBrainz — 1초에 한 번만 물어볼 수 있어서, 곡이 많은 아티스트부터
  const todo = (
    await db.drizzle.execute(sql`
      select split_part(artist_name, ', ', 1) as name, count(*)::int as n
      from picks
      where country is null and (country_checked_at is null or country_checked_at < now() - interval '30 days')
      group by split_part(artist_name, ', ', 1)
      order by count(*) desc
      limit 120`)
  ).rows.map((r) => String(r.name))
  let found = 0
  let missed = 0
  let busy = false
  for (const name of todo) {
    if (Date.now() > deadline - 3000) break
    const started = Date.now()
    try {
      const c = await countryFromMusicBrainz(name)
      if (c === 'busy') {
        busy = true
        break
      }
      if (c) {
        await db.drizzle.execute(sql`
          update picks set country = ${c}, country_checked_at = now()
          where country is null and split_part(artist_name, ', ', 1) = ${name}`)
        found++
      } else {
        await db.drizzle.execute(sql`
          update picks set country_checked_at = now() where country is null and split_part(artist_name, ', ', 1) = ${name}`)
        missed++
      }
    } catch {
      missed++
    }
    const wait = 1100 - (Date.now() - started)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  }
  const left = Number(
    (
      await db.drizzle.execute(sql`
        select count(distinct split_part(artist_name, ', ', 1))::int as c from picks
        where country is null and (country_checked_at is null or country_checked_at < now() - interval '30 days')`)
    ).rows[0]?.c || 0,
  )
  return { quick, found, missed, busy, left }
}

/** 둘 다 시간 안에 할 수 있는 만큼 (서로 다른 사이트라 같이 돌려요) */
export async function fillFilters(payload: Payload, budgetMs = 45_000) {
  const deadline = Date.now() + budgetMs
  const [types, countries] = await Promise.all([fillReleaseTypes(payload, deadline), fillCountries(payload, deadline)])
  const parts = [
    `앨범 형태 ${types.done}개 채움${types.left ? ` (남은 앨범 ${types.left}개${types.busy ? ', Spotify가 잠깐 쉬어 가재서 멈춤' : ''})` : ''}`,
    `나라: ${countries.quick}곡은 이름·아티스트 정보로, 아티스트 ${countries.found}명은 MusicBrainz로 채움${countries.left ? ` (남은 아티스트 ${countries.left}명)` : ''}`,
  ]
  return { types, countries, message: parts.join(' · ') }
}
