import { sql } from '@payloadcms/db-postgres'
import { NextResponse } from 'next/server'
import { getClient } from '@/lib/data'

function spotifyEmbed(url?: string | null) {
  const m = String(url || '').match(
    /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/,
  )
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` : null
}
const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// 페스티벌 출연진 바로 듣기
// ?a=아티스트 하나 → 그 아티스트 곡(앨범마다 한 곡 먼저) / ?a=여러 명 → 아티스트마다 한 곡씩
export async function GET(req: Request) {
  const names = new URL(req.url).searchParams
    .getAll('a')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 150)
  if (!names.length) return NextResponse.json({ songs: [] })
  const payload = await getClient()
  const db = payload.db as unknown as {
    drizzle: { execute: (x: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
  const one = names.length === 1
  const conds = names.map((n) => sql`artist_name ~* ${`(^|,\\s*)${reEsc(n)}(\\s*,|$)`}`)
  const res = await db.drizzle.execute(sql`
    select id, track, artist_name, cover_url, spotify_url, youtube_id, album
    from picks
    where ${sql.join(conds, sql` or `)}
    order by random()
    limit ${one ? 200 : 3000}`)
  const rows = res.rows
  let pickRows: typeof rows
  if (one) {
    // 앨범마다 한 곡을 먼저, 그다음 나머지 (최대 30곡)
    const seen = new Set<string>()
    const first: typeof rows = []
    const rest: typeof rows = []
    for (const r of rows) {
      const k = String(r.album || r.id)
      if (seen.has(k)) rest.push(r)
      else {
        seen.add(k)
        first.push(r)
      }
    }
    pickRows = [...first, ...rest].slice(0, 30)
  } else {
    // 아티스트마다 한 곡, 출연진 순서대로
    const byName = new Map<string, (typeof rows)[number]>()
    for (const r of rows) {
      const artist = String(r.artist_name || '')
      const n = names.find((x) => new RegExp(`(^|,\\s*)${reEsc(x)}(\\s*,|$)`, 'i').test(artist))
      if (n && !byName.has(n)) byName.set(n, r)
    }
    pickRows = names.map((n) => byName.get(n)).filter(Boolean) as typeof rows
  }
  const songs = pickRows.map((r) => ({
    id: Number(r.id),
    track: (r.track as string) || null,
    artistName: String(r.artist_name || ''),
    coverUrl: (r.cover_url as string) || null,
    embed: spotifyEmbed(r.spotify_url as string),
    youtubeId: (r.youtube_id as string) || null,
  }))
  return NextResponse.json({ songs }, { headers: { 'Cache-Control': 'no-store' } })
}
