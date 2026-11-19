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

type SearchItem = { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }

const norm = (s: string) => s.toLowerCase().replace(/[\s'’"「」()\[\]\-–—.,!?·:]/g, '')

function score(it: SearchItem, track: string, artist: string) {
  const title = norm(it.snippet?.title || '')
  const ch = it.snippet?.channelTitle || ''
  const a = norm(artist.split(', ')[0] || '')
  let s = 0
  if (/ - Topic$/.test(ch)) s += 5 // 유튜브 뮤직 공식 음원 채널
  if (a && (norm(ch).includes(a) || title.includes(a))) s += 3
  if (title.includes(norm(track))) s += 3
  if (/official (audio|music video|video)|공식|audio|lyric/i.test(it.snippet?.title || '')) s += 1
  if (/live|cover|커버|라이브|reaction|karaoke|노래방|1 ?hour|loop|sped ?up|slowed/i.test(it.snippet?.title || '')) s -= 4
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

export async function resolveYoutube(payload: Payload, pickId: number): Promise<{ id: string | null; reason?: string }> {
  const pick = await payload
    .findByID({ collection: 'picks', id: pickId, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!pick) return { id: null, reason: 'not-found' }
  if (pick.youtubeId) return { id: pick.youtubeId }
  if (pick.youtubeMissAt && Date.now() - new Date(pick.youtubeMissAt).getTime() < MISS_DAYS * 86400_000) {
    return { id: null, reason: 'miss' }
  }
  const key = process.env.YOUTUBE_API_KEY?.trim()
  if (!key) return { id: null, reason: 'no-key' }
  if (!(await useQuota(payload))) return { id: null, reason: 'quota' }

  const artist = pick.artistName || ''
  const track = pick.track || ''
  const q = `${artist.split(', ')[0]} ${track}`.trim()
  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.search = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    maxResults: '6',
    regionCode: 'KR',
    q,
    key,
  }).toString()
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return { id: null, reason: `api-${res.status}` }
  const items = (((await res.json()) as { items?: SearchItem[] }).items || []).filter((it) => it.id?.videoId)
  const best = items.map((it) => ({ it, s: score(it, track, artist) })).sort((x, y) => y.s - x.s)[0]
  if (!best || best.s < 2) {
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
