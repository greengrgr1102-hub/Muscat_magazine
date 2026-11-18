import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "picks" ADD COLUMN "album" varchar;
  ALTER TABLE "picks" ADD COLUMN "release_date" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "picks" DROP COLUMN "album";
  ALTER TABLE "picks" DROP COLUMN "release_date";`)
}
