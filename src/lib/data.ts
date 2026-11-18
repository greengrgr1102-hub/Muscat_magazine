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
export async function similarPicks(pick: import('@/payload-types').Pick, limit = 6) {
  const payload = await getClient()
  const tagIds = ids(pick.tags)
  const genreIds = ids(pick.genres)
  const artistId = typeof pick.artist === 'object' && pick.artist ? pick.artist.id : pick.artist
  const or: Where[] = []
  if (tagIds.length) or.push({ tags: { in: tagIds } })
  if (genreIds.length) or.push({ genres: { in: genreIds } })
  if (artistId) or.push({ artist: { equals: artistId } })
  const pool = or.length
    ? (await payload.find({ collection: 'picks', where: { and: [{ id: { not_equals: pick.id } }, { or }] }, limit: 200, depth: 1 })).docs
    : []
  const score = (p: typeof pick) => {
    const t = ids(p.tags).filter((x) => tagIds.includes(x)).length
    const g = ids(p.genres).filter((x) => genreIds.includes(x)).length
    const a = artistId && (typeof p.artist === 'object' && p.artist ? p.artist.id : p.artist) === artistId ? 1 : 0
    return t * 3 + g * 2 + a
  }
  const ranked = pool
    .map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || String(b.p.pickedAt).localeCompare(String(a.p.pickedAt)))
    .map((x) => x.p)
    .slice(0, limit)
  if (ranked.length >= limit) return { docs: ranked, filled: false }
  // 비슷한 곡이 모자라면 최근 추천곡으로 채웁니다.
  const exclude = [pick.id, ...ranked.map((p) => p.id)]
  const recent = await payload.find({
    collection: 'picks',
    where: { id: { not_in: exclude } },
    sort: '-pickedAt',
    limit: limit - ranked.length,
    depth: 1,
  })
  return { docs: [...ranked, ...recent.docs], filled: ranked.length === 0 }
}
