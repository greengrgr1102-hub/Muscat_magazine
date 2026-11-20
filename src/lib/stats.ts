import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

// 한국 시간 기준 날짜 (YYYY-MM-DD)
export function kstDay(d = new Date()) {
  return new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10)
}

type DB = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
const db = (payload: Payload) => payload.db as unknown as DB

export async function bump(payload: Payload, keys: string[]) {
  const day = kstDay()
  for (const key of keys) {
    await db(payload).drizzle.execute(sql`
      INSERT INTO "stats" ("day", "key", "count") VALUES (${day}, ${key}, 1)
      ON CONFLICT ("day", "key") DO UPDATE SET "count" = COALESCE("stats"."count", 0) + 1`)
  }
}

/** 한 키를 delta만큼 (좋아요 취소처럼 빼기도 해요) */
export async function bumpBy(payload: Payload, key: string, delta: number) {
  const day = kstDay()
  await db(payload).drizzle.execute(sql`
    INSERT INTO "stats" ("day", "key", "count") VALUES (${day}, ${key}, ${delta})
    ON CONFLICT ("day", "key") DO UPDATE SET "count" = COALESCE("stats"."count", 0) + ${delta}`)
}

export async function totalFor(payload: Payload, key: string, sinceDay?: string) {
  const r = await db(payload).drizzle.execute(
    sinceDay
      ? sql`SELECT COALESCE(SUM("count"), 0)::int AS n FROM "stats" WHERE "key" = ${key} AND "day" >= ${sinceDay}`
      : sql`SELECT COALESCE(SUM("count"), 0)::int AS n FROM "stats" WHERE "key" = ${key}`,
  )
  return Number(r.rows[0]?.n || 0)
}

export async function dailySeries(payload: Payload, key: string, days: number) {
  const since = kstDay(new Date(Date.now() - (days - 1) * 86400_000))
  const r = await db(payload).drizzle.execute(
    sql`SELECT "day", "count" FROM "stats" WHERE "key" = ${key} AND "day" >= ${since} ORDER BY "day"`,
  )
  const map = new Map(r.rows.map((x) => [String(x.day), Number(x.count)]))
  return Array.from({ length: days }, (_, i) => {
    const d = kstDay(new Date(Date.now() - (days - 1 - i) * 86400_000))
    return { day: d, count: map.get(d) || 0 }
  })
}

export async function topKeys(payload: Payload, prefix: string, sinceDay: string, limit = 5) {
  const r = await db(payload).drizzle.execute(sql`
    SELECT "key", SUM("count")::int AS n FROM "stats"
    WHERE "key" LIKE ${prefix + '%'} AND "day" >= ${sinceDay}
    GROUP BY "key" ORDER BY n DESC LIMIT ${limit}`)
  return r.rows.map((x) => ({ id: Number(String(x.key).slice(prefix.length)), count: Number(x.n) }))
}
