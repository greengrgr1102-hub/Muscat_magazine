import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "spotify_sync" ADD COLUMN "rename_offset" numeric;
  ALTER TABLE "spotify_sync" ADD COLUMN "rename_changed" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "spotify_sync" DROP COLUMN "rename_offset";
  ALTER TABLE "spotify_sync" DROP COLUMN "rename_changed";`)
}
