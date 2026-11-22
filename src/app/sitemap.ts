import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { siteUrl } from '@/lib/spotify'

export const dynamic = 'force-dynamic'

// 검색엔진에 알려 줄 공개 페이지 목록. 발행된 글만 들어가요.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const payload = await getPayload({ config: await config })
  const [articles, artists, genres, picks, playlists] = await Promise.all([
    payload.find({
      collection: 'articles',
      where: { _status: { equals: 'published' } },
      limit: 2000,
      depth: 0,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'artists',
      limit: 2000,
      depth: 0,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'genres',
      limit: 500,
      depth: 0,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({ collection: 'picks', limit: 2000, depth: 0, select: { updatedAt: true } }),
    payload.find({
      collection: 'playlists',
      limit: 200,
      depth: 0,
      select: { slug: true, updatedAt: true },
    }),
  ])
  const enc = (s?: string | null) => encodeURIComponent(s || '')
  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/articles`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/essential`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/picks`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/picks/albums`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/playlists`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/updates`, changeFrequency: 'daily', priority: 0.4 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.1 },
    ...articles.docs.map((d) => ({
      url: `${base}/articles/${enc(d.slug)}`,
      lastModified: d.updatedAt,
      priority: 0.8,
    })),
    ...artists.docs.map((d) => ({
      url: `${base}/artists/${enc(d.slug)}`,
      lastModified: d.updatedAt,
      priority: 0.6,
    })),
    ...genres.docs.map((d) => ({
      url: `${base}/genres/${enc(d.slug)}`,
      lastModified: d.updatedAt,
      priority: 0.4,
    })),
    ...picks.docs.map((d) => ({
      url: `${base}/picks/${d.id}`,
      lastModified: d.updatedAt,
      priority: 0.5,
    })),
    ...playlists.docs.map((d) => ({
      url: `${base}/playlists/${d.slug}`,
      lastModified: d.updatedAt,
      priority: 0.6,
    })),
  ]
}
