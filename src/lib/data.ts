import { sql } from '@payloadcms/db-postgres'
import 'server-only'
import { cache } from 'react'
import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import type { Article } from '@/payload-types'
import { ACCENT_FROM, ACCENT_TO, KEEP, searchKey } from './searchKey'
import { layoutGenres, type GenreGraph } from './genreLayout'

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
  const res = await payload.find({
    collection: 'artists',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })
  return res.docs[0] ?? null
}

export async function getGenre(slug: string) {
  const payload = await getClient()
  const res = await payload.find({
    collection: 'genres',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return res.docs[0] ?? null
}

export async function getGenres() {
  const payload = await getClient()
  const res = await payload.find({
    collection: 'genres',
    limit: 100,
    sort: 'order',
    pagination: false,
  })
  return res.docs
}

/** 곡·글에 많이 붙은 장르부터 (한 번도 안 쓰인 장르는 빼요) */
export async function getGenresByUse() {
  const payload = await getClient()
  const db = payload.db as unknown as {
    drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
  const rows = (
    await db.drizzle.execute(sql`
      select g.id, g.name, g.slug, g.aliases, count(*)::int as n
      from (
        select genres_id as gid from picks_rels where path = 'genres' and genres_id is not null
        union all
        select genres_id from articles_rels where path = 'genres' and genres_id is not null
      ) x join genres g on g.id = x.gid
      group by g.id, g.name, g.slug, g.aliases
      order by n desc, g.name`)
  ).rows
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    slug: String(r.slug),
    aliases: r.aliases ? String(r.aliases) : '',
    n: Number(r.n),
  }))
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
  const ids = new Set(
    used.docs.flatMap((a) =>
      ((a as { genres?: (number | { id: number })[] }).genres || []).map((g) =>
        typeof g === 'object' ? g.id : g,
      ),
    ),
  )
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

// DB 글자를 searchKey()와 같은 규칙으로 고르게 만드는 SQL
const sqlKey = (col: string) =>
  sql`regexp_replace(translate(lower(coalesce(${sql.raw(col)}, '')), ${ACCENT_FROM}, ${ACCENT_TO}), ${`[^${KEEP}]`}, '', 'g')`

// 장르 이름·주소·다른 이름(한국어 등)으로 찾기. 딱 맞을수록 앞에.
async function searchGenres(key: string, term: string) {
  const words = term.split(/\s+/).map(searchKey).filter(Boolean)
  // 짧은 영어 검색(IVE 등)은 장르 이름 중간에 걸리지 않게 (alternative ← ive)
  const minPart = /^[\x20-\x7e]+$/.test(term) ? 4 : 2
  const loose: { id: number; name: string; slug: string; n: number; score: number }[] = []
  const payload = await getClient()
  const [all, used] = await Promise.all([
    payload.find({ collection: 'genres', limit: 1000, depth: 0, pagination: false }),
    getGenresByUse(),
  ])
  const n = new Map(used.map((g) => [g.id, g.n]))
  const hits: { id: number; name: string; slug: string; n: number; score: number }[] = []
  for (const g of all.docs) {
    const keys = [
      g.name,
      g.slug,
      ...String((g as { aliases?: string | null }).aliases || '').split(/[,，、\n]/),
    ]
      .map(searchKey)
      .filter(Boolean)
    let score = 0
    for (const k of keys) {
      if (k === key) score = Math.max(score, 3)
      else if (k.startsWith(key)) score = Math.max(score, 2)
      else if (key.length >= minPart && k.includes(key)) score = Math.max(score, 1)
    }
    const id = Number(g.id)
    if (score) hits.push({ id, name: g.name, slug: String(g.slug), n: n.get(id) || 0, score })
    else if (words.length > 1 && keys.some((k) => words.includes(k)))
      loose.push({ id, name: g.name, slug: String(g.slug), n: n.get(id) || 0, score: 1 })
  }
  // 「시티팝 추천」처럼 여러 낱말 중 하나가 장르 이름일 때 — 더 잘 맞는 장르가 없을 때만
  const out = hits.some((h) => h.score >= 2) ? hits : [...hits, ...loose]
  return out.sort((a, b) => b.score - a.score || b.n - a.n).slice(0, 12)
}

export type SearchSong = {
  id: number
  track: string | null
  artist: string
  album: string | null
  cover: string | null
}
export type SearchAlbum = {
  key: string
  album: string
  artist: string
  cover: string | null
  n: number
}

/**
 * 통합 검색: 장르 · 아티스트 · 앨범 · 곡 · 아티클.
 * 띄어쓰기·하이픈·대소문자·악센트는 무시하고, 장르는 한국어 이름으로도 찾아요.
 */
export async function search(q: string) {
  const payload = await getClient()
  const term = q.trim()
  const key = searchKey(term)
  const empty = {
    genres: [],
    artists: [],
    pickArtists: [],
    albums: [],
    songs: [],
    articles: [] as Article[],
  }
  if (!term || !key) return empty
  const db = payload.db as unknown as {
    drizzle: { execute: (x: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
  const like = `%${key}%`

  const [genres, artistDocs, infoDocs, rows] = await Promise.all([
    searchGenres(key, term),
    payload.find({ collection: 'artists', limit: 1000, depth: 1, pagination: false }),
    payload.find({ collection: 'artist-info', limit: 5000, depth: 0, pagination: false }),
    db.drizzle.execute(sql`
      select id, track, artist_name, album, cover_url,
             ${sqlKey('track')} as kt, ${sqlKey('artist_name')} as ka, ${sqlKey('album')} as kb
      from picks
      where ${sqlKey('track')} like ${like} or ${sqlKey('artist_name')} like ${like} or ${sqlKey('album')} like ${like}
      order by picked_at desc nulls last
      limit 600`),
  ])

  const hit = (ks: string[]) =>
    ks.some((k) => k === key)
      ? 3
      : ks.some((k) => k.startsWith(key))
        ? 2
        : key.length >= 2 && ks.some((k) => k.includes(key))
          ? 1
          : 0
  const list = (v?: string | null) =>
    String(v || '')
      .split(/[,，、\n]/)
      .map((x) => x.trim())
      .filter(Boolean)

  // 에디터가 만든 아티스트 페이지 (이름·다른 이름·멤버 이름)
  const artists = artistDocs.docs
    .map((a) => {
      const ks = [a.name, (a as { nameAlt?: string | null }).nameAlt].map(searchKey).filter(Boolean)
      const members = (a.members || []).map((m) => searchKey(m.name)).filter(Boolean)
      const score = Math.max(hit(ks), hit(members) ? 2 : 0)
      return { a, score }
    })
    .filter((x) => x.score)
    .sort((x, y) => y.score - x.score)
    .map((x) => x.a)
    .slice(0, 20)
  const pageNames = new Set(
    artists.flatMap((a) => [a.name, (a as { nameAlt?: string | null }).nameAlt].map(searchKey)),
  )

  // 곡 기록에서 찾은 아티스트 (페이지가 없는 아티스트도)
  const artistHit = new Map<string, { name: string; n: number; exact: boolean; via?: string }>()
  const songs: (SearchSong & { s: number })[] = []
  const albums = new Map<string, SearchAlbum & { s: number }>()
  // 영어 검색은 단어 시작에서만 (IVE가 Live·Five에 걸리지 않게). 3글자 이하는 단어 전체.
  const ascii = /^[\x20-\x7e]+$/.test(term)
  const short = term.replace(/[^a-z0-9]/gi, '').length <= 3
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const wordRe = new RegExp(`(^|[^\\p{L}\\p{N}])${esc}${short ? '([^\\p{L}\\p{N}]|$)' : ''}`, 'iu')
  for (const r of rows.rows) {
    const kt = String(r.kt || '')
    const ka = String(r.ka || '')
    const kb = String(r.kb || '')
    if (
      ascii &&
      ![r.track, r.artist_name, r.album].some((v) => wordRe.test(String(v || ''))) &&
      ![kt, ka, kb].some((k) => k === key || (!short && k.startsWith(key)))
    )
      continue
    const artist = String(r.artist_name || '')
    const cover = (r.cover_url as string | null) || null
    if (kt.includes(key))
      songs.push({
        id: Number(r.id),
        track: (r.track as string) || null,
        artist,
        album: (r.album as string) || null,
        cover,
        s: kt === key ? 2 : kt.startsWith(key) ? 1 : 0,
      })
    if (ka.includes(key)) {
      for (const one of artist.split(', ')) {
        const k1 = searchKey(one)
        if (!k1.includes(key) || pageNames.has(k1)) continue
        const h = artistHit.get(k1) || { name: one, n: 0, exact: k1 === key }
        h.n++
        artistHit.set(k1, h)
      }
    }
    if (kb.includes(key) && r.album && cover && /\/image\//.test(cover)) {
      const ck = cover.slice(-24)
      const al = albums.get(ck) || {
        key: ck,
        album: String(r.album),
        artist: artist.split(', ')[0],
        cover,
        n: 0,
        s: kb === key ? 2 : kb.startsWith(key) ? 1 : 0,
      }
      al.n++
      albums.set(ck, al)
    }
  }
  // 아티스트 검색 정보: 다른 이름이나 멤버 이름으로 찾은 아티스트
  for (const d of infoDocs.docs) {
    const k0 = searchKey(d.name)
    if (!k0 || pageNames.has(k0) || artistHit.has(k0)) continue
    const member = list(d.members).find((m) => hit([searchKey(m)]))
    const alias = !member && hit(list(d.aliases).map(searchKey))
    if (!member && !alias) continue
    const nr = await db.drizzle.execute(
      sql`select count(*)::int as n from picks where artist_name ~* ${`(^|,\\s*)${d.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*,|$)`}`,
    )
    const n = { totalDocs: Number(nr.rows[0]?.n || 0) }
    if (!n.totalDocs) continue
    artistHit.set(k0, {
      name: d.name,
      n: n.totalDocs,
      exact: Boolean(member && searchKey(member) === key),
      via: member ? `멤버 ${member}` : undefined,
    })
  }
  const pickArtists = [...artistHit.values()]
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.n - a.n)
    .slice(0, 20)

  // 아티클: 제목·요약·태그 + 찾은 아티스트·장르가 붙은 글
  const or: Where[] = [
    { title: { like: term } },
    { excerpt: { like: term } },
    { tags: { like: term } },
  ]
  if (artists.length) or.push({ artists: { in: artists.map((a) => a.id) } })
  if (genres.length && genres[0].score >= 2)
    or.push({ genres: { in: genres.filter((g) => g.score >= 2).map((g) => g.id) } })
  const articles = await findArticles({ where: { or }, limit: 24 })

  return {
    genres,
    artists,
    pickArtists,
    albums: [...albums.values()].sort((a, b) => b.s - a.s || b.n - a.n).slice(0, 12),
    songs: songs.sort((a, b) => b.s - a.s).slice(0, 30),
    articles: articles.docs,
  }
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
  const r = await payload.find({
    collection: 'playlists',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })
  return r.docs[0] || null
}

/* ---------- Editor's Picks ---------- */
export async function findPicks({
  where,
  limit = 24,
  page = 1,
}: { where?: Where; limit?: number; page?: number } = {}) {
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
    select: {
      track: true,
      artistName: true,
      coverUrl: true,
      pickedAt: true,
      releaseDate: true,
      comment: true,
      spotifyUrl: true,
      youtubeId: true,
    },
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
// 랜덤 목록을 "고르게" 섞기:
// 1) 앨범마다 대표곡 1곡을 먼저 늘어놓고, 같은 앨범의 나머지 곡은 그 뒤로 미뤄요.
// 2) 같은 아티스트가 가까이(앞 12곡 안) 붙지 않도록 순서를 벌려요. (웬만하면 — 곡이 모자라면 붙을 수도 있어요)
function spreadByArtist<T extends { artist: string }>(list: T[], gap = 12): T[] {
  const out: T[] = []
  const pending = [...list]
  const recent: string[] = []
  while (pending.length) {
    let k = pending.findIndex((x, i) => i < 80 && !recent.includes(x.artist))
    if (k < 0) k = 0
    const [x] = pending.splice(k, 1)
    out.push(x)
    recent.push(x.artist)
    if (recent.length > gap) recent.shift()
  }
  return out
}

export async function findPickRowsRandom({
  where,
  seed,
  page = 1,
  limit = 100,
}: {
  where?: Where
  seed: number
  page?: number
  limit?: number
}) {
  const payload = await getClient()
  const all = (
    await payload.find({
      collection: 'picks',
      where,
      pagination: false,
      depth: 0,
      sort: 'id',
      select: { artistName: true, album: true },
    })
  ).docs.map((d) => {
    const artist = String((d as { artistName?: string }).artistName || '')
      .split(',')[0]
      .trim()
      .toLowerCase()
    const album = String((d as { album?: string }).album || '')
      .trim()
      .toLowerCase()
    return { id: d.id as number, artist, album: album ? `${artist}|${album}` : `#${d.id}` }
  })
  const rnd = seeded(seed)
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  const seenAlbum = new Set<string>()
  const reps: typeof all = []
  const rest: typeof all = []
  for (const x of all) {
    if (seenAlbum.has(x.album)) rest.push(x)
    else {
      seenAlbum.add(x.album)
      reps.push(x)
    }
  }
  const ids = [...spreadByArtist(reps), ...spreadByArtist(rest)].map((x) => x.id)
  const slice = ids.slice((page - 1) * limit, page * limit)
  const docs = slice.length
    ? (
        await payload.find({
          collection: 'picks',
          where: { id: { in: slice } },
          limit: slice.length,
          depth: 0,
          select: {
            track: true,
            artistName: true,
            coverUrl: true,
            pickedAt: true,
            releaseDate: true,
            comment: true,
            spotifyUrl: true,
            youtubeId: true,
          },
        })
      ).docs
    : []
  const order = new Map(slice.map((id, i) => [id, i]))
  docs.sort((a, b) => (order.get(a.id as number) ?? 0) - (order.get(b.id as number) ?? 0))
  const totalPages = Math.max(1, Math.ceil(ids.length / limit))
  return {
    docs,
    totalDocs: ids.length,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
  }
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
  const res = await payload.find({
    collection: 'tags',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return res.docs[0] || null
}

const ids = (list: unknown) =>
  (Array.isArray(list) ? list : []).map((x) =>
    typeof x === 'object' && x ? (x as { id: number }).id : (x as number),
  )

/** 같은 취향 태그·장르·아티스트를 많이 공유할수록 위로 오는 '비슷한 곡'. */
/**
 * 장르마다 「얼마나 구체적인가」 점수. 곡이 적게 붙은 장르일수록 높아요.
 * (Indie Rock처럼 흔한 장르가 겹치는 것보다 Chamber Folk 같은 드문 장르가 겹치는 게 더 비슷하다고 봐요)
 */
export const genreWeights = cache(async () => {
  const payload = await getClient()
  const db = payload.db as unknown as {
    drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
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
  const db = payload.db as unknown as {
    drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
  const rows = (
    await db.drizzle.execute(sql`
      select g.name as n, 1 + ln((select count(distinct parent_id) from picks_rels where path = 'genres')::float / count(*)) as w
      from picks_rels r join genres g on g.id = r.genres_id
      where r.path = 'genres' group by g.name`)
  ).rows
  return Object.fromEntries(
    rows.map((r) => [String(r.n), Math.round(Number(r.w) * 100) / 100]),
  ) as Record<string, number>
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
    for (const d of same.docs)
      for (const g of ids((d as Row).genres as never)) count.set(g, (count.get(g) || 0) + 1)
    genreIds = [...count.entries()]
      .sort((x, y) => y[1] - x[1])
      .slice(0, 3)
      .map(([g]) => g)
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
    const exact =
      shared.length && shared.length === gs.length && shared.length === genreIds.length ? 2 : 0
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
    const all = (
      await payload.find({
        collection: 'picks',
        pagination: false,
        depth: 0,
        select: { artistName: true },
      })
    ).docs
    const rest = all.filter((d) => d.id !== pick.id && !chosen.includes(d.id as number))
    const need = limit - chosen.length
    for (let i = 0; i < need && rest.length; i++) {
      const k = Math.floor(Math.random() * rest.length)
      chosen.push(rest.splice(k, 1)[0].id as number)
    }
    filled = ranked.length === 0
  }
  const docs = chosen.length
    ? (
        await payload.find({
          collection: 'picks',
          where: { id: { in: chosen } },
          limit: chosen.length,
          depth: 1,
        })
      ).docs
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
    where: {
      and: [published, { type: { equals: 'review' } }, { 'albums.essential': { equals: true } }],
    },
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

// ── 곡·앨범 목록 검색 ─────────────────────────────────────────
// 영어 검색은 단어 시작에서만 걸려요 ("IVE"가 Live·drivers·Five에 걸리지 않게).
// 3글자 이하는 단어 전체가 같아야 하고(Bon Iver도 제외), 한국어·일본어는 글자 일부만 맞아도 돼요.
// "아이브"처럼 다른 이름은 아티스트 검색 정보(다른 이름·멤버)·아티스트 페이지(다른 이름)로 원래 이름을 찾아요.
const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const splitNames = (v?: string | null) =>
  String(v || '')
    .split(/[,，、\n]/)
    .map((x) => x.trim())
    .filter(Boolean)

export const aliasTargets = cache(async (term: string): Promise<string[]> => {
  const key = searchKey(term)
  if (!key) return []
  const payload = await getClient()
  const [info, pages] = await Promise.all([
    payload.find({ collection: 'artist-info', limit: 5000, depth: 0, pagination: false }),
    payload.find({ collection: 'artists', limit: 1000, depth: 0, pagination: false }),
  ])
  const out = new Set<string>()
  // 이름·다른 이름·멤버 중 하나라도 맞으면 그 아티스트의 모든 표기로 곡을 찾아요
  // (곡 기록에 영어로 적혀 있든 한국어로 적혀 있든)
  for (const d of info.docs) {
    const forms = [d.name, ...splitNames(d.aliases)]
    const ks = [...forms, ...splitNames(d.members)].map(searchKey)
    if (ks.includes(key)) forms.forEach((f) => out.add(f))
  }
  for (const a of pages.docs) {
    const forms = [a.name, ...splitNames((a as { nameAlt?: string | null }).nameAlt)]
    const members = (a.members || []).map((m) => m.name)
    if ([...forms, ...members].map(searchKey).includes(key)) forms.forEach((f) => out.add(f))
  }
  return [...out]
})

export async function pickTextCond(
  q: string,
  cols = { track: 'track', artist: 'artist_name', album: 'album' },
) {
  const term = q.trim()
  if (!term) return null
  const c = (k: keyof typeof cols) => sql.raw(cols[k])
  let text
  if (/^[\x20-\x7e]+$/.test(term)) {
    const t = reEsc(term)
    const re =
      term.replace(/[^a-z0-9]/gi, '').length <= 3
        ? `(^|[^[:alnum:]])${t}([^[:alnum:]]|$)`
        : `(^|[^[:alnum:]])${t}`
    text = sql`(${c('track')} ~* ${re} or ${c('artist')} ~* ${re} or ${c('album')} ~* ${re})`
  } else {
    const like = `%${term}%`
    text = sql`(${c('track')} ilike ${like} or ${c('artist')} ilike ${like} or ${c('album')} ilike ${like})`
  }
  const names = await aliasTargets(term)
  if (!names.length) return text
  const exact = names.map((n) => sql`${c('artist')} ~* ${`(^|,\\s*)${reEsc(n)}(\\s*,|$)`}`)
  return sql`(${text} or ${sql.join(exact, sql` or `)})`
}

/** 곡 목록(Payload 쿼리)용: 검색에 걸리는 곡 번호 */
export async function pickIdsForQuery(q: string): Promise<number[]> {
  const cond = await pickTextCond(q)
  if (!cond) return []
  const payload = await getClient()
  const db = payload.db as unknown as {
    drizzle: { execute: (x: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
  const res = await db.drizzle.execute(sql`select id from picks where ${cond} limit 3000`)
  return res.rows.map((r) => Number(r.id))
}

export async function findPickAlbums({
  page = 1,
  limit = 48,
  sort = 'most',
  q = '',
  f = {},
  genreId,
}: {
  page?: number
  limit?: number
  sort?: 'most' | 'new' | 'old'
  q?: string
  f?: PickFilter
  genreId?: number
}) {
  const payload = await getClient()
  const db = payload.db as unknown as {
    drizzle: { execute: (x: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
  const qc = await pickTextCond(q, { track: 'track', artist: 'artist_name', album: 'alb' })
  const conds = [...(qc ? [qc] : []), ...pickFilterSql(f)]
  if (sort === 'new' || sort === 'old') conds.push(sql`release_date is not null`)
  // 고른 장르가 붙은 앨범 (앨범 장르는 수록곡 전체에 같이 붙어 있어서 곡 단위로 걸러도 돼요)
  if (f.g?.length) {
    const has = (slug: string) =>
      sql`id in (select r.parent_id from picks_rels r join genres gg on gg.id = r.genres_id where r.path = 'genres' and gg.slug = ${slug})`
    if (f.gm === 'any') conds.push(sql`(${sql.join(f.g.map(has), sql` or `)})`)
    else for (const slug of f.g) conds.push(has(slug))
  }
  // 이 장르가 붙은 곡이 하나라도 있는 앨범
  if (genreId)
    conds.push(
      sql`id in (select parent_id from picks_rels where path = 'genres' and genres_id = ${genreId})`,
    )
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
  const db = payload.db as unknown as {
    drizzle: { execute: (x: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
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
    select: {
      track: true,
      artistName: true,
      coverUrl: true,
      pickedAt: true,
      releaseDate: true,
      comment: true,
      spotifyUrl: true,
      album: true,
      genres: true,
      youtubeId: true,
      releaseType: true,
    },
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
export type WebAlbum = {
  key: string
  album: string | null
  artist: string
  cover: string | null
  genres: string[]
  songs: WebAlbumSong[]
}

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
export async function similarAlbums(
  key: string,
  limit = 8,
): Promise<{ center: WebAlbum; neighbors: WebAlbum[]; random: boolean } | null> {
  if (!/^[a-z0-9]{24}$/i.test(key)) return null
  const payload = await getClient()
  const db = payload.db as unknown as {
    drizzle: { execute: (x: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
  const me = (
    await db.drizzle.execute(sql`${albumCte} select gk, a1 from t2 where ck = ${key} limit 1`)
  ).rows[0]
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
        select gk, min(ck) as key from t2 where gk not in (${sql.join(
          skip.map((g) => sql`${g}`),
          sql`, `,
        )})
        group by gk order by random() limit ${limit - chosen.length}`)
    ).rows
    if (extra.length) random = true
    for (const r of extra) chosen.push({ gk: String(r.gk), key: String(r.key) })
  }

  const all = [{ gk, key }, ...chosen]
  const list = sql.join(
    all.map((a) => sql`${a.gk}`),
    sql`, `,
  )
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
    for (const r of rows)
      count.set(String(r.artist_name), (count.get(String(r.artist_name)) || 0) + 1)
    const artist = [...count.entries()].sort((x, y) => y[1] - x[1])[0][0]
    const album = (rows.find((r) => r.album)?.album as string) || null
    return {
      key: k,
      album: album || `「${rows[0].track || '곡'}」 수록 앨범`,
      artist,
      cover: (rows[0].cover_url as string) || null,
      genres: genreRows.rows
        .filter((r) => r.gk === g)
        .slice(0, 3)
        .map((r) => String(r.name)),
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

export type PickFilter = {
  era?: string
  c?: string
  type?: string
  /** 장르 슬러그 (최대 5개) — 앨범 보기에서만 */
  g?: string[]
  /** 장르를 여러 개 골랐을 때: 기본은 모두 포함, 'any'면 하나라도 */
  gm?: 'any'
}
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
  const g = (sp.g || '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter((x) => /^[a-z0-9-]{1,60}$/.test(x))
  if (g.length) f.g = [...new Set(g)].slice(0, 5)
  if (f.g && f.g.length > 1 && sp.gm === 'any') f.gm = 'any'
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
  if (f.c === 'etc')
    out.push({ and: [{ country: { exists: true } }, { country: { not_in: BIG } }] })
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
  const db = payload.db as unknown as {
    drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
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
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    slug: String(r.slug),
    n: Number(r.n),
  }))
}

/**
 * 장르 지도: 장르 하나와 같이 자주 붙는 장르들, 각 장르의 대표 곡(커버·들어볼 곡).
 * 대표 곡은 날마다 조금씩 바뀌게 섞어요.
 */
export async function genreWeb(slug: string, limit = 9) {
  const center = await getGenre(slug)
  if (!center) return null
  const related = await relatedGenres(center.id, limit)
  const payload = await getClient()
  const db = payload.db as unknown as {
    drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
  const ids = [center.id, ...related.map((r) => r.id)]
  const [songRows, countRows] = await Promise.all([
    db.drizzle.execute(sql`
      select * from (
        select r.genres_id as gid, p.id, p.track, p.artist_name, p.cover_url, p.spotify_url, p.youtube_id,
               row_number() over (partition by r.genres_id order by md5(p.id::text || current_date::text)) as rn
        from picks_rels r join picks p on p.id = r.parent_id
        where r.path = 'genres' and r.genres_id in (${sql.join(
          ids.map((i) => sql`${i}`),
          sql`, `,
        )}) and p.cover_url is not null
      ) x where rn <= 8`),
    db.drizzle.execute(sql`
      select genres_id as gid, count(distinct parent_id)::int as n from picks_rels
      where path = 'genres' and genres_id in (${sql.join(
        ids.map((i) => sql`${i}`),
        sql`, `,
      )}) group by genres_id`),
  ])
  const songs = new Map<
    number,
    {
      id: number
      track: string | null
      artistName: string
      coverUrl: string | null
      spotifyUrl: string
      youtubeId: string | null
    }[]
  >()
  for (const r of songRows.rows) {
    const g = Number(r.gid)
    const list = songs.get(g) || []
    list.push({
      id: Number(r.id),
      track: (r.track as string) || null,
      artistName: String(r.artist_name || ''),
      coverUrl: (r.cover_url as string) || null,
      spotifyUrl: String(r.spotify_url || ''),
      youtubeId: (r.youtube_id as string) || null,
    })
    songs.set(g, list)
  }
  const count = new Map(countRows.rows.map((r) => [Number(r.gid), Number(r.n)]))
  const node = (g: { id: number; name: string; slug: string }) => ({
    ...g,
    n: count.get(g.id) || 0,
    songs: songs.get(g.id) || [],
  })
  return {
    center: node({ id: center.id, name: center.name, slug: String(center.slug) }),
    neighbors: related.map((r) => ({ ...node(r), together: r.n })),
  }
}

/** 이 장르가 붙은 Editor's Picks 곡 수 */
export async function pickCountForGenre(genreId: number) {
  const payload = await getClient()
  const db = payload.db as unknown as {
    drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
  const r = await db.drizzle.execute(
    sql`select count(distinct parent_id)::int as c from picks_rels where path = 'genres' and genres_id = ${genreId}`,
  )
  return Number(r.rows[0]?.c || 0)
}

/**
 * 아무거나 틀어줘: 조건에 맞는 곡 하나를 무작위로. 최근에 들은 곡(exclude)은 빼고,
 * 다 들었으면 들은 곡 중에서라도 골라요.
 */
export async function randomPick({
  genreId,
  f = {},
  exclude = [],
}: {
  genreId?: number
  f?: PickFilter
  exclude?: number[]
}) {
  const payload = await getClient()
  const db = payload.db as unknown as {
    drizzle: { execute: (x: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
  const conds = [sql`spotify_url is not null`, ...pickFilterSql(f)]
  if (genreId)
    conds.push(
      sql`id in (select parent_id from picks_rels where path = 'genres' and genres_id = ${genreId})`,
    )
  const base = sql.join(conds, sql` and `)
  const ex = exclude.filter((x) => Number.isInteger(x) && x > 0).slice(0, 500)
  const pickOne = async (withEx: boolean) =>
    (
      await db.drizzle.execute(sql`
        select id from picks where ${base}
        ${
          withEx && ex.length
            ? sql`and id not in (${sql.join(
                ex.map((x) => sql`${x}`),
                sql`, `,
              )})`
            : sql``
        }
        order by random() limit 1`)
    ).rows[0]
  const [row, left] = await Promise.all([
    pickOne(true),
    db.drizzle.execute(sql`select count(*)::int as n from picks where ${base}`),
  ])
  const r = row || (await pickOne(false))
  if (!r) return null
  const pick = await payload.findByID({ collection: 'picks', id: Number(r.id), depth: 1 })
  return { pick, total: Number(left.rows[0]?.n || 0), fresh: Boolean(row) }
}

/** 탐험 첫 화면에서 거미줄을 시작할 곡·앨범 하나씩 (날마다 바뀌어요) */
export async function exploreSeeds() {
  const payload = await getClient()
  const db = payload.db as unknown as {
    drizzle: { execute: (x: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
  const pick = (
    await db.drizzle.execute(sql`
      select p.id, p.track, p.artist_name, p.album, p.cover_url from picks p
      where p.cover_url like '%/image/%' and exists (select 1 from picks_rels r where r.parent_id = p.id and r.path = 'genres')
      order by md5(p.id::text || current_date::text) limit 2`)
  ).rows
  const song = pick[0]
  const alb = pick[1]
  return {
    song: song
      ? {
          id: Number(song.id),
          track: String(song.track || ''),
          artist: String(song.artist_name || ''),
          cover: (song.cover_url as string) || null,
        }
      : null,
    album: alb
      ? {
          key: String(alb.cover_url).slice(-24),
          album: String(alb.album || ''),
          artist: String(alb.artist_name || '').split(', ')[0],
          cover: (alb.cover_url as string) || null,
        }
      : null,
  }
}

export type { GenreGraph } from './genreLayout'

export async function genreGraph(): Promise<GenreGraph> {
  const payload = await getClient()
  const db = payload.db as unknown as {
    drizzle: { execute: (x: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
  const [nodeRows, pairRows] = await Promise.all([
    db.drizzle.execute(sql`
      select g.id, g.name, g.slug, count(distinct r.parent_id)::int as n
      from picks_rels r join genres g on g.id = r.genres_id
      where r.path = 'genres' group by g.id, g.name, g.slug having count(distinct r.parent_id) >= 2`),
    db.drizzle.execute(sql`
      select a.genres_id as x, b.genres_id as y, count(*)::int as c
      from picks_rels a join picks_rels b on b.parent_id = a.parent_id and b.path = 'genres' and a.genres_id < b.genres_id
      where a.path = 'genres' and a.genres_id is not null and b.genres_id is not null
      group by 1, 2 having count(*) >= 2`),
  ])
  return layoutGenres(
    nodeRows.rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      slug: String(r.slug),
      n: Number(r.n),
    })),
    pairRows.rows.map((r) => ({ a: Number(r.x), b: Number(r.y), c: Number(r.c) })),
  )
}
