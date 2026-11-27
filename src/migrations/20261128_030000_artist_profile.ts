import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// 아티스트 검색 정보에 구성(솔로/밴드)·성별 — 인디 워들 비교용
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_artist_info_kind" AS ENUM('solo', 'band');
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_artist_info_gender" AS ENUM('male', 'female', 'mixed');
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  ALTER TABLE "artist_info" ADD COLUMN IF NOT EXISTS "kind" "enum_artist_info_kind";
  ALTER TABLE "artist_info" ADD COLUMN IF NOT EXISTS "gender" "enum_artist_info_gender";
  ALTER TABLE "artist_info" ADD COLUMN IF NOT EXISTS "profile_checked_at" timestamp(3) with time zone;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "artist_info" DROP COLUMN IF EXISTS "kind";
  ALTER TABLE "artist_info" DROP COLUMN IF EXISTS "gender";
  ALTER TABLE "artist_info" DROP COLUMN IF EXISTS "profile_checked_at";
  DROP TYPE IF EXISTS "public"."enum_artist_info_kind";
  DROP TYPE IF EXISTS "public"."enum_artist_info_gender";`)
}
