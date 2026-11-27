import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// 멤버 → 그 멤버의 아티스트 페이지 (예: 실리카겔 김춘추 → 놀이도감)
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "artists_members" ADD COLUMN IF NOT EXISTS "artist_id" integer;
  DO $$ BEGIN
    ALTER TABLE "artists_members" ADD CONSTRAINT "artists_members_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  CREATE INDEX IF NOT EXISTS "artists_members_artist_idx" ON "artists_members" USING btree ("artist_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "artists_members" DROP COLUMN IF EXISTS "artist_id";`)
}
