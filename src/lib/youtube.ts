import 'server-only'
import type { Payload } from 'payload'

// 곡 하나에 맞는 YouTube 영상 찾기.
// YouTube Data API 검색은 하루 무료 한도(10,000점, 검색 1번 = 100점)가 있어서 하루 90번까지만 검색해요.
// 한 번 찾은 영상은 곡에 저장해 두고 다시 검색하지 않아요.
const DAILY_LIMIT = 90
const MISS_DAYS = 30

const kstDay = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)

export function youtubeConfigured() {
  return Boolean(process.env.YOUTUBE_API_KEY?.trim())
}

type SearchItem = { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; description?: string } }

const norm = (s: string) => s.toLowerCase().replace(/[\s'’"「」()\[\]\-–—.,!?·:]/g, '')

/**
 * 공식 영상만 써요.
 * - 「아티스트 - Topic」 채널 (YouTube Music 공식 음원, 설명이 "Provided to YouTube by …"로 시작)
 * - 아티스트 본인 채널 (채널 이름에 아티스트 이름이 들어 있음) · VEVO
 * 팬 업로드·가사 영상·커버·라이브 등은 버려요.
 */
function officialKind(it: SearchItem, artist: string): 'topic' | 'artist' | null {
  const ch = it.snippet?.channelTitle || ''
  const desc = it.snippet?.description || ''
  if (/ - Topic$/.test(ch) || /^Provided to YouTube by/i.test(desc)) return 'topic'
  const names = artist
    .split(', ')
    .map(norm)
    .filter((a) => a.length >= 2)
  const c = norm(ch)
  if (/vevo$/i.test(ch) && names.some((a) => c.startsWith(a))) return 'artist'
  if (names.some((a) => c === a || c === `${a}official` || c === `official${a}` || c.startsWith(a))) return 'artist'
  return null
}

function score(it: SearchItem, track: string, artist: string) {
  const kind = officialKind(it, artist)
  if (!kind) return -99
  const rawTitle = it.snippet?.title || ''
  const title = norm(rawTitle)
  // 곡 제목이 영상 제목에 들어 있어야 해요 (feat. 같은 괄호 부분은 빼고 비교)
  const base = norm(track.replace(/\s*[([（【].*?[)\]）】]/g, '')) || norm(track)
  if (!base || !title.includes(base)) return -99
  let s = kind === 'topic' ? 10 : 6
  s += 4
  if (/official (audio|music video|video)|공식|m\/?v/i.test(rawTitle)) s += 1
  if (/live|cover|커버|라이브|reaction|karaoke|노래방|1 ?hour|loop|sped ?up|slowed|teaser|티저|behind|비하인드/i.test(rawTitle)) s -= 6
  return s
}

async function useQuota(payload: Payload) {
  const g = (await payload.findGlobal({ slug: 'youtube-usage', overrideAccess: true })) as { day?: string | null; count?: number | null }
  const day = kstDay()
  const count = g.day === day ? g.count || 0 : 0
  if (count >= DAILY_LIMIT) return false
  await payload.updateGlobal({ slug: 'youtube-usage', overrideAccess: true, data: { day, count: count + 1 } })
  return true
}

export async function resolveYoutube(
  payload: Payload,
  pickId: number,
  opts: { debug?: boolean } = {},
): Promise<{ id: string | null; reason?: string; candidates?: unknown[] }> {
  const pick = await payload
    .findByID({ collection: 'picks', id: pickId, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!pick) return { id: null, reason: 'not-found' }
  if (pick.youtubeId && !opts.debug) return { id: pick.youtubeId }
  if (!opts.debug && pick.youtubeMissAt && Date.now() - new Date(pick.youtubeMissAt).getTime() < MISS_DAYS * 86400_000) {
    return { id: null, reason: 'miss' }
  }
  const key = process.env.YOUTUBE_API_KEY?.trim()
  if (!key) return { id: null, reason: 'no-key' }
  if (!(await useQuota(payload))) return { id: null, reason: 'quota' }

  const artist = pick.artistName || ''
  const track = pick.track || ''
  // 「- Topic」을 붙이면 YouTube Music 공식 음원이 위로 올라와요
  const q = `${artist.split(', ')[0]} ${track} topic`.trim()
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
  const items = (((await res.json()) as { items?: SearchItem[] }).items || []).filter((it) => it.id?.videoId)
  const ranked = items.map((it) => ({ it, s: score(it, track, artist) })).sort((x, y) => y.s - x.s)
  if (opts.debug) {
    return {
      id: ranked[0] && ranked[0].s >= 10 ? ranked[0].it.id!.videoId! : null,
      candidates: ranked.map((r) => ({ s: r.s, title: r.it.snippet?.title, channel: r.it.snippet?.channelTitle, id: r.it.id?.videoId })),
    }
  }
  const best = ranked[0]
  // 공식 채널 영상이 없거나 제목이 곡과 안 맞으면 쓰지 않아요 (Spotify로 재생)
  if (!best || best.s < 10) {
    await payload.update({ collection: 'picks', id: pickId, overrideAccess: true, data: { youtubeMissAt: new Date().toISOString() } })
    return { id: null, reason: 'no-match' }
  }
  const id = best.it.id!.videoId!
  await payload.update({ collection: 'picks', id: pickId, overrideAccess: true, data: { youtubeId: id } })
  return { id }
}

/** 영상이 다른 사이트에서 재생 금지(오류 101·150)일 때: 저장한 영상을 지우고 한동안 다시 찾지 않아요 */
export async function markYoutubeBad(payload: Payload, pickId: number, videoId: string) {
  const pick = await payload.findByID({ collection: 'picks', id: pickId, depth: 0, overrideAccess: true }).catch(() => null)
  if (!pick || pick.youtubeId !== videoId) return
  await payload.update({
    collection: 'picks',
    id: pickId,
    overrideAccess: true,
    data: { youtubeId: null, youtubeMissAt: new Date().toISOString() },
  })
}
