import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// 영어 곡명으로도 찾게 바꾸면서, 그전 방식으로 「못 찾음」 처리된 곡을 다시 찾을 수 있게 비워요.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`UPDATE "picks" SET "youtube_miss_at" = NULL WHERE "youtube_miss_at" IS NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {}
