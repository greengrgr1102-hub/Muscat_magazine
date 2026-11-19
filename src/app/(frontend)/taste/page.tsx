import type { Metadata } from 'next'
import { sql } from '@payloadcms/db-postgres'
import { getClient } from '@/lib/data'
import { TasteFinder } from './TasteFinder'

export const metadata: Metadata = {
  title: '내 취향 찾기',
  description: '10곡만 들어 보면, 에디터가 들은 수천 곡 중에서 내 취향에 맞는 곡을 골라 드려요.',
}

// 곡이 10곡 이상 있는 장르만 고를 수 있게 보여줘요.
export default async function TastePage() {
  const payload = await getClient()
  const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: { id: number; n: number }[] }> } }
  const counts = await db.drizzle.execute(
    sql`SELECT "genres_id" AS id, COUNT(*)::int AS n FROM "picks_rels" WHERE "path" = 'genres' AND "genres_id" IS NOT NULL GROUP BY "genres_id"`,
  )
  const n = new Map(counts.rows.map((r) => [Number(r.id), Number(r.n)]))
  const genres = (await payload.find({ collection: 'genres', pagination: false, depth: 0, sort: 'order' })).docs
    .map((g) => ({ slug: g.slug as string, name: g.name, count: n.get(g.id) || 0 }))
    .filter((g) => g.count >= 10)
  return <TasteFinder genres={genres} />
}
