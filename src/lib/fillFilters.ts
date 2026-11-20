import { fillArtistInfo } from './fillArtistInfo'
import { checkSavedYoutube } from './youtube'
import 'server-only'
import type { Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { parseSpotify } from '../collections/Picks'
import { cleanAlbumName } from './albumName'
import { romanize } from './romanize'
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

/* ───────── 이름은 한국어·영어로만 ───────── */
// 한국 독자가 못 읽는 글자(일본어 가나·한자, 중국어, 키릴 문자 등)가 들어간 곡·아티스트·앨범 이름은
// Spotify 영어 화면에 나오는 이름으로 바꿔요. (예: 米津玄師 → Kenshi Yonezu)
// 영어 이름이 따로 없으면, 「東京酒吐座(Tokyo Shoegazer)」처럼 영어·한국어 이름이 같이 적힌 경우만 그 부분을 남겨요.

// 한글·라틴 문자(악센트 포함)·숫자·기호가 아닌 글자
const FOREIGN_SRC = '぀-ヿ㐀-鿿豈-﫿ｦ-ﾟЀ-ӿͰ-Ͽ֐-׿؀-ۿऀ-ॿ฀-๿'
const FOREIGN = new RegExp(`[${FOREIGN_SRC}]`)
const hasForeign = (s?: string | null) => Boolean(s && FOREIGN.test(s))

/** 영어 이름이 없을 때: 띄어쓰기·괄호로 나뉜 조각 중 외국 글자로만 된 조각을 빼요. 한 조각 안에 섞여 있으면 손대지 않아요. */
export function dropForeignParts(name: string): string | null {
  // 「怪獣の花唄 - replica -」처럼 뒤에 붙은 버전 표시만 영어인 경우는 빼면 안 돼요
  if (/\s[-–—~]\s?/.test(name)) return null
  const tokens = name.split(/([\s()（）[\]【】/|·・]+)/)
  const words = tokens.filter((t, i) => i % 2 === 0 && t)
  if (!words.some((w) => FOREIGN.test(w))) return null
  if (words.some((w) => FOREIGN.test(w) && new RegExp(`[^${FOREIGN_SRC}\\s]`).test(w.replace(/[\p{P}\p{S}]/gu, '')))) return null
  const kept = words.filter((w) => !FOREIGN.test(w))
  const out = kept.join(' ').replace(/\s+/g, ' ').trim()
  return out.replace(/[\p{P}\p{S}\s]/gu, '').length >= 2 ? out : null
}

/** 한 이름을 한국어·영어로: Spotify 영어 이름 → 섞인 이름에서 외국 글자 빼기 → 못 하면 그대로 */
function koEn(current: string | null, english: string | null | undefined) {
  if (!current || !hasForeign(current)) return null
  if (english && !hasForeign(english) && english !== current) return english
  return dropForeignParts(current)
}
function koEnArtists(current: string, english: string | null | undefined) {
  if (!hasForeign(current)) return null
  const mine = current.split(', ')
  const theirs = (english || '').split(', ')
  // 아티스트 이름은 「莫創崴53mo」처럼 한 덩어리에 섞여 있어도, 영어·한국어 부분이 두 글자 넘게 남으면 그것만 써요
  const strip = (a: string) => {
    const rest = a.replace(new RegExp(`[${FOREIGN_SRC}]+`, 'g'), ' ').replace(/\s+/g, ' ').trim()
    return rest.replace(/[\p{P}\p{S}\s\d]/gu, '').length >= 2 ? rest : null
  }
  const out = mine.map((a, i) => koEn(a, theirs.length === mine.length ? theirs[i] : null) ?? (hasForeign(a) ? strip(a) : null) ?? a)
  const joined = out.join(', ')
  return joined !== current ? joined : null
}

async function englishNames(trackId: string): Promise<{ track: string; artist: string; album: string | null } | 'busy' | null> {
  const t = await page(`https://open.spotify.com/track/${trackId}`)
  if (t === 'busy') return 'busy'
  if (!t) return null
  const title = metaOf(t, 'og:title')
  const parts = (metaOf(t, 'og:description') || '').split(' · ').map((p) => p.trim())
  if (!title || parts.length < 3) return null
  // "Artist1, Artist2 · Album · Song · 2025"
  const artist = parts.length >= 4 ? parts.slice(0, parts.length - 3).join(' · ') : parts[0]
  const album = parts.length >= 4 ? cleanAlbumName(parts[parts.length - 3]) || null : null
  return { track: title, artist, album }
}

export async function fillEnglishNames(payload: Payload, deadline: number) {
  const db = dbOf(payload)
  const re = sql.raw(`'[${FOREIGN_SRC}]'`)
  // 앨범 단위로 이어서 (중간에 멈춰도 한 앨범이 두 이름으로 갈라지는 일이 적게)
  const todo = (
    await db.drizzle.execute(sql`
      select id, spotify_url, track, artist_name, album, right(cover_url, 24) as ck
      from picks
      where en_checked_at is null
        and (track ~ ${re} or artist_name ~ ${re} or album ~ ${re})
      order by right(cover_url, 24), id
      limit 300`)
  ).rows.map((r) => ({
    id: Number(r.id),
    sid: parseSpotify(String(r.spotify_url))?.id,
    track: (r.track as string) || null,
    artist: String(r.artist_name),
    album: (r.album as string) || null,
    ck: (r.ck as string) || null,
  }))
  let changed = 0
  let busy = false
  let i = 0
  const worker = async () => {
    while (i < todo.length && !busy && Date.now() < deadline - 6000) {
      const p = todo[i++]
      try {
        const en = p.sid ? await englishNames(p.sid) : null
        if (en === 'busy') {
          busy = true
          break
        }
        const track = koEn(p.track, en?.track)
        const artist = koEnArtists(p.artist, en?.artist)
        const album = koEn(p.album, en?.album)
        // 가나가 들어간 아티스트 이름은 일본 — 영어로 바꾸기 전에 나라부터 적어 둬요
        const first = p.artist.split(', ')[0]
        const kana = [first, p.track || '', p.album || ''].some((x) => /[\u3040-\u30ff]/.test(x) && !/[\uac00-\ud7a3]/.test(x))
        await db.drizzle.execute(sql`
          update picks set
            track = coalesce(${track}::varchar, track),
            artist_name = coalesce(${artist}::varchar, artist_name),
            country = coalesce(country, ${kana ? 'JP' : null}::varchar),
            en_checked_at = now()
          where id = ${p.id}`)
        if (album && p.ck) {
          await db.drizzle.execute(sql`update picks set album = ${album} where right(cover_url, 24) = ${p.ck} and album = ${p.album}`)
        }
        await db.drizzle.execute(sql`update picks set label = coalesce(track, 'Untitled') || ' — ' || artist_name where id = ${p.id}`)
        if (track || artist || album) changed++
      } catch {
        // 다음에 다시
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  const left = Number(
    (
      await db.drizzle.execute(sql`
        select count(*)::int as c from picks where en_checked_at is null and (track ~ ${re} or artist_name ~ ${re} or album ~ ${re})`)
    ).rows[0]?.c || 0,
  )
  return { changed, busy, left }
}

/** Spotify 영어 이름도 없는 곡은 로마자 발음으로 (スーパースターになったら → Supasuta ni nattara). 사이트 안에서만 계산해서 빨라요. */
export async function romanizeNames(payload: Payload, deadline: number) {
  const db = dbOf(payload)
  const re = sql.raw(`'[${FOREIGN_SRC}]'`)
  const rows = (
    await db.drizzle.execute(sql`
      select id, track, artist_name, album, country
      from picks
      where en_checked_at is not null and (track ~ ${re} or artist_name ~ ${re} or album ~ ${re})
      order by id
      limit 800`)
  ).rows
  let changed = 0
  for (const r of rows) {
    if (Date.now() > deadline - 3000) break
    const chinese = ['CN', 'TW', 'HK'].includes(String(r.country || ''))
    try {
      const fix = async (v: unknown, kind: 'title' | 'name') => {
        const s = (v as string) || null
        if (!s || !hasForeign(s)) return null
        const out = await romanize(s, { kind, chinese })
        return out && out !== s ? out : null
      }
      const track = await fix(r.track, 'title')
      const album = await fix(r.album, 'title')
      const artists = String(r.artist_name).split(', ')
      const fixed = await Promise.all(artists.map(async (a) => (await fix(a, 'name')) ?? a))
      const artist = fixed.join(', ') !== r.artist_name ? fixed.join(', ') : null
      if (!track && !album && !artist) continue
      const kana = !chinese && [r.track, r.album, r.artist_name].some((x) => /[\u3040-\u30ff]/.test(String(x || '')))
      await db.drizzle.execute(sql`
        update picks set
          country = coalesce(country, ${kana ? 'JP' : null}::varchar),
          track = coalesce(${track}::varchar, track),
          album = coalesce(${album}::varchar, album),
          artist_name = coalesce(${artist}::varchar, artist_name),
          label = coalesce(${track}::varchar, track, 'Untitled') || ' — ' || coalesce(${artist}::varchar, artist_name)
        where id = ${Number(r.id)}`)
      changed++
    } catch {
      // 다음에 다시
    }
  }
  return { changed, scanned: rows.length }
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
  // 아티스트 이름이 영어여도, 곡·앨범 제목에 가나가 있으면 일본 곡이에요 (한 아티스트의 곡 대부분이 그럴 때만)
  quick += (
    await db.drizzle.execute(sql`
      update picks p set country = 'JP', country_checked_at = now()
      from (
        select lower(split_part(artist_name, ', ', 1)) as a
        from picks
        group by 1
        having avg(case when coalesce(track, '') ~ '[ぁ-んァ-ヶ]' or coalesce(album, '') ~ '[ぁ-んァ-ヶ]' then 1 else 0 end) >= 0.5
      ) x
      where p.country is null and lower(split_part(p.artist_name, ', ', 1)) = x.a
      returning p.id`)
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
      let c = await countryFromMusicBrainz(name)
      for (let k = 0; c === 'busy' && k < 2 && Date.now() < deadline - 8000; k++) {
        await new Promise((r) => setTimeout(r, 2500))
        c = await countryFromMusicBrainz(name)
      }
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

/** 앨범 이름에 붙은 「The 2nd Mini Album」 같은 설명 떼기 (사이트 안에서만 계산해서 빨라요) */
export async function cleanAlbumNames(payload: Payload) {
  const db = dbOf(payload)
  const names = (await db.drizzle.execute(sql`select distinct album from picks where album is not null`)).rows.map((r) => String(r.album))
  let changed = 0
  for (const old of names) {
    const next = cleanAlbumName(old)
    if (!next || next === old) continue
    await db.drizzle.execute(sql`update picks set album = ${next} where album = ${old}`)
    changed++
  }
  return changed
}

/** 둘 다 시간 안에 할 수 있는 만큼 (서로 다른 사이트라 같이 돌려요) */
export async function fillFilters(payload: Payload, budgetMs = 45_000) {
  const deadline = Date.now() + budgetMs
  const albumsCleaned = await cleanAlbumNames(payload)
  // 저장해 둔 YouTube 영상 중 쇼츠·짧은 클립 걸러내기 (50곡씩)
  const yt = await checkSavedYoutube(payload).catch(() => ({ checked: 0, cleared: 0, left: 0 }))
  // 나라는 일본어 이름(가나)으로도 찾으니까, 이름을 영어로 바꾸기 전에 빠른 단계부터 끝내요.
  // MusicBrainz는 1초에 한 번만 → 나라 채우기와 아티스트 멤버·다른 이름 채우기를 15분마다 번갈아 해요
  const infoTurn = Math.floor(Date.now() / 900_000) % 2 === 1
  const countriesP = fillCountries(payload, infoTurn ? Date.now() + 2000 : deadline)
  await new Promise((r) => setTimeout(r, 1500))
  // Spotify가 몇십 번 만에 쉬어 가자고 해서, 번갈아 가며 먼저 해요 (한쪽만 계속 밀리지 않게)
  const typesFirst = Math.floor(Date.now() / 600_000) % 2 === 0
  const skipped = { changed: 0, busy: true, left: -1 }
  const skippedT = { done: 0, missed: 0, busy: true, left: -1 }
  const spotifySide = async () => {
    if (typesFirst) {
      const types = await fillReleaseTypes(payload, deadline)
      const en = types.busy ? skipped : await fillEnglishNames(payload, deadline)
      return { en, types }
    }
    const en = await fillEnglishNames(payload, deadline)
    const types = en.busy ? skippedT : await fillReleaseTypes(payload, deadline)
    return { en, types }
  }
  const noInfo = { done: 0, found: 0, busy: false, left: -1 }
  const infoP = infoTurn ? countriesP.then(() => fillArtistInfo(payload, deadline)) : Promise.resolve(noInfo)
  const [{ en, types }, countries, info] = await Promise.all([spotifySide(), countriesP, infoP])
  const roman = Date.now() < deadline - 5000 ? await romanizeNames(payload, deadline) : { changed: 0, scanned: 0 }
  const parts = [
    ...(albumsCleaned ? [`앨범 이름 ${albumsCleaned}개 정리`] : []),
    `영어 이름이 없는 ${roman.changed}곡은 로마자 발음으로`,
    `외국어 이름 ${en.changed}곡을 한국어·영어로 바꿈${en.left > 0 ? ` (남은 곡 ${en.left}곡)` : ''}`,
    `앨범 형태 ${types.done}개 채움${types.left > 0 ? ` (남은 앨범 ${types.left}개${types.busy ? ', Spotify가 잠깐 쉬어 가재서 멈춤' : ''})` : ''}`,
    `나라: ${countries.quick}곡은 이름·아티스트 정보로, 아티스트 ${countries.found}명은 MusicBrainz로 채움${countries.left ? ` (남은 아티스트 ${countries.left}명)` : ''}`,
  ]
  if (yt.checked) parts.push(`YouTube 영상 ${yt.checked}개 길이 확인, 짧은 영상 ${yt.cleared}개 지움${yt.left ? ` (남은 영상 ${yt.left}개)` : ''}`)
  if (info.left !== -1) parts.push(`아티스트 멤버·다른 이름 ${info.done}명 확인${info.left > 0 ? ` (남은 아티스트 ${info.left}명)` : ''}`)
  return { albumsCleaned, en, roman, types, countries, info, yt, message: parts.join(' · ') }
}
