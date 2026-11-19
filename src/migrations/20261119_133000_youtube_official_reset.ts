import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// 공식 영상만 쓰기로 바꾸면서, 그전에 자동으로 찾아 둔 영상(팬 업로드 포함)을 비워요.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`UPDATE "picks" SET "youtube_id" = NULL, "youtube_miss_at" = NULL WHERE "youtube_id" IS NOT NULL OR "youtube_miss_at" IS NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {}
