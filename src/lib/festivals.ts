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
