'use server'
import { headers } from 'next/headers'
import { getClient } from '@/lib/data'

// 옵시디언 등에서 정리한 글을 한꺼번에 "임시저장"으로 가져오는 도구입니다.
// 로그인한 관리자만 쓸 수 있고, 이미 같은 주소(slug)가 있는 글·아티스트는 건너뜁니다.

export type ImportArtist = { name: string; slug: string; nameAlt?: string | null; basedIn?: string | null }
export type ImportArticle = {
  title: string
  slug: string
  type: 'review' | 'interview' | 'playlist' | 'release'
  publishedAt: string
  readingTime?: number
  excerpt?: string | null
  artist?: string
  genres?: string[]
  tags?: string[] | null
  intro?: unknown
  body?: unknown
  qa?: { question: string; answer: unknown }[]
}
export type ImportResult = { slug: string; status: 'created' | 'skipped' | 'error'; message?: string }

async function requireUser() {
  const payload = await getClient()
  // 서버 액션은 Next.js가 이미 같은 사이트에서 온 요청인지(Origin) 확인합니다.
  // Payload 쿠키 인증이 Origin을 다시 검사하며 로컬 주소를 거절하지 않도록 Origin만 빼고 넘깁니다.
  const h = new Headers(await headers())
  h.delete('origin')
  const { user } = await payload.auth({ headers: h })
  if (!user) throw new Error('관리자 로그인이 필요해요.')
  return { payload, user }
}

export async function importArtists(list: ImportArtist[]): Promise<Record<string, number>> {
  const { payload } = await requireUser()
  const ids: Record<string, number> = {}
  for (const a of list.slice(0, 500)) {
    const found = await payload.find({ collection: 'artists', where: { slug: { equals: a.slug } }, limit: 1, overrideAccess: true })
    if (found.docs[0]) {
      ids[a.name] = found.docs[0].id
      continue
    }
    const doc = await payload.create({
      collection: 'artists',
      data: { name: a.name, slug: a.slug, nameAlt: a.nameAlt || undefined, basedIn: a.basedIn || undefined },
      overrideAccess: true,
    })
    ids[a.name] = doc.id
  }
  return ids
}

export async function importArticle(a: ImportArticle, artistIds: Record<string, number>): Promise<ImportResult> {
  try {
    const { payload, user } = await requireUser()
    const exists = await payload.find({
      collection: 'articles',
      where: { slug: { equals: a.slug } },
      limit: 1,
      draft: true,
      overrideAccess: true,
    })
    if (exists.docs[0]) return { slug: a.slug, status: 'skipped', message: '같은 주소의 글이 이미 있어요' }

    let genreIds: number[] = []
    if (a.genres?.length) {
      const g = await payload.find({ collection: 'genres', where: { slug: { in: a.genres } }, limit: 50, overrideAccess: true })
      genreIds = g.docs.map((d) => d.id)
    }
    const artistId = a.artist ? artistIds[a.artist] : undefined

    await payload.create({
      collection: 'articles',
      draft: true,
      overrideAccess: true,
      data: {
        title: a.title,
        slug: a.slug,
        type: a.type,
        publishedAt: a.publishedAt,
        readingTime: a.readingTime,
        excerpt: a.excerpt || undefined,
        author: user.id,
        artists: artistId ? [artistId] : [],
        genres: genreIds,
        tags: a.tags || undefined,
        // 리치 텍스트는 가져오기 파일에서 이미 Lexical 형식으로 만들어 둡니다.
        intro: a.intro as never,
        body: a.body as never,
        qa: (a.qa || []).map((x) => ({ question: x.question, answer: x.answer as never })),
        _status: 'draft',
      },
    })
    return { slug: a.slug, status: 'created' }
  } catch (e) {
    return { slug: a.slug, status: 'error', message: e instanceof Error ? e.message.slice(0, 200) : '알 수 없는 오류' }
  }
}
