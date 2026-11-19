import { NextResponse } from 'next/server'
import type { Where } from 'payload'
import { getClient } from '@/lib/data'

// 취향 찾기용 데이터
//  ?step=sample&g=dream-pop,shoegaze  → 들어볼 곡 10개 (고른 장르에서 고루, 없으면 전체에서)
//  ?step=result&liked=1,2,3&g=…       → 취향 요약 + 추천곡 20개

function spotifyEmbed(url: string) {
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/)
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` : null
}
type Doc = {
  id: number
  track?: string | null
  artistName: string
  coverUrl?: string | null
  spotifyUrl: string
  releaseDate?: string | null
  genres?: (number | { id: number; name: string; slug: string })[] | null
}
const row = (d: Doc, names: Map<number, string>) => ({
  id: d.id,
  track: d.track,
  artistName: d.artistName,
  coverUrl: d.coverUrl,
  embed: spotifyEmbed(d.spotifyUrl),
  genres: [...new Set((d.genres || []).map((g) => (typeof g === 'object' ? g.name : names.get(g) || '')).filter(Boolean))],
})
const gid = (g: number | { id: number }) => (typeof g === 'object' ? g.id : g)
function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const SELECT = { track: true, artistName: true, coverUrl: true, spotifyUrl: true, releaseDate: true, genres: true } as const

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const payload = await getClient()
  const allGenres = (await payload.find({ collection: 'genres', pagination: false, depth: 0 })).docs
  const names = new Map(allGenres.map((g) => [g.id, g.name]))
  const bySlug = new Map(allGenres.map((g) => [g.slug as string, g.id]))
  const chosen = (sp.get('g') || '')
    .split(',')
    .map((s) => bySlug.get(s.trim()))
    .filter((x): x is number => typeof x === 'number')
    .slice(0, 3)

  if (sp.get('step') === 'sample') {
    const exclude = (sp.get('not') || '').split(',').map(Number).filter(Number.isInteger)
    const where: Where = chosen.length ? { genres: { in: chosen } } : { genres: { exists: true } }
    const pool = (
      await payload.find({
        collection: 'picks',
        where: exclude.length ? { and: [where, { id: { not_in: exclude } }] } : where,
        pagination: false,
        depth: 0,
        select: SELECT,
      })
    ).docs as unknown as Doc[]
    shuffle(pool)
    // 고른 장르마다 골고루, 한 아티스트는 한 곡만
    const out: Doc[] = []
    const artists = new Set<string>()
    const buckets = chosen.length ? chosen.map((g) => pool.filter((p) => (p.genres || []).map(gid).includes(g))) : [pool]
    const artistOf = (p: Doc) => p.artistName.split(',')[0].trim().toLowerCase()
    // 1) 커버 있고 아티스트 겹치지 않게 → 2) 아티스트만 안 겹치게 → 3) 아무거나
    const rules = [
      (p: Doc) => Boolean(p.coverUrl) && !artists.has(artistOf(p)),
      (p: Doc) => !artists.has(artistOf(p)),
      () => true,
    ]
    for (const ok of rules) {
      for (let round = 0; out.length < 10 && round < 40; round++) {
        let added = false
        for (const b of buckets) {
          const next = b.find((p) => !out.includes(p) && ok(p))
          if (next) {
            out.push(next)
            artists.add(artistOf(next))
            added = true
          }
          if (out.length >= 10) break
        }
        if (!added) break
      }
    }
    return NextResponse.json({ songs: out.map((d) => row(d, names)) })
  }

  // 결과: 좋아요 한 곡들의 장르로 취향을 만들고, 그 취향에 가까운 곡을 골라요.
  const liked = (sp.get('liked') || '').split(',').map(Number).filter(Number.isInteger).slice(0, 30)
  const likedDocs = liked.length
    ? ((await payload.find({ collection: 'picks', where: { id: { in: liked } }, limit: liked.length, depth: 0, select: SELECT }))
        .docs as unknown as Doc[])
    : []
  const weight = new Map<number, number>()
  for (const d of likedDocs) for (const g of (d.genres || []).map(gid)) weight.set(g, (weight.get(g) || 0) + 1)
  if (!weight.size) for (const g of chosen) weight.set(g, 1)
  const top = [...weight.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  const topIds = top.map(([g]) => g)

  // 발매 연도: 좋아요 한 곡 중 발매일이 있는 곡의 가운데 값
  const years = likedDocs.map((d) => Number((d.releaseDate || '').slice(0, 4))).filter((y) => y > 1900).sort((a, b) => a - b)
  const midYear = years.length >= 3 ? years[Math.floor(years.length / 2)] : null

  const pool = topIds.length
    ? ((
        await payload.find({
          collection: 'picks',
          where: { and: [{ genres: { in: topIds } }, ...(liked.length ? [{ id: { not_in: liked } }] : [])] },
          pagination: false,
          depth: 0,
          select: SELECT,
        })
      ).docs as unknown as Doc[])
    : []
  shuffle(pool)
  const score = (d: Doc) => (d.genres || []).map(gid).reduce((s, g) => s + (weight.get(g) || 0), 0)
  const ranked = pool.map((d) => ({ d, s: score(d) })).sort((a, b) => b.s - a.s)
  const recs: Doc[] = []
  const perArtist = new Map<string, number>()
  for (const { d } of ranked) {
    const a = d.artistName.split(',')[0].trim().toLowerCase()
    if ((perArtist.get(a) || 0) >= 2) continue
    perArtist.set(a, (perArtist.get(a) || 0) + 1)
    recs.push(d)
    if (recs.length >= 20) break
  }
  return NextResponse.json({
    genres: top.map(([g]) => names.get(g)).filter(Boolean),
    era: midYear ? `${Math.floor(midYear / 10) * 10}년대 ${midYear % 10 < 4 ? '초반' : midYear % 10 < 7 ? '중반' : '후반'}` : null,
    liked: likedDocs.map((d) => row(d, names)),
    recs: recs.map((d) => row(d, names)),
  })
}
