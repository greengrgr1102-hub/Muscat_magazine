import 'server-only'
import type { Payload } from 'payload'
import { parseSpotify } from '../collections/Picks'
import { trackNamesEn } from './spotify'

// 곡 하나에 맞는 YouTube 영상 찾기.
// YouTube Data API 검색은 하루 무료 한도(10,000점, 검색 1번 = 100점)가 있어서 하루 90번까지만 검색해요.
// 한 번 찾은 영상은 곡에 저장해 두고 다시 검색하지 않아요.
const DAILY_LIMIT = 90
const MISS_DAYS = 30
// 2026-11-21: 길이 기준을 풀었어요. 이 전에 '못 찾음'으로 표시된 곡은 다시 찾아봐요.
const RELAXED_AT = Date.parse('2026-11-21T08:00:00Z')

// YouTube 하루 한도는 미국 서부 시간 자정(한국 오후 4~5시)에 다시 채워져요. 그 날짜로 세요.
const quotaDay = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())

export function youtubeConfigured() {
  return Boolean(process.env.YOUTUBE_API_KEY?.trim())
}

type SearchItem = {
  id?: { videoId?: string }
  snippet?: { title?: string; channelTitle?: string; description?: string }
}

const norm = (s: string) => s.toLowerCase().replace(/[\s'’"「」()\[\]\-–—.,!?·:]/g, '')

/**
 * 공식 영상만 써요.
 * - 「아티스트 - Topic」 채널 (YouTube Music 공식 음원) — 채널 이름이 그 아티스트여야 해요
 * - 아티스트 본인 채널 · VEVO
 * 그리고 영상 제목에 곡 제목(한국어 또는 영어)이 들어 있어야 해요.
 * 팬 업로드·가사 영상·커버·라이브, 다른 가수의 같은 제목 곡은 버려요.
 */
type Names = { tracks: string[]; artists: string[] }

const stripParen = (t: string) => t.replace(/\s*[([（【].*?[)\]）】]/g, '')

function score(it: SearchItem, n: Names) {
  const ch = it.snippet?.channelTitle || ''
  const rawTitle = it.snippet?.title || ''
  const title = norm(rawTitle)
  const artists = n.artists.map(norm).filter((a) => a.length >= 2)
  const isTopic = / - Topic$/.test(ch)
  const chBase = norm(ch.replace(/ - Topic$/, '').replace(/vevo$/i, ''))
  const chIsArtist = artists.some(
    (a) =>
      chBase === a ||
      chBase === `${a}official` ||
      chBase === `official${a}` ||
      chBase.startsWith(a),
  )
  if (!chIsArtist) return -99
  const titleOk = n.tracks.some((t) => {
    const b = norm(stripParen(t)) || norm(t)
    return b.length > 0 && title.includes(b)
  })
  if (!titleOk) return -99
  let s = isTopic ? 14 : 10
  if (/official (audio|music video|video)|공식|m\/?v/i.test(rawTitle)) s += 1
  if (
    /live|cover|커버|라이브|reaction|karaoke|노래방|1 ?hour|loop|sped ?up|slowed|teaser|티저|behind|비하인드|instrumental|inst\.?\)/i.test(
      rawTitle,
    )
  )
    s -= 6
  return s
}

/** PT3M25S → 205초 */
function isoSeconds(d?: string) {
  const m = d?.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!m) return null
  return +(m[1] || 0) * 86400 + +(m[2] || 0) * 3600 + +(m[3] || 0) * 60 + +(m[4] || 0)
}

/** 영상 길이 (영상 50개까지 한 번에, 1점만 써요). 지워졌거나 비공개면 빠져요. */
async function videoSeconds(ids: string[], key: string): Promise<Map<string, number> | null> {
  if (!ids.length) return new Map()
  const url = new URL('https://www.googleapis.com/youtube/v3/videos')
  url.search = new URLSearchParams({ part: 'contentDetails', id: ids.join(','), key }).toString()
  const res = await fetch(url, { cache: 'no-store' }).catch(() => null)
  if (!res?.ok) return null
  const items =
    ((await res.json()) as { items?: { id: string; contentDetails?: { duration?: string } }[] })
      .items || []
  const out = new Map<string, number>()
  for (const it of items) {
    const sec = isoSeconds(it.contentDetails?.duration)
    if (sec !== null) out.set(it.id, sec)
  }
  return out
}

/**
 * 영상 길이가 곡과 맞는지. 쇼츠·짧은 미리보기·티저를 걸러요.
 * 곡 길이를 알면 ±15%(최소 20초)까지, 모르면 1분 이상이면 통과.
 */
function lengthOk(video: number | undefined, song: number | null | undefined) {
  if (video === undefined) return false
  if (song) return Math.abs(video - song) <= Math.max(20, song * 0.15)
  return video >= 60
}

/**
 * 느슨한 기준 — 뮤직비디오는 앞뒤 인트로·아웃트로 때문에 음원보다 꽤 길 수 있어요.
 * 공식 채널 + 제목이 맞는 영상이면, 곡보다 조금 짧거나(최대 15%) 꽤 길어도(최대 1.6배 + 90초) 받아요.
 * 쇼츠·티저처럼 1분 안 되는 영상은 여전히 버려요.
 */
function lengthLoose(video: number | undefined, song: number | null | undefined) {
  if (video === undefined || video < 60) return false
  if (!song) return true
  return video >= song * 0.85 - 20 && video <= song * 1.6 + 90
}

async function useQuota(payload: Payload) {
  const g = (await payload.findGlobal({ slug: 'youtube-usage', overrideAccess: true })) as {
    day?: string | null
    count?: number | null
  }
  const day = `pt-${quotaDay()}`
  const count = g.day === day ? g.count || 0 : 0
  if (count >= DAILY_LIMIT) return false
  await payload.updateGlobal({
    slug: 'youtube-usage',
    overrideAccess: true,
    data: { day, count: count + 1 },
  })
  return true
}

export async function resolveYoutube(
  payload: Payload,
  pickId: number,
  opts: { debug?: boolean } = {},
): Promise<{
  id: string | null
  reason?: string
  candidates?: unknown[]
  q?: string
  names?: unknown
}> {
  const pick = await payload
    .findByID({ collection: 'picks', id: pickId, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!pick) return { id: null, reason: 'not-found' }
  if (pick.youtubeId && !opts.debug) return { id: pick.youtubeId }
  const missAt = pick.youtubeMissAt ? new Date(pick.youtubeMissAt).getTime() : 0
  if (
    !opts.debug &&
    missAt &&
    missAt >= RELAXED_AT &&
    Date.now() - missAt < MISS_DAYS * 86400_000
  ) {
    return { id: null, reason: 'miss' }
  }
  const key = process.env.YOUTUBE_API_KEY?.trim()
  if (!key) return { id: null, reason: 'no-key' }
  if (!(await useQuota(payload))) return { id: null, reason: 'quota' }

  const artist = pick.artistName || ''
  const track = pick.track || ''
  const sid = parseSpotify(pick.spotifyUrl)?.id
  const en = sid ? await trackNamesEn(sid) : null
  const names: Names = {
    tracks: [...new Set([track, en?.track].filter(Boolean) as string[])],
    artists: [...new Set([...artist.split(', '), ...(en?.artists || [])].filter(Boolean))],
  }
  // 「topic」을 붙이면 YouTube Music 공식 음원이 위로 올라와요. 공식 음원은 영어 이름인 경우가 많아 영어 이름으로 찾아요.
  const qArtist = en?.artists[0] || artist.split(', ')[0]
  const qTrack = stripParen(en?.track || track) || en?.track || track
  const q = `${qArtist} ${qTrack} topic`.trim()
  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.search = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    maxResults: '10',
    regionCode: 'KR',
    q,
    key,
  }).toString()
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return { id: null, reason: `api-${res.status}` }
  const items = (((await res.json()) as { items?: SearchItem[] }).items || []).filter(
    (it) => it.id?.videoId,
  )
  const ranked = items.map((it) => ({ it, s: score(it, names) })).sort((x, y) => y.s - x.s)
  if (opts.debug) {
    return {
      id: ranked[0] && ranked[0].s >= 10 ? ranked[0].it.id!.videoId! : null,
      q,
      names,
      candidates: ranked.map((r) => ({
        s: r.s,
        title: r.it.snippet?.title,
        channel: r.it.snippet?.channelTitle,
        id: r.it.id?.videoId,
      })),
    }
  }
  // 공식 채널 영상 중에서 곡 길이와 맞는 첫 영상 (쇼츠·짧은 클립은 버려요)
  const good = ranked.filter((r) => r.s >= 10).slice(0, 6)
  const secs = good.length
    ? await videoSeconds(
        good.map((r) => r.it.id!.videoId!),
        key,
      )
    : null
  // 1차: 길이가 곡과 거의 같은 영상(공식 음원) → 2차: 길이를 넉넉하게 본 영상(뮤직비디오 등)
  const best =
    good.find((r) => (secs ? lengthOk(secs.get(r.it.id!.videoId!), en?.duration) : true)) ||
    good.find((r) => (secs ? lengthLoose(secs.get(r.it.id!.videoId!), en?.duration) : false))
  // 공식 채널 영상이 없거나 제목이 곡과 안 맞으면 쓰지 않아요 (Spotify로 재생)
  if (!best) {
    await payload.update({
      collection: 'picks',
      id: pickId,
      overrideAccess: true,
      data: { youtubeMissAt: new Date().toISOString() },
    })
    return { id: null, reason: 'no-match' }
  }
  const id = best.it.id!.videoId!
  await payload.update({
    collection: 'picks',
    id: pickId,
    overrideAccess: true,
    data: { youtubeId: id, youtubeCheckedAt: new Date().toISOString() },
  })
  return { id }
}

/** 영상이 다른 사이트에서 재생 금지(오류 101·150)일 때: 저장한 영상을 지우고 한동안 다시 찾지 않아요 */
export async function markYoutubeBad(payload: Payload, pickId: number, videoId: string) {
  const pick = await payload
    .findByID({ collection: 'picks', id: pickId, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!pick || pick.youtubeId !== videoId) return
  await payload.update({
    collection: 'picks',
    id: pickId,
    overrideAccess: true,
    data: { youtubeId: null, youtubeMissAt: new Date().toISOString() },
  })
}

/**
 * 이미 저장해 둔 영상의 길이를 곡 길이와 맞춰 봐요 (한 번에 50곡, 1점).
 * 쇼츠·짧은 클립이거나 지워진 영상이면 지워서, 다음에 들을 때 다시 찾게 해요.
 */
export async function checkSavedYoutube(payload: Payload) {
  const key = process.env.YOUTUBE_API_KEY?.trim()
  if (!key) return { checked: 0, cleared: 0, left: 0 }
  const db = payload.db as unknown as {
    drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
  const { sql } = await import('@payloadcms/db-postgres')
  const rows = (
    await db.drizzle.execute(
      sql`select id, youtube_id, spotify_url from picks where youtube_id is not null and youtube_checked_at is null order by id limit 50`,
    )
  ).rows
  const left = Number(
    (
      await db.drizzle.execute(
        sql`select count(*)::int as n from picks where youtube_id is not null and youtube_checked_at is null`,
      )
    ).rows[0]?.n || 0,
  )
  if (!rows.length) return { checked: 0, cleared: 0, left: 0 }
  const secs = await videoSeconds(
    rows.map((r) => String(r.youtube_id)),
    key,
  )
  if (!secs) return { checked: 0, cleared: 0, left }
  let cleared = 0
  for (const r of rows) {
    const vid = String(r.youtube_id)
    const v = secs.get(vid)
    let ok = v !== undefined && v >= 90 // 1분 반 넘으면 그대로 믿어요
    if (!ok && v !== undefined) {
      // 짧은 영상은 곡 길이를 확인해서 비교해요 (원래 짧은 곡일 수도 있으니)
      const sid = parseSpotify(String(r.spotify_url || ''))?.id
      const en = sid ? await trackNamesEn(sid) : null
      ok = lengthOk(v, en?.duration)
    }
    const data = ok
      ? { youtubeCheckedAt: new Date().toISOString() }
      : { youtubeId: null, youtubeMissAt: null, youtubeCheckedAt: new Date().toISOString() }
    if (!ok) cleared++
    await payload.update({ collection: 'picks', id: Number(r.id), overrideAccess: true, data })
  }
  return { checked: rows.length, cleared, left: Math.max(0, left - rows.length) }
}

/**
 * 아직 영상이 없는 곡들을 한꺼번에 찾아요 (매일 Vercel 예약 실행 · 관리자가 직접 부를 때).
 * 인터뷰·아티스트 페이지가 있는 아티스트 곡 먼저, 그다음 최근에 넣은 곡부터.
 * 하루 한도(90번)를 다 쓰거나 시간이 다 되면 멈춰요.
 */
export async function fillYoutube(payload: Payload, budgetMs = 50_000) {
  const started = Date.now()
  if (!youtubeConfigured()) return { tried: 0, found: 0, missed: 0, stop: 'no-key', left: null }
  const db = payload.db as unknown as {
    drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
  const { sql } = await import('@payloadcms/db-postgres')
  const rows = (
    await db.drizzle.execute(
      sql`select id, artist_name, picked_at, youtube_miss_at from picks where youtube_id is null`,
    )
  ).rows
  const artists = (await db.drizzle.execute(sql`select name, name_alt from artists`)).rows.flatMap(
    (a) => [String(a.name || ''), ...String(a.name_alt || '').split(/[,，]/)],
  )
  const known = new Set(artists.map((n) => n.trim().toLowerCase()).filter((n) => n.length >= 2))
  const now = Date.now()
  const open = rows.filter((r) => {
    const m = r.youtube_miss_at ? new Date(String(r.youtube_miss_at)).getTime() : 0
    return !(m && m >= RELAXED_AT && now - m < MISS_DAYS * 86400_000)
  })
  const isKnown = (r: Record<string, unknown>) =>
    String(r.artist_name || '')
      .split(', ')
      .some((n) => known.has(n.trim().toLowerCase()))
  const byRecent = (a: Record<string, unknown>, b: Record<string, unknown>) =>
    String(b.picked_at || '').localeCompare(String(a.picked_at || ''))
  const queue = [
    ...open.filter(isKnown).sort(byRecent),
    ...open.filter((r) => !isKnown(r)).sort(byRecent),
  ].map((r) => Number(r.id))
  let tried = 0
  let found = 0
  let missed = 0
  let stop: string | null = null
  // 세 곡씩 동시에 찾아요
  while (queue.length && !stop && Date.now() - started < budgetMs) {
    const batch = queue.splice(0, 3)
    const res = await Promise.all(
      batch.map((id) => resolveYoutube(payload, id).catch(() => ({ id: null, reason: 'error' }))),
    )
    for (const r of res) {
      if (
        r.reason === 'quota' ||
        r.reason === 'no-key' ||
        String(r.reason || '').startsWith('api-')
      ) {
        stop = r.reason || 'stop'
        continue
      }
      tried++
      if (r.id) found++
      else missed++
    }
  }
  return { tried, found, missed, stop, left: queue.length }
}
