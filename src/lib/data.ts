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
