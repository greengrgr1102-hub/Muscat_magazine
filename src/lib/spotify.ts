import 'server-only'
import type { Payload } from 'payload'

// Spotify 연동 — 에디터 본인 계정의 플레이리스트를 읽어 Editor's Picks로 옮깁니다.
// 필요한 환경 변수: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET (Vercel 프로젝트 설정에서 입력)

export const SPOTIFY_SCOPES = 'playlist-read-private playlist-read-collaborative'

export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SERVER_URL) return process.env.NEXT_PUBLIC_SERVER_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return 'http://localhost:3000'
}
export const redirectUri = () => `${siteUrl()}/spotify/callback`
export const spotifyConfigured = () => Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET)

function basicAuth() {
  return 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')
}

export async function exchangeCode(code: string) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri() }),
  })
  if (!res.ok) throw new Error(`Spotify 로그인 실패 (${res.status})`)
  return (await res.json()) as { access_token: string; refresh_token: string }
}

async function refreshAccess(refreshToken: string) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })
  if (!res.ok) throw new Error(`Spotify 연결이 만료됐어요. /spotify 에서 다시 연결해 주세요. (${res.status})`)
  return (await res.json()) as { access_token: string; refresh_token?: string }
}

export async function spotifyMe(accessToken: string) {
  const res = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) return null
  const me = (await res.json()) as { display_name?: string; id?: string }
  return me.display_name || me.id || null
}

export function playlistId(url?: string | null) {
  return url?.match(/playlist\/([A-Za-z0-9]+)/)?.[1] || null
}

type SpTrack = {
  id?: string
  name?: string
  type?: string
  artists?: { name: string }[]
  album?: { images?: { url: string }[] }
  external_urls?: { spotify?: string }
}
type SpItem = { added_at?: string; item?: SpTrack; track?: SpTrack }

async function playlistItems(token: string, id: string): Promise<SpItem[]> {
  const out: SpItem[] = []
  // 2026년 2월 Spotify API 변경으로 /items 가 새 주소예요. 혹시 안 되면 예전 /tracks 로 한 번 더 시도해요.
  for (const path of ['items', 'tracks']) {
    let url: string | null = `https://api.spotify.com/v1/playlists/${id}/${path}?limit=50`
    let ok = true
    while (url) {
      const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        ok = false
        if (path === 'tracks' || res.status === 401) throw new Error(`플레이리스트를 읽지 못했어요 (${res.status}). 내 계정의 플레이리스트인지 확인해 주세요.`)
        break
      }
      const page = (await res.json()) as { items?: SpItem[]; next?: string | null }
      out.push(...(page.items || []))
      url = page.next || null
    }
    if (ok) return out
    out.length = 0
  }
  return out
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')

/** 플레이리스트에 새로 추가된 곡만 Editor's Picks로 만듭니다. 이미 있는 곡은 건너뛰어요. */
export async function syncPlaylist(payload: Payload, { minIntervalMin = 0 } = {}) {
  const cfg = await payload.findGlobal({ slug: 'spotify-sync', overrideAccess: true })
  if (!spotifyConfigured() || !cfg.refreshToken) return { skipped: 'not-connected' as const }
  const pid = playlistId(cfg.playlistUrl)
  if (!pid) return { skipped: 'no-playlist' as const }
  if (minIntervalMin && cfg.lastSyncedAt && Date.now() - new Date(cfg.lastSyncedAt).getTime() < minIntervalMin * 60_000) {
    return { skipped: 'recent' as const }
  }

  let added = 0
  let message = ''
  try {
    const tok = await refreshAccess(cfg.refreshToken)
    const items = await playlistItems(tok.access_token, pid)
    const artists = (await payload.find({ collection: 'artists', limit: 1000, depth: 0, overrideAccess: true })).docs
    for (const it of items) {
      const t = it.item || it.track
      if (!t?.id || (t.type && t.type !== 'track')) continue
      const url = `https://open.spotify.com/track/${t.id}`
      const exists = await payload.find({
        collection: 'picks',
        where: { spotifyUrl: { like: t.id } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (exists.docs.length) continue
      const names = (t.artists || []).map((a) => a.name)
      const match = artists.find((a) =>
        names.some((n) => norm(n) === norm(a.name) || (a.nameAlt && norm(a.nameAlt).includes(norm(n)))),
      )
      await payload.create({
        collection: 'picks',
        overrideAccess: true,
        data: {
          spotifyUrl: url,
          track: t.name,
          artistName: names.join(', ') || 'Unknown',
          coverUrl: t.album?.images?.[0]?.url,
          pickedAt: it.added_at || new Date().toISOString(),
          artist: match?.id,
        },
      })
      added++
    }
    message = added ? `새 곡 ${added}곡을 가져왔어요.` : '새로 추가된 곡이 없어요.'
    await payload.updateGlobal({
      slug: 'spotify-sync',
      overrideAccess: true,
      data: { lastSyncedAt: new Date().toISOString(), lastResult: message, ...(tok.refresh_token ? { refreshToken: tok.refresh_token } : {}) },
    })
  } catch (e) {
    message = e instanceof Error ? e.message : '동기화 중 문제가 생겼어요.'
    await payload.updateGlobal({
      slug: 'spotify-sync',
      overrideAccess: true,
      data: { lastSyncedAt: new Date().toISOString(), lastResult: `오류: ${message}` },
    })
    return { error: message }
  }
  return { added, message }
}
