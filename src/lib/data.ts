import { sql } from '@payloadcms/db-postgres'
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

/** 곡·글에 많이 붙은 장르부터 (한 번도 안 쓰인 장르는 빼요) */
export async function getGenresByUse() {
  const payload = await getClient()
  const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
  const rows = (
    await db.drizzle.execute(sql`
      select g.id, g.name, g.slug, count(*)::int as n
      from (
        select genres_id as gid from picks_rels where path = 'genres' and genres_id is not null
        union all
        select genres_id from articles_rels where path = 'genres' and genres_id is not null
      ) x join genres g on g.id = x.gid
      group by g.id, g.name, g.slug
      order by n desc, g.name`)
  ).rows
  return rows.map((r) => ({ id: Number(r.id), name: String(r.name), slug: String(r.slug), n: Number(r.n) }))
}

// 공개된 글에 실제로 붙어 있는 장르만 (장르 고르기 목록이 너무 길어지지 않게)
export async function getArticleGenres() {
  const payload = await getClient()
  const [all, used] = await Promise.all([
    getGenres(),
    payload.find({
      collection: 'articles',
      where: { _status: { equals: 'published' } },
      pagination: false,
      depth: 0,
      select: { genres: true },
    }),
  ])
  const ids = new Set(used.docs.flatMap((a) => ((a as { genres?: (number | { id: number })[] }).genres || []).map((g) => (typeof g === 'object' ? g.id : g))))
  return ids.size ? all.filter((g) => ids.has(g.id)) : all
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

/* ---------- 에디터 플리 ---------- */
export async function findPlaylists(limit = 24) {
  const payload = await getClient()
  return payload.find({ collection: 'playlists', limit, sort: '-updatedAt', depth: 1 })
}
export async function getPlaylist(slug: string) {
  const payload = await getClient()
  const r = await payload.find({ collection: 'playlists', where: { slug: { equals: slug } }, limit: 1, depth: 1 })
  return r.docs[0] || null
}

/* ---------- Editor's Picks ---------- */
export async function findPicks({ where, limit = 24, page = 1 }: { where?: Where; limit?: number; page?: number } = {}) {
  const payload = await getClient()
  return payload.find({ collection: 'picks', where, limit, page, sort: '-pickedAt', depth: 1 })
}

// 전체 기록 목록용: 필요한 칸만 가볍게
export async function findPickRows({
  where,
  limit = 100,
  page = 1,
  sort = '-pickedAt',
}: { where?: Where; limit?: number; page?: number; sort?: string } = {}) {
  const payload = await getClient()
  return payload.find({
    collection: 'picks',
    where,
    limit,
    page,
    sort,
    depth: 0,
    select: { track: true, artistName: true, coverUrl: true, pickedAt: true, releaseDate: true, comment: true, spotifyUrl: true, youtubeId: true },
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
          select: { track: true, artistName: true, coverUrl: true, pickedAt: true, releaseDate: true, comment: true, spotifyUrl: true, youtubeId: true },
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
/**
 * 장르마다 「얼마나 구체적인가」 점수. 곡이 적게 붙은 장르일수록 높아요.
 * (Indie Rock처럼 흔한 장르가 겹치는 것보다 Chamber Folk 같은 드문 장르가 겹치는 게 더 비슷하다고 봐요)
 */
export const genreWeights = cache(async () => {
  const payload = await getClient()
  const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
  const rows = (
    await db.drizzle.execute(sql`
      select genres_id as g, 1 + ln((select count(distinct parent_id) from picks_rels where path = 'genres')::float / count(*)) as w
      from picks_rels where path = 'genres' and genres_id is not null group by genres_id`)
  ).rows
  return new Map(rows.map((r) => [Number(r.g), Number(r.w)]))
})

/** 장르 이름 → 구체성 점수 (거미줄에서 선 굵기를 정할 때 써요) */
export const genreWeightsByName = cache(async () => {
  const payload = await getClient()
  const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
  const rows = (
    await db.drizzle.execute(sql`
      select g.name as n, 1 + ln((select count(distinct parent_id) from picks_rels where path = 'genres')::float / count(*)) as w
      from picks_rels r join genres g on g.id = r.genres_id
      where r.path = 'genres' group by g.name`)
  ).rows
  return Object.fromEntries(rows.map((r) => [String(r.n), Math.round(Number(r.w) * 100) / 100])) as Record<string, number>
})

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
  const gw = await genreWeights()
  const score = (p: Row) => {
    const t = ids(p.tags as never).filter((x) => tagIds.includes(x)).length
    const gs = ids(p.genres as never)
    const shared = gs.filter((x) => genreIds.includes(x))
    // 드문(구체적인) 장르가 겹칠수록 점수가 커요
    const g = shared.reduce((sum, x) => sum + (gw.get(x) || 1), 0)
    // 장르가 딱 겹칠수록(덜 섞일수록) 더 비슷하다고 봐요.
    const exact = shared.length && shared.length === gs.length && shared.length === genreIds.length ? 2 : 0
    return t * 3 + g + exact
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
    const need = limit - chosen.length
    for (let i = 0; i < need && rest.length; i++) {
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

// ---------- Essential ----------
export type EssentialAlbum = {
  key: string
  albumTitle: string
  artistName?: string | null
  cover: unknown
  line?: string | null
  href: string
  articleTitle: string
  publishedAt?: string | null
}

/** 앨범 리뷰에서 Essential로 체크한 앨범만 모으기 (최근 리뷰부터) */
export async function findEssentialAlbums(): Promise<EssentialAlbum[]> {
  const payload = await getClient()
  const res = await payload.find({
    collection: 'articles',
    where: { and: [published, { type: { equals: 'review' } }, { 'albums.essential': { equals: true } }] },
    pagination: false,
    sort: '-publishedAt',
    depth: 1,
    select: { title: true, slug: true, publishedAt: true, albums: true },
  })
  const out: EssentialAlbum[] = []
  for (const a of res.docs) {
    ;(a.albums || []).forEach((al, i) => {
      if (!al?.essential) return
      out.push({
        key: `${a.id}-${al.id || i}`,
        albumTitle: al.albumTitle,
        artistName: al.artistName,
        cover: al.cover,
        line: al.essentialLine,
        href: `/articles/${a.slug}#album-${i + 1}`,
        articleTitle: a.title,
        publishedAt: a.publishedAt,
      })
    })
  }
  return out
}

// ---------- Editor's Picks 앨범 단위 ----------
// Spotify 커버 주소(i.scdn.co/image/ab67616d0000b273 + 24자)의 끝 24자가 앨범마다 같아서, 이걸로 곡을 앨범으로 묶음
export function albumKeyOf(coverUrl?: string | null): string | null {
  if (!coverUrl) return null
  const m = coverUrl.match(/\/image\/([a-z0-9]+)$/i)
  return m && m[1].length >= 24 ? m[1].slice(-24) : null
}

export type PickAlbum = {
  key: string
  cover: string
  album: string | null
  artist: string | null
  release: string | null
  n: number
  firstTrack: string | null
}

export async function findPickAlbums({
  page = 1,
  limit = 48,
  sort = 'most',
  q = '',
  f = {},
  genreId,
}: { page?: number; limit?: number; sort?: 'most' | 'new' | 'old'; q?: string; f?: PickFilter; genreId?: number }) {
  const payload = await getClient()
  const db = payload.db as unknown as { drizzle: { execute: (x: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
  const like = q.trim() ? `%${q.trim()}%` : null
  const conds = [...(like ? [sql`(alb ilike ${like} or artist_name ilike ${like} or track ilike ${like})`] : []), ...pickFilterSql(f)]
  if (sort === 'new' || sort === 'old') conds.push(sql`release_date is not null`)
  // 이 장르가 붙은 곡이 하나라도 있는 앨범
  if (genreId) conds.push(sql`id in (select parent_id from picks_rels where path = 'genres' and genres_id = ${genreId})`)
  const filter = conds.length ? sql`where ${sql.join(conds, sql` and `)}` : sql``
  const order =
    sort === 'new'
      ? sql`max(release_date) desc nulls last, count(*) desc`
      : sort === 'old'
        ? sql`min(release_date) asc nulls last, count(*) desc`
        : sql`count(*) desc, max(release_date) desc nulls last`
  const offset = (Math.max(1, page) - 1) * limit
  // 같은 앨범이 커버 이미지 주소만 다르게 여러 번 올라와 있을 때가 있어서(재발매·디럭스 등),
  // 앨범 이름을 알면 「앨범 이름 + 첫 번째 아티스트」로, 모르면 커버로 묶어요.
  const base = sql`
    with c as (
      select right(cover_url, 24) as ck, max(album) as alb,
             mode() within group (order by split_part(artist_name, ', ', 1)) as a1
      from picks where cover_url like 'https://%/image/%'
      group by right(cover_url, 24)
    ), t2 as (
      select p.id, p.cover_url, p.artist_name, p.release_date, p.track, p.country, p.release_type, c.ck, c.alb,
             case when c.alb is not null then 'n:' || lower(c.alb) || '|' || lower(c.a1) else 'c:' || c.ck end as gk
      from picks p join c on right(p.cover_url, 24) = c.ck
      where p.cover_url like 'https://%/image/%'
    )`
  const [rows, total] = await Promise.all([
    db.drizzle.execute(sql`${base}
      select min(ck) as key, (array_agg(cover_url order by ck))[1] as cover, max(alb) as album,
             mode() within group (order by artist_name) as artist, max(release_date) as release,
             count(*)::int as n, (array_agg(track order by id))[1] as first_track
      from t2 ${filter}
      group by gk
      order by ${order}
      limit ${limit} offset ${offset}`),
    db.drizzle.execute(sql`${base} select count(distinct gk)::int as c from t2 ${filter}`),
  ])
  const totalDocs = Number(total.rows[0]?.c || 0)
  const albums: PickAlbum[] = rows.rows.map((r) => ({
    key: String(r.key),
    cover: String(r.cover),
    album: (r.album as string) || null,
    artist: (r.artist as string) || null,
    release: r.release ? String(r.release) : null,
    n: Number(r.n),
    firstTrack: (r.first_track as string) || null,
  }))
  return { albums, totalDocs, totalPages: Math.max(1, Math.ceil(totalDocs / limit)), page }
}

/** 한 앨범에 속한 Editor's Picks 곡 */
export async function findAlbumPicks(key: string) {
  if (!/^[a-z0-9]{24}$/i.test(key)) return null
  const payload = await getClient()
  const db = payload.db as unknown as { drizzle: { execute: (x: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
  // 이 커버의 곡 + 같은 앨범 이름·같은 아티스트로 묶인 다른 커버의 곡까지
  const ids = (
    await db.drizzle.execute(sql`
      with c as (
        select right(cover_url, 24) as ck, lower(max(album)) as alb,
               lower(mode() within group (order by split_part(artist_name, ', ', 1))) as a1
        from picks where cover_url like 'https://%/image/%'
        group by right(cover_url, 24)
      ), g as (select alb, a1 from c where ck = ${key}),
      keys as (select c.ck from c, g where c.ck = ${key} or (g.alb is not null and c.alb = g.alb and c.a1 = g.a1))
      select p.id from picks p join keys k on right(p.cover_url, 24) = k.ck where p.cover_url like 'https://%/image/%'`)
  ).rows.map((r) => Number(r.id))
  if (!ids.length) return null
  const res = await payload.find({
    collection: 'picks',
    where: { id: { in: ids } },
    pagination: false,
    sort: 'createdAt',
    depth: 1,
    select: { track: true, artistName: true, coverUrl: true, pickedAt: true, releaseDate: true, comment: true, spotifyUrl: true, album: true, genres: true, youtubeId: true, releaseType: true },
  })
  return res.docs.length ? res.docs : null
}

/* ───────── 앨범 거미줄 ───────── */

export type WebAlbumSong = {
  id: number
  track: string | null
  artistName: string
  coverUrl: string | null
  spotifyUrl: string
  youtubeId: string | null
}
export type WebAlbum = { key: string; album: string | null; artist: string; cover: string | null; genres: string[]; songs: WebAlbumSong[] }

// 앨범 묶는 방법은 findPickAlbums와 같아요 (앨범 이름 + 첫 아티스트, 모르면 커버).
const albumCte = sql`
  with c as (
    select right(cover_url, 24) as ck, max(album) as alb,
           mode() within group (order by split_part(artist_name, ', ', 1)) as a1
    from picks where cover_url like 'https://%/image/%'
    group by right(cover_url, 24)
  ), t2 as (
    select p.id, c.ck, lower(c.a1) as a1,
           case when c.alb is not null then 'n:' || lower(c.alb) || '|' || lower(c.a1) else 'c:' || c.ck end as gk
    from picks p join c on right(p.cover_url, 24) = c.ck
    where p.cover_url like 'https://%/image/%'
  )`

/**
 * 앨범 하나와 비슷한 앨범들.
 * 앨범에 담긴 곡들의 장르·태그를 모아서, 같은 장르·태그를 가진 곡이 있는 다른 앨범을 찾아요.
 * 겹치는 태그는 3점, 장르는 2점. 한 아티스트는 한 앨범까지만.
 */
export async function similarAlbums(key: string, limit = 8): Promise<{ center: WebAlbum; neighbors: WebAlbum[]; random: boolean } | null> {
  if (!/^[a-z0-9]{24}$/i.test(key)) return null
  const payload = await getClient()
  const db = payload.db as unknown as { drizzle: { execute: (x: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
  const me = (await db.drizzle.execute(sql`${albumCte} select gk, a1 from t2 where ck = ${key} limit 1`)).rows[0]
  if (!me) return null
  const gk = String(me.gk)
  const a1 = String(me.a1 || '')
  const ranked = (
    await db.drizzle.execute(sql`${albumCte},
      mine as (select id from t2 where gk = ${gk}),
      g0 as (select distinct genres_id as g from picks_rels where path = 'genres' and genres_id is not null and parent_id in (select id from mine)),
      gs as (
        select g from g0
        union
        -- 장르가 하나도 없으면 같은 아티스트의 다른 곡 장르를 빌려 써요
        select distinct r.genres_id from picks_rels r join t2 on t2.id = r.parent_id
        where r.path = 'genres' and r.genres_id is not null and t2.a1 = ${a1} and not exists (select 1 from g0)
      ),
      ts as (select distinct tags_id as t from picks_rels where path = 'tags' and tags_id is not null and parent_id in (select id from mine)),
      -- 장르마다 구체적인 정도 (적게 쓰인 장르일수록 큼)
      gw as (
        select genres_id as g, 1 + ln((select count(distinct parent_id) from picks_rels where path = 'genres')::float / count(*)) as w
        from picks_rels where path = 'genres' and genres_id is not null group by genres_id
      ),
      hit as (
        select t2.gk, t2.ck, t2.a1, r.path, r.genres_id, r.tags_id
        from t2 join picks_rels r on r.parent_id = t2.id
        where t2.gk <> ${gk}
          and ((r.path = 'genres' and r.genres_id in (select g from gs)) or (r.path = 'tags' and r.tags_id in (select t from ts)))
      ),
      per as (select gk, min(ck) as key, max(a1) as a1 from hit group by gk),
      gsc as (
        select d.gk, sum(gw.w) as s
        from (select distinct gk, genres_id from hit where path = 'genres') d join gw on gw.g = d.genres_id
        group by d.gk
      ),
      tsc as (select gk, count(distinct tags_id) * 3 as s from hit where path = 'tags' group by gk)
      select per.gk, per.key, per.a1, (coalesce(gsc.s, 0) + coalesce(tsc.s, 0))::float as s
      from per left join gsc on gsc.gk = per.gk left join tsc on tsc.gk = per.gk
      order by s desc, random()
      limit 80`)
  ).rows
  const chosen: { gk: string; key: string }[] = []
  const perArtist = new Map<string, number>()
  for (const r of ranked) {
    const a = String(r.a1 || '')
    if ((perArtist.get(a) || 0) >= 1) continue
    perArtist.set(a, 1)
    chosen.push({ gk: String(r.gk), key: String(r.key) })
    if (chosen.length >= limit) break
  }
  let random = false
  if (chosen.length < limit) {
    // 모자라면 아무 앨범이나 채워요
    const skip = [gk, ...chosen.map((c) => c.gk)]
    const extra = (
      await db.drizzle.execute(sql`${albumCte}
        select gk, min(ck) as key from t2 where gk not in (${sql.join(skip.map((g) => sql`${g}`), sql`, `)})
        group by gk order by random() limit ${limit - chosen.length}`)
    ).rows
    if (extra.length) random = true
    for (const r of extra) chosen.push({ gk: String(r.gk), key: String(r.key) })
  }

  const all = [{ gk, key }, ...chosen]
  const list = sql.join(all.map((a) => sql`${a.gk}`), sql`, `)
  const [songRows, genreRows] = await Promise.all([
    db.drizzle.execute(sql`${albumCte}
      select t2.gk, p.id, p.track, p.artist_name, p.cover_url, p.spotify_url, p.youtube_id, p.album
      from t2 join picks p on p.id = t2.id where t2.gk in (${list}) order by p.created_at`),
    db.drizzle.execute(sql`${albumCte}
      select t2.gk, g.name, count(*)::int as n
      from t2 join picks_rels r on r.parent_id = t2.id and r.path = 'genres' join genres g on g.id = r.genres_id
      where t2.gk in (${list}) group by t2.gk, g.name order by n desc`),
  ])
  const build = ({ gk: g, key: k }: { gk: string; key: string }): WebAlbum | null => {
    const rows = songRows.rows.filter((r) => r.gk === g)
    if (!rows.length) return null
    const count = new Map<string, number>()
    for (const r of rows) count.set(String(r.artist_name), (count.get(String(r.artist_name)) || 0) + 1)
    const artist = [...count.entries()].sort((x, y) => y[1] - x[1])[0][0]
    const album = (rows.find((r) => r.album)?.album as string) || null
    return {
      key: k,
      album: album || `「${rows[0].track || '곡'}」 수록 앨범`,
      artist,
      cover: (rows[0].cover_url as string) || null,
      genres: genreRows.rows.filter((r) => r.gk === g).slice(0, 3).map((r) => String(r.name)),
      songs: rows.map((r) => ({
        id: Number(r.id),
        track: (r.track as string) || null,
        artistName: String(r.artist_name),
        coverUrl: (r.cover_url as string) || null,
        spotifyUrl: String(r.spotify_url),
        youtubeId: (r.youtube_id as string) || null,
      })),
    }
  }
  const center = build(all[0])
  if (!center) return null
  return { center, neighbors: chosen.map(build).filter(Boolean) as WebAlbum[], random }
}

/* ───────── 곡·앨범 필터 (시기 · 나라 · 앨범 형태) ───────── */

export type PickFilter = { era?: string; c?: string; type?: string }
export const ERA_OPTIONS = [
  { v: 'recent', label: '최근 1년' },
  { v: '2020s', label: '2020년대' },
  { v: '2010s', label: '2010년대' },
  { v: '2000s', label: '2000년대' },
  { v: 'old', label: '그 이전' },
] as const
export const COUNTRY_OPTIONS = [
  { v: 'KR', label: '한국' },
  { v: 'JP', label: '일본' },
  { v: 'US', label: '미국' },
  { v: 'GB', label: '영국' },
  { v: 'etc', label: '그 밖' },
] as const
export const TYPE_OPTIONS = [
  { v: 'album', label: '정규' },
  { v: 'ep', label: 'EP' },
  { v: 'single', label: '싱글' },
] as const
const BIG = ['KR', 'JP', 'US', 'GB']

/** 주소에서 받은 값 중 아는 값만 남겨요 */
export function cleanFilter(sp: Record<string, string | undefined>): PickFilter {
  const f: PickFilter = {}
  if (ERA_OPTIONS.some((o) => o.v === sp.era)) f.era = sp.era
  if (COUNTRY_OPTIONS.some((o) => o.v === sp.c)) f.c = sp.c
  if (TYPE_OPTIONS.some((o) => o.v === sp.type)) f.type = sp.type
  return f
}

function eraRange(era?: string): [string | null, string | null] | null {
  if (!era) return null
  if (era === 'recent') {
    const d = new Date(Date.now() - 365 * 86400_000)
    return [d.toISOString().slice(0, 10), null]
  }
  if (era === '2020s') return ['2020', '2030']
  if (era === '2010s') return ['2010', '2020']
  if (era === '2000s') return ['2000', '2010']
  if (era === 'old') return ['1000', '2000']
  return null
}

/** 곡 목록용 조건 (발매일은 "2019", "2019-07", "2019-07-12" 모두 글자 순서로 비교돼요) */
export function pickFilterWhere(f: PickFilter): Where[] {
  const out: Where[] = []
  const r = eraRange(f.era)
  if (r) {
    if (r[0]) out.push({ releaseDate: { greater_than_equal: r[0] } })
    if (r[1]) out.push({ releaseDate: { less_than: r[1] } })
  }
  if (f.c === 'etc') out.push({ and: [{ country: { exists: true } }, { country: { not_in: BIG } }] })
  else if (f.c) out.push({ country: { equals: f.c } })
  if (f.type) out.push({ releaseType: { equals: f.type } })
  return out
}

function pickFilterSql(f: PickFilter) {
  const conds = []
  const r = eraRange(f.era)
  if (r?.[0]) conds.push(sql`release_date >= ${r[0]}`)
  if (r?.[1]) conds.push(sql`release_date < ${r[1]}`)
  if (f.c === 'etc') conds.push(sql`country is not null and country not in ('KR','JP','US','GB')`)
  else if (f.c) conds.push(sql`country = ${f.c}`)
  if (f.type) conds.push(sql`release_type = ${f.type}::enum_picks_release_type`)
  return conds
}

/** 이 장르와 같은 곡에 자주 같이 붙는 장르 (많이 겹치는 순) */
export async function relatedGenres(genreId: number, limit = 16) {
  const payload = await getClient()
  const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
  const rows = (
    await db.drizzle.execute(sql`
      select g.id, g.name, g.slug, count(*)::int as n
      from picks_rels a
      join picks_rels b on b.parent_id = a.parent_id and b.path = 'genres' and b.genres_id is not null and b.genres_id <> a.genres_id
      join genres g on g.id = b.genres_id
      where a.path = 'genres' and a.genres_id = ${genreId}
      group by g.id, g.name, g.slug
      order by n desc, g.name
      limit ${limit}`)
  ).rows
  return rows.map((r) => ({ id: Number(r.id), name: String(r.name), slug: String(r.slug), n: Number(r.n) }))
}

/** 이 장르가 붙은 Editor's Picks 곡 수 */
export async function pickCountForGenre(genreId: number) {
  const payload = await getClient()
  const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
  const r = await db.drizzle.execute(sql`select count(distinct parent_id)::int as c from picks_rels where path = 'genres' and genres_id = ${genreId}`)
  return Number(r.rows[0]?.c || 0)
}
