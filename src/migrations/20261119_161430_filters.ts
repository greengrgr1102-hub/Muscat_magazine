import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_picks_release_type" AS ENUM('album', 'ep', 'single', 'compilation');
  ALTER TABLE "picks" ADD COLUMN "release_type" "enum_picks_release_type";
  ALTER TABLE "picks" ADD COLUMN "country" varchar;
  ALTER TABLE "picks" ADD COLUMN "type_checked_at" timestamp(3) with time zone;
  ALTER TABLE "picks" ADD COLUMN "country_checked_at" timestamp(3) with time zone;
  CREATE INDEX "picks_release_type_idx" ON "picks" USING btree ("release_type");
  CREATE INDEX "picks_country_idx" ON "picks" USING btree ("country");
`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "picks_release_type_idx";
  DROP INDEX "picks_country_idx";
  ALTER TABLE "picks" DROP COLUMN "release_type";
  ALTER TABLE "picks" DROP COLUMN "country";
  ALTER TABLE "picks" DROP COLUMN "type_checked_at";
  ALTER TABLE "picks" DROP COLUMN "country_checked_at";
  DROP TYPE "public"."enum_picks_release_type";`)
}
