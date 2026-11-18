import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { GENRES } from '../data/genres'

// 옵시디언 장르 노트에서 옮긴 장르를 한 번 등록합니다. 이미 같은 주소(slug)의 장르가 있으면 건너뜁니다.
export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  for (const [i, g] of GENRES.entries()) {
    const found = await payload.find({
      collection: 'genres',
      where: { slug: { equals: g.slug } },
      limit: 1,
      req,
    })
    if (found.docs.length) continue
    await payload.create({ collection: 'genres', data: { ...g, order: (i + 1) * 10 }, req })
  }
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({
    collection: 'genres',
    where: { slug: { in: GENRES.map((g) => g.slug) } },
    req,
  })
}
