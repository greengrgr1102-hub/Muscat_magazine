import 'server-only'
import type { Payload } from 'payload'
import { parseSpotify } from '../collections/Picks'

// Spotify 연동 — 에디터 본인 계정의 플레이리스트를 읽어 Editor's Picks로 옮깁니다.
// 필요한 환경 변수: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET (Vercel 프로젝트 설정에서 입력)

export const SPOTIFY_SCOPES = 'playlist-read-private playlist-read-collaborative'

export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SERVER_URL) return process.env.NEXT_PUBLIC_SERVER_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return 'http://localhost:3000'
}
export const redirectUri = () => `${siteUrl()}/spotify/callback`
// 붙여넣을 때 섞여 들어간 공백·줄바꿈은 떼어냅니다.
export const clientId = () => (process.env.SPOTIFY_CLIENT_ID || '').trim()
const clientSecret = () => (process.env.SPOTIFY_CLIENT_SECRET || '').trim()
const KEY = /^[0-9a-f]{32}$/i

// 키가 없거나 형식이 이상하면 이유를 알려줍니다. 문제 없으면 null.
export function spotifyKeyProblem(): string | null {
  const id = clientId()
  const secret = clientSecret()
  if (!id || !secret) return 'Vercel에 SPOTIFY_CLIENT_ID와 SPOTIFY_CLIENT_SECRET이 아직 없어요.'
  if (!KEY.test(id))
    return id.startsWith('http')
      ? 'SPOTIFY_CLIENT_ID에 주소(URL)가 들어가 있어요. Spotify 앱 화면의 Client ID(32자리)로 바꿔 주세요.'
      : 'SPOTIFY_CLIENT_ID 형식이 이상해요. Spotify 앱 화면의 Client ID(영문·숫자 32자리)를 다시 붙여넣어 주세요.'
  if (!KEY.test(secret)) return 'SPOTIFY_CLIENT_SECRET 형식이 이상해요. 「View client secret」으로 나온 32자리 값을 다시 붙여넣어 주세요.'
  if (id.toLowerCase() === secret.toLowerCase()) return 'Client ID와 Client secret에 같은 값이 들어가 있어요. 두 값은 서로 달라요.'
  return null
}
export const spotifyConfigured = () => spotifyKeyProblem() === null

function basicAuth() {
  return 'Basic ' + Buffer.from(`${clientId()}:${clientSecret()}`).toString('base64')
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

class SpotifyBusy extends Error {}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Spotify가 "너무 자주 물어본다(429)"고 하면 알려준 시간만큼 기다렸다가 한 번 더 시도해요.
async function getJSON<T>(url: string, token: string, deadline: number): Promise<{ status: number; body?: T }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (res.status === 429) {
      const wait = (Number(res.headers.get('retry-after')) || 5) * 1000
      if (Date.now() + wait > deadline) throw new SpotifyBusy(`Spotify가 잠깐 쉬어 가재요. ${Math.ceil(wait / 1000)}초쯤 뒤에 다시 가져와 주세요.`)
      await sleep(wait)
      continue
    }
    if (!res.ok) return { status: res.status }
    return { status: res.status, body: (await res.json()) as T }
  }
  throw new SpotifyBusy('Spotify가 잠깐 쉬어 가재요. 조금 뒤에 다시 가져와 주세요.')
}

type ItemsPage = { items?: SpItem[]; next?: string | null; total?: number }

/** 플레이리스트 곡 목록. from 번째 곡부터 끝까지 읽어요 (처음이면 0부터 전부). */
async function playlistItems(token: string, id: string, from: number, deadline: number) {
  // 2026년 2월 Spotify API 변경으로 /items 가 새 주소예요. 혹시 안 되면 예전 /tracks 로 한 번 더 시도해요.
  for (const path of ['items', 'tracks']) {
    const base = `https://api.spotify.com/v1/playlists/${id}/${path}`
    const first = await getJSON<ItemsPage>(`${base}?limit=1`, token, deadline)
    if (!first.body) {
      if (path === 'tracks' || first.status === 401 || first.status === 429) {
        throw new Error(
          first.status === 403 || first.status === 404
            ? `플레이리스트를 읽지 못했어요 (${first.status}). 내 계정에서 만든 플레이리스트인지 확인해 주세요.`
            : `플레이리스트를 읽지 못했어요 (${first.status}).`,
        )
      }
      continue
    }
    const total = first.body.total ?? 0
    const start = Math.min(Math.max(0, from), Math.max(0, total - 1))
    const out: SpItem[] = []
    let url: string | null = `${base}?limit=50&offset=${start}`
    while (url) {
      const page: { status: number; body?: ItemsPage } = await getJSON<ItemsPage>(url, token, deadline)
      if (!page.body) throw new Error(`플레이리스트를 읽지 못했어요 (${page.status}).`)
      out.push(...(page.body.items || []))
      url = page.body.next || null
    }
    return { items: out, total }
  }
  return { items: [] as SpItem[], total: 0 }
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
  const started = Date.now()
  const BUDGET_MS = 40_000 // 한 번에 너무 오래 걸리면 끊기므로, 40초 안에서 가져오고 나머지는 다음에 이어서
  try {
    const tok = await refreshAccess(cfg.refreshToken)
    // 지난번에 끝까지 본 곳 조금 앞부터 읽어요. 처음이거나 기록이 없으면, 이미 가져온 곡 수를 보고 판단해요.
    const picksCount = (await payload.count({ collection: 'picks', overrideAccess: true })).totalDocs
    const seen = typeof cfg.scannedCount === 'number' ? cfg.scannedCount : picksCount
    const from = Math.max(0, seen - 50)
    const { items, total } = await playlistItems(tok.access_token, pid, from, started + 50_000)
    const artists = (await payload.find({ collection: 'artists', limit: 1000, depth: 0, overrideAccess: true })).docs
    // 이미 있는 곡 목록을 한 번에 불러와서 비교합니다.
    const existing = await payload.find({
      collection: 'picks',
      pagination: false,
      depth: 0,
      overrideAccess: true,
      select: { spotifyUrl: true },
    })
    const have = new Set(
      existing.docs.map((d) => parseSpotify((d as { spotifyUrl?: string }).spotifyUrl || '')?.id).filter(Boolean) as string[],
    )
    const todo = items
      .map((it) => ({ it, t: it.item || it.track }))
      .filter(({ t }) => t?.id && (!t.type || t.type === 'track') && !have.has(t.id))
    let left = 0
    for (let i = 0; i < todo.length; i++) {
      if (Date.now() - started > BUDGET_MS) {
        left = todo.length - i
        break
      }
      const { it, t } = todo[i]
      if (!t?.id || have.has(t.id)) continue
      have.add(t.id)
      const names = (t.artists || []).map((a) => a.name)
      const match = artists.find((a) =>
        names.some((n) => norm(n) === norm(a.name) || (a.nameAlt && norm(a.nameAlt).includes(norm(n)))),
      )
      await payload.create({
        collection: 'picks',
        overrideAccess: true,
        data: {
          spotifyUrl: `https://open.spotify.com/track/${t.id}`,
          track: t.name,
          artistName: names.join(', ') || 'Unknown',
          coverUrl: t.album?.images?.[0]?.url,
          pickedAt: it.added_at || new Date().toISOString(),
          artist: match?.id,
        },
      })
      added++
    }
    message = left
      ? `새 곡 ${added}곡을 가져왔어요. 곡이 많아서 ${left}곡은 남았어요 — 「지금 가져오기」를 한 번 더 누르면 이어서 가져와요.`
      : added
        ? `새 곡 ${added}곡을 가져왔어요.`
        : '새로 추가된 곡이 없어요.'
    await payload.updateGlobal({
      slug: 'spotify-sync',
      overrideAccess: true,
      data: {
        // 남은 곡이 있으면 다음 자동 확인 때 바로 이어서 가져오도록 시각을 비워 둡니다.
        lastSyncedAt: left ? null : new Date().toISOString(),
        ...(left ? {} : { scannedCount: total }),
        lastResult: message,
        ...(tok.refresh_token ? { refreshToken: tok.refresh_token } : {}),
      },
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
