import { NextResponse } from 'next/server'
import type { Where } from 'payload'
import { getClient } from '@/lib/data'
import { QUIZ, decodeW, eraOk, type Era } from '@/lib/tasteQuiz'

// 취향 찾기용 데이터
//  ?step=quiz                                → 질문 보기마다 들어볼 샘플 곡
//  ?step=sample&w=shoegaze:3,…&era=2010s     → 답에 맞춰 들어볼 곡 10개
//  ?step=result&liked=1,2,3&w=…&era=…        → 취향 요약 + 추천곡 20개

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

const artistOf = (p: Doc) => p.artistName.split(',')[0].trim().toLowerCase()

/** 점수에 비례해서 뽑기 (점수 높은 곡이 잘 나오지만, 매번 조금씩 달라요) */
function weightedPick(items: { d: Doc; s: number }[], n: number, skipArtists = new Set<string>()) {
  const pool = items.filter((x) => x.s > 0)
  const out: Doc[] = []
  const seen = new Set(skipArtists)
  while (out.length < n && pool.length) {
    const total = pool.reduce((t, x) => t + x.s, 0)
    let r = Math.random() * total
    let k = 0
    while (k < pool.length - 1 && r > pool[k].s) r -= pool[k++].s
    const [x] = pool.splice(k, 1)
    if (seen.has(artistOf(x.d))) continue
    seen.add(artistOf(x.d))
    out.push(x.d)
  }
  return out
}

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

  const w = decodeW(sp.get('w'))
  const era = (['2020s', '2010s', 'old', 'any'].includes(sp.get('era') || '') ? sp.get('era') : 'any') as Era
  // 장르 slug 점수 → 장르 id 점수
  const wid = new Map<number, number>()
  for (const [slug, n] of Object.entries(w)) {
    const id = bySlug.get(slug)
    if (id) wid.set(id, (wid.get(id) || 0) + n)
  }
  for (const g of chosen) wid.set(g, (wid.get(g) || 0) + 2)

  if (sp.get('step') === 'quiz') {
    // 보기마다 그 보기에서 점수가 가장 높은 장르 두 개에서 한 곡씩
    const used = new Set<number>()
    for (const q of QUIZ) for (const o of q.options) for (const g of Object.keys(o.w || {})) if (bySlug.has(g)) used.add(bySlug.get(g)!)
    const pool = shuffle(
      (
        await payload.find({
          collection: 'picks',
          where: { and: [{ genres: { in: [...used] } }, { coverUrl: { exists: true } }] },
          pagination: false,
          depth: 0,
          select: SELECT,
        })
      ).docs as unknown as Doc[],
    )
    const taken = new Set<string>()
    const samples: Record<string, ReturnType<typeof row>> = {}
    for (const q of QUIZ) {
      if (!q.samples) continue
      for (const o of q.options) {
        const top = Object.entries(o.w || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([g]) => bySlug.get(g))
          .filter((x): x is number => typeof x === 'number')
        const others = new Set(
          q.options
            .filter((x) => x.id !== o.id)
            .flatMap((x) => Object.keys(x.w || {}))
            .map((g) => bySlug.get(g)),
        )
        // 다른 보기와 겹치지 않는 장르의 곡이면 더 좋아요 (보기끼리 소리가 달라야 고르기 쉬워서)
        const fits = (d: Doc) => (d.genres || []).map(gid).some((g) => top.includes(g))
        const pure = (d: Doc) => !(d.genres || []).map(gid).some((g) => others.has(g))
        const pick =
          pool.find((d) => fits(d) && pure(d) && !taken.has(artistOf(d))) || pool.find((d) => fits(d) && !taken.has(artistOf(d)))
        if (pick) {
          taken.add(artistOf(pick))
          samples[`${q.id}.${o.id}`] = row(pick, names)
        }
      }
    }
    return NextResponse.json({ samples })
  }

  if (sp.get('step') === 'sample') {
    const exclude = (sp.get('not') || '').split(',').map(Number).filter(Number.isInteger)
    const ids = [...wid.keys()]
    const where: Where = ids.length ? { genres: { in: ids } } : { genres: { exists: true } }
    const pool = shuffle(
      (
        await payload.find({
          collection: 'picks',
          where: exclude.length ? { and: [where, { id: { not_in: exclude } }] } : where,
          pagination: false,
          depth: 0,
          select: SELECT,
        })
      ).docs as unknown as Doc[],
    )
    // 답과 맞는 장르가 많을수록, 고른 시대에 나온 곡일수록 잘 나와요. 커버 없는 곡은 덜.
    const scored = pool.map((d) => {
      const g = (d.genres || []).map(gid).reduce((t, x) => t + (wid.get(x) || 0), 0)
      const base = ids.length ? g : 1
      return { d, s: base * base * (eraOk(era, d.releaseDate) ? 2 : 1) * (d.coverUrl ? 1 : 0.3) }
    })
    let out = weightedPick(scored, 10)
    if (out.length < 10) {
      const have = new Set(out.map((d) => d.id))
      out = [...out, ...weightedPick(scored.filter((x) => !have.has(x.d.id)).map((x) => ({ ...x, s: 1 })), 10 - out.length, new Set(out.map(artistOf)))]
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
  // 질문 답은 좋아요보다 약하게 섞어요 (실제로 들어 보고 고른 게 더 정확해서)
  const wsum = [...wid.values()].reduce((a, b) => a + b, 0) || 1
  for (const [g, n] of wid) weight.set(g, (weight.get(g) || 0) + (n / wsum) * Math.max(2, likedDocs.length * 0.5))
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
  const score = (d: Doc) =>
    (d.genres || []).map(gid).reduce((s, g) => s + (weight.get(g) || 0), 0) * (eraOk(era, d.releaseDate) ? 1.5 : 1)
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
