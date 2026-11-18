import 'server-only'
import { cache } from 'react'
import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import type { Article } from '@/payload-types'

export const getClient = cache(async () => getPayload({ config: await config }))

export * from './format'
import { asArtists } from './format'

const published: Where = { _status: { equals: 'published' } }

export async function findArticles(opts: {
  where?: Where
  limit?: number
  page?: number
  sort?: string
}) {
  const payload = await getClient()
  return payload.find({
    collection: 'articles',
    where: opts.where ? { and: [published, opts.where] } : published,
    limit: opts.limit ?? 12,
    page: opts.page ?? 1,
    sort: opts.sort ?? '-publishedAt',
    depth: 1,
  })
}

export async function getArticle(slug: string) {
  const payload = await getClient()
  const res = await payload.find({
    collection: 'articles',
    where: { and: [published, { slug: { equals: slug } }] },
    limit: 1,
    depth: 2,
  })
  return res.docs[0] ?? null
}

export async function getArtist(slug: string) {
  const payload = await getClient()
  const res = await payload.find({ collection: 'artists', where: { slug: { equals: slug } }, limit: 1, depth: 1 })
  return res.docs[0] ?? null
}

export async function getGenre(slug: string) {
  const payload = await getClient()
  const res = await payload.find({ collection: 'genres', where: { slug: { equals: slug } }, limit: 1 })
  return res.docs[0] ?? null
}

export async function getGenres() {
  const payload = await getClient()
  const res = await payload.find({ collection: 'genres', limit: 100, sort: 'order', pagination: false })
  return res.docs
}

export const getSettings = cache(async () => {
  const payload = await getClient()
  return payload.findGlobal({ slug: 'site-settings' })
})

export async function getAbout() {
  const payload = await getClient()
  return payload.findGlobal({ slug: 'about-page', depth: 1 })
}

export async function artistsByGenre(genreId: number | string) {
  const payload = await getClient()
  return payload.find({
    collection: 'artists',
    where: { genres: { in: [genreId] } },
    limit: 100,
    sort: 'name',
    depth: 1,
  })
}

export async function articleCountFor(field: 'artists' | 'genres', id: number | string) {
  const payload = await getClient()
  const res = await payload.count({
    collection: 'articles',
    where: { and: [published, { [field]: { in: [id] } }] },
  })
  return res.totalDocs
}

export async function search(q: string) {
  const payload = await getClient()
  const term = q.trim()
  if (!term) return { artists: [], articles: [] }
  const [artists, articles] = await Promise.all([
    payload.find({
      collection: 'artists',
      where: { or: [{ name: { like: term } }, { nameAlt: { like: term } }] },
      limit: 20,
      depth: 1,
    }),
    findArticles({
      where: { or: [{ title: { like: term } }, { excerpt: { like: term } }, { tags: { like: term } }] },
      limit: 24,
    }),
  ])
  // 아티스트 이름으로 찾은 경우 그 아티스트의 글도 함께 보여 줍니다.
  let byArtist: Article[] = []
  if (artists.docs.length) {
    const res = await findArticles({ where: { artists: { in: artists.docs.map((a) => a.id) } }, limit: 24 })
    byArtist = res.docs
  }
  const seen = new Set<number | string>()
  const merged = [...articles.docs, ...byArtist].filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
  merged.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
  return { artists: artists.docs, articles: merged }
}

export async function relatedArticles(article: Article, limit = 3) {
  const manual = (article.related || []).filter((r) => typeof r === 'object') as Article[]
  if (manual.length) return manual.slice(0, limit)
  const artistIds = asArtists(article.artists).map((a) => a.id)
  const where: Where = artistIds.length
    ? { and: [{ id: { not_equals: article.id } }, { artists: { in: artistIds } }] }
    : { and: [{ id: { not_equals: article.id } }, { type: { equals: article.type } }] }
  const res = await findArticles({ where, limit })
  if (res.docs.length >= limit) return res.docs
  const more = await findArticles({
    where: { id: { not_in: [article.id, ...res.docs.map((d) => d.id)] } },
    limit: limit - res.docs.length,
  })
  return [...res.docs, ...more.docs]
}

export async function nextArticle(article: Article) {
  const res = await findArticles({
    where: { publishedAt: { less_than: article.publishedAt } },
    limit: 1,
  })
  return res.docs[0] ?? null
}

/* ---------- Editor's Picks ---------- */
export async function findPicks({ where, limit = 24, page = 1 }: { where?: Where; limit?: number; page?: number } = {}) {
  const payload = await getClient()
  return payload.find({ collection: 'picks', where, limit, page, sort: '-pickedAt', depth: 1 })
}

// 전체 기록 목록용: 필요한 칸만 가볍게
export async function findPickRows({ where, limit = 100, page = 1 }: { where?: Where; limit?: number; page?: number } = {}) {
  const payload = await getClient()
  return payload.find({
    collection: 'picks',
    where,
    limit,
    page,
    sort: '-pickedAt',
    depth: 0,
    select: { track: true, artistName: true, coverUrl: true, pickedAt: true, comment: true, spotifyUrl: true },
  })
}

// 정해진 숫자(seed)로 늘 같은 순서로 섞기 — 페이지를 넘겨도 순서가 유지돼요.
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 랜덤 순서로 한 페이지 가져오기 (seed가 같으면 같은 순서) */
export async function findPickRowsRandom({ where, seed, page = 1, limit = 100 }: { where?: Where; seed: number; page?: number; limit?: number }) {
  const payload = await getClient()
  const ids = (
    await payload.find({ collection: 'picks', where, pagination: false, depth: 0, sort: 'id', select: { spotifyUrl: true } })
  ).docs.map((d) => d.id as number)
  const rnd = seeded(seed)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  const slice = ids.slice((page - 1) * limit, page * limit)
  const docs = slice.length
    ? (
        await payload.find({
          collection: 'picks',
          where: { id: { in: slice } },
          limit: slice.length,
          depth: 0,
          select: { track: true, artistName: true, coverUrl: true, pickedAt: true, comment: true, spotifyUrl: true },
        })
      ).docs
    : []
  const order = new Map(slice.map((id, i) => [id, i]))
  docs.sort((a, b) => (order.get(a.id as number) ?? 0) - (order.get(b.id as number) ?? 0))
  const totalPages = Math.max(1, Math.ceil(ids.length / limit))
  return { docs, totalDocs: ids.length, totalPages, hasPrevPage: page > 1, hasNextPage: page < totalPages }
}

export async function getPick(id: string) {
  if (!/^\d+$/.test(id)) return null
  const payload = await getClient()
  try {
    return await payload.findByID({ collection: 'picks', id: Number(id), depth: 1 })
  } catch {
    return null
  }
}

export async function getTag(slug: string) {
  const payload = await getClient()
  const res = await payload.find({ collection: 'tags', where: { slug: { equals: slug } }, limit: 1 })
  return res.docs[0] || null
}

const ids = (list: unknown) =>
  (Array.isArray(list) ? list : []).map((x) => (typeof x === 'object' && x ? (x as { id: number }).id : (x as number)))

/** 같은 취향 태그·장르·아티스트를 많이 공유할수록 위로 오는 '비슷한 곡'. */
export async function similarPicks(pick: import('@/payload-types').Pick, limit = 12) {
  const payload = await getClient()
  type Row = { id: number; artistName?: string; genres?: unknown; tags?: unknown }
  const firstArtist = (n?: string | null) => (n || '').split(',')[0].trim().toLowerCase()
  const me = firstArtist(pick.artistName)
  const tagIds = ids(pick.tags)
  let genreIds = ids(pick.genres)
  // 이 곡에 장르가 없으면, 같은 아티스트의 다른 곡에 붙은 장르를 빌려 써요.
  if (!genreIds.length && me) {
    const same = await payload.find({
      collection: 'picks',
      where: { artistName: { like: pick.artistName.split(',')[0].trim() } },
      limit: 50,
      depth: 0,
      select: { genres: true },
    })
    const count = new Map<number, number>()
    for (const d of same.docs) for (const g of ids((d as Row).genres as never)) count.set(g, (count.get(g) || 0) + 1)
    genreIds = [...count.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([g]) => g)
  }
  const or: Where[] = []
  if (tagIds.length) or.push({ tags: { in: tagIds } })
  if (genreIds.length) or.push({ genres: { in: genreIds } })
  const pool = or.length
    ? ((
        await payload.find({
          collection: 'picks',
          where: { and: [{ id: { not_equals: pick.id } }, { or }] },
          pagination: false,
          depth: 0,
          select: { artistName: true, genres: true, tags: true },
        })
      ).docs as Row[])
    : []
  // 같은 점수끼리는 섞어서, 열 때마다 조금씩 다른 곡이 나오게 해요.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const score = (p: Row) => {
    const t = ids(p.tags as never).filter((x) => tagIds.includes(x)).length
    const gs = ids(p.genres as never)
    const g = gs.filter((x) => genreIds.includes(x)).length
    // 장르가 딱 겹칠수록(덜 섞일수록) 더 비슷하다고 봐요.
    const exact = g && g === gs.length && g === genreIds.length ? 1 : 0
    return t * 3 + g * 2 + exact
  }
  const ranked = pool
    .map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
  // 한 아티스트가 목록을 다 차지하지 않게 아티스트당 2곡까지만.
  const perArtist = new Map<string, number>()
  const chosen: number[] = []
  for (const { p } of ranked) {
    const a = firstArtist(p.artistName)
    if ((perArtist.get(a) || 0) >= (a === me ? 1 : 2)) continue
    perArtist.set(a, (perArtist.get(a) || 0) + 1)
    chosen.push(p.id)
    if (chosen.length >= limit) break
  }
  let filled = false
  if (chosen.length < limit) {
    // 그래도 모자라면 아무 곡이나 랜덤으로 채워요.
    const all = (await payload.find({ collection: 'picks', pagination: false, depth: 0, select: { artistName: true } })).docs
    const rest = all.filter((d) => d.id !== pick.id && !chosen.includes(d.id as number))
    for (let i = 0; i < limit - chosen.length && rest.length; i++) {
      const k = Math.floor(Math.random() * rest.length)
      chosen.push(rest.splice(k, 1)[0].id as number)
    }
    filled = ranked.length === 0
  }
  const docs = chosen.length
    ? (await payload.find({ collection: 'picks', where: { id: { in: chosen } }, limit: chosen.length, depth: 1 })).docs
    : []
  const order = new Map(chosen.map((id, i) => [id, i]))
  docs.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  return { docs, filled }
}
