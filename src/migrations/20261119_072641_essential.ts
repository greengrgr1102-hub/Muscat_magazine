import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles_albums" ADD COLUMN "essential" boolean DEFAULT false;
  ALTER TABLE "articles_albums" ADD COLUMN "essential_line" varchar;
  ALTER TABLE "_articles_v_version_albums" ADD COLUMN "essential" boolean DEFAULT false;
  ALTER TABLE "_articles_v_version_albums" ADD COLUMN "essential_line" varchar;
  ALTER TABLE "picks" ADD COLUMN "essential" boolean DEFAULT false;
  CREATE INDEX "picks_essential_idx" ON "picks" USING btree ("essential");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "picks_essential_idx";
  ALTER TABLE "articles_albums" DROP COLUMN "essential";
  ALTER TABLE "articles_albums" DROP COLUMN "essential_line";
  ALTER TABLE "_articles_v_version_albums" DROP COLUMN "essential";
  ALTER TABLE "_articles_v_version_albums" DROP COLUMN "essential_line";
  ALTER TABLE "picks" DROP COLUMN "essential";`)
}
