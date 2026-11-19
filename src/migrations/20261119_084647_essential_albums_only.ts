import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "picks_essential_idx";
  ALTER TABLE "picks" DROP COLUMN IF EXISTS "essential";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "picks" ADD COLUMN "essential" boolean DEFAULT false;
  CREATE INDEX "picks_essential_idx" ON "picks" USING btree ("essential");`)
}
