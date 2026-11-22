import { sql } from '@payloadcms/db-postgres'
import 'server-only'
import { getClient } from './data'
import { searchKey } from './searchKey'

export type FestAct = { text: string; artist?: string }
export type FestDay = { label: string | null; acts: FestAct[] }
export type Fest = {
  id: number
  name: string
  nameAlt: string | null
  start: string
  end: string | null
  country: string | null
  place: string | null
  url: string | null
  partial: boolean
  days: FestDay[]
  total: number
  matched: string[]
}

const split = (v?: string | null) =>
  String(v || '')
    .split(/[,，、\n]/)
    .map((x) => x.trim())
    .filter(Boolean)

/** 곡 기록에 있는 아티스트 이름을 찾는 사전: 이름·다른 이름·아티스트 페이지 다른 이름 → 곡 기록의 이름 */
async function artistIndex() {
  const payload = await getClient()
  const db = payload.db as unknown as {
    drizzle: { execute: (x: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
  const [rows, info, pages] = await Promise.all([
    db.drizzle.execute(sql`select distinct artist_name from picks`),
    payload.find({ collection: 'artist-info', limit: 5000, depth: 0, pagination: false }),
    payload.find({ collection: 'artists', limit: 1000, depth: 0, pagination: false }),
  ])
  const names = new Set<string>()
  for (const r of rows.rows) {
    const full = String(r.artist_name || '')
    names.add(full.trim())
    for (const one of full.split(', ')) names.add(one.trim())
  }
  const idx = new Map<string, string>()
  for (const n of names) {
    const k = searchKey(n)
    if (k && !idx.has(k)) idx.set(k, n)
  }
  const link = (forms: string[]) => {
    const target = forms.find((f) => names.has(f))
    if (!target) return
    for (const f of forms) {
      const k = searchKey(f)
      if (k && !idx.has(k)) idx.set(k, target)
    }
  }
  for (const d of info.docs) link([d.name, ...split(d.aliases)])
  for (const a of pages.docs) link([a.name, ...split((a as { nameAlt?: string | null }).nameAlt)])
  return idx
}

// "자넬 모네 (Janelle Monáe)", "DEAN & TABBER", "오리지널 러브 & 까데호"처럼 적힌 줄에서 맞는 아티스트 찾기
function matchAct(text: string, idx: Map<string, string>): string | undefined {
  const base = text.replace(/\s*\[[^\]]*\]\s*/g, ' ').trim()
  const tries = [base]
  const paren = base.match(/^(.*?)\s*[（(]([^）)]+)[）)]\s*$/)
  if (paren) tries.push(paren[1], paren[2])
  for (const t of [...tries]) {
    for (const part of t.split(/\s+(?:&|x|X|×|feat\.?|ft\.?|with)\s+/)) tries.push(part)
  }
  for (const t of tries) {
    const k = searchKey(t)
    if (k.length >= 2 && idx.has(k)) return idx.get(k)
  }
  return undefined
}

export async function getFestivals(): Promise<Fest[]> {
  const payload = await getClient()
  const [res, idx] = await Promise.all([
    payload.find({
      collection: 'festivals',
      limit: 200,
      depth: 0,
      pagination: false,
      sort: 'startDate',
    }),
    artistIndex(),
  ])
  return res.docs.map((d) => {
    const days: FestDay[] = []
    let cur: FestDay = { label: null, acts: [] }
    for (const raw of String(d.lineup || '').split('\n')) {
      const line = raw.trim()
      if (!line) continue
      if (line.startsWith('##')) {
        if (cur.acts.length || cur.label) days.push(cur)
        cur = { label: line.replace(/^#+\s*/, ''), acts: [] }
        continue
      }
      cur.acts.push({ text: line, artist: matchAct(line, idx) })
    }
    if (cur.acts.length || cur.label) days.push(cur)
    const matched = [
      ...new Set(days.flatMap((x) => x.acts.map((a) => a.artist).filter(Boolean) as string[])),
    ]
    return {
      id: Number(d.id),
      name: d.name,
      nameAlt: d.nameAlt || null,
      start: d.startDate,
      end: d.endDate || null,
      country: d.country || null,
      place: d.place || null,
      url: d.url || null,
      partial: Boolean(d.partial),
      days,
      total: days.reduce((n, x) => n + x.acts.length, 0),
      matched,
    }
  })
}

/* ── 페스티벌 통계 ── */
export type FestStats = {
  fests: number
  teams: number
  multi: number
  heard: number
  sync: { id: number; short: string; heard: number; total: number }[]
  genres: { id: number; short: string; n: number; mix: { cat: string; n: number }[] }[]
  pairs: { a: string; b: string; n: number }[]
  often: { name: string; n: number }[]
}

export const FEST_CATS = ['록', '팝', 'R&B·소울', '힙합', '일렉트로닉', '재즈', '포크'] as const

// 장르 이름 → 큰 갈래 (위에서부터 먼저 맞는 것)
function catOf(genre: string): string | null {
  const s = genre.toLowerCase()
  if (/hip.?hop|rap|trap|boom bap|drill|grime/.test(s)) return '힙합'
  if (/r&b|soul|funk|new jack|disco|boogie/.test(s)) return 'R&B·소울'
  if (/jazz|bossa|swing|standards|lounge/.test(s)) return '재즈'
  if (
    /tronica|electr|house|techno|garage|drum and bass|club|ambient|idm|trance|edm|bass|glitch|synthwave|downtempo|breakbeat|jungle|dub/.test(
      s,
    )
  )
    return '일렉트로닉'
  if (/folk|singer|country|blues|acoustic/.test(s)) return '포크'
  if (
    /rock|punk|gaze|core|emo|grunge|metal|math|noise|post-|psychedelia|slowcore|dream pop|jangle|power pop|group sounds|shimokita/.test(
      s,
    )
  )
    return '록'
  if (/pop|ballad|kayō|kayo|shibuya|idol|trot/.test(s)) return '팝'
  return null
}

const shortName = (n: string) =>
  n
    .replace(/\s*(20\d\d|[’']\d\d)\s*$/, '')
    .replace(/\s*(뮤직\s*)?페스티벌$/, '')
    .trim()

// 한 줄에서 같은 팀을 알아볼 열쇠들: "혁오 (HYUKOH)" → 혁오, hyukoh / 맞춘 아티스트가 있으면 그 이름도
function actKeys(a: FestAct): string[] {
  const base = a.text.replace(/\s*\((?:공연|취소)[^)]*\)\s*/g, ' ').trim()
  const ks = [base]
  const m = base.match(/^(.*?)\s*[（(]([^）)]+)[）)]\s*$/)
  if (m) ks.push(m[1], m[2])
  const out = ks.map((k) => searchKey(k)).filter((k) => k.length >= 2)
  if (a.artist) out.push('a:' + searchKey(a.artist))
  return out
}

export async function getFestivalStats(fests: Fest[]): Promise<FestStats> {
  // 같은 팀 묶기
  const alias = new Map<string, string>()
  const occ = new Map<string, Set<number>>()
  const label = new Map<string, string>()
  for (const f of fests)
    for (const d of f.days)
      for (const a of d.acts) {
        const ks = actKeys(a)
        if (!ks.length) continue
        const canon = ks.map((k) => alias.get(k)).find(Boolean) || ks[ks.length - 1]
        for (const k of ks) if (!alias.has(k)) alias.set(k, canon)
        if (!occ.has(canon)) occ.set(canon, new Set())
        occ.get(canon)!.add(f.id)
        if (!label.has(canon) || a.artist) label.set(canon, a.artist || a.text)
      }
  const short = new Map(fests.map((f) => [f.id, shortName(f.name)]))
  const pairCount = new Map<string, number>()
  for (const ids of occ.values()) {
    const xs = [...ids].sort((p, q) => p - q)
    for (let i = 0; i < xs.length; i++)
      for (let j = i + 1; j < xs.length; j++) {
        const k = `${xs[i]}:${xs[j]}`
        pairCount.set(k, (pairCount.get(k) || 0) + 1)
      }
  }
  const pairs = [...pairCount.entries()]
    .filter(([, n]) => n >= 2)
    .sort((p, q) => q[1] - p[1])
    .slice(0, 6)
    .map(([k, n]) => {
      const [a, b] = k.split(':').map(Number)
      return { a: short.get(a) || '', b: short.get(b) || '', n }
    })
  const often = [...occ.entries()]
    .filter(([, s]) => s.size >= 3)
    .sort((p, q) => q[1].size - p[1].size)
    .slice(0, 12)
    .map(([k, s]) => ({
      name: (label.get(k) || '').replace(/\s*[（(][^）)]*[）)]\s*$/, ''),
      n: s.size,
    }))

  // 에디터가 들은 아티스트의 대표 갈래
  const payload = await getClient()
  const db = payload.db as unknown as {
    drizzle: { execute: (x: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
  }
  const rows = (
    await db.drizzle.execute(sql`
      select p.artist_name, g.name, count(*)::int as n
      from picks p
      join picks_rels r on r.parent_id = p.id and r.path = 'genres'
      join genres g on g.id = r.genres_id
      group by 1, 2`)
  ).rows
  const byArtist = new Map<string, Map<string, number>>()
  for (const r of rows) {
    const cat = catOf(String(r.name || ''))
    if (!cat) continue
    for (const one of String(r.artist_name || '').split(', ')) {
      const m = byArtist.get(one.trim()) || new Map<string, number>()
      m.set(cat, (m.get(cat) || 0) + Number(r.n || 0))
      byArtist.set(one.trim(), m)
    }
  }
  const topCat = (artist: string) => {
    const m = byArtist.get(artist)
    if (!m) return null
    return [...m.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] || null
  }
  const genres = fests
    .map((f) => {
      const cnt = new Map<string, number>()
      for (const a of f.matched) {
        const c = topCat(a)
        if (c) cnt.set(c, (cnt.get(c) || 0) + 1)
      }
      const n = [...cnt.values()].reduce((x, y) => x + y, 0)
      const mix = FEST_CATS.filter((c) => cnt.get(c)).map((c) => ({ cat: c, n: cnt.get(c)! }))
      return { id: f.id, short: short.get(f.id) || f.name, n, mix }
    })
    .filter((g) => g.n >= 6)
    .sort((p, q) => q.n - p.n)

  return {
    fests: fests.length,
    teams: occ.size,
    multi: [...occ.values()].filter((s) => s.size >= 2).length,
    heard: new Set(fests.flatMap((f) => f.matched)).size,
    sync: fests
      .map((f) => ({
        id: f.id,
        short: short.get(f.id) || f.name,
        heard: f.matched.length,
        total: f.total,
      }))
      .filter((x) => x.total > 0)
      .sort((p, q) => q.heard / q.total - p.heard / p.total),
    genres,
    pairs,
    often,
  }
}
