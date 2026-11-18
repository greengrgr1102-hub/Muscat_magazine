import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "spotify_sync" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"playlist_url" varchar,
  	"connected_as" varchar,
  	"last_synced_at" timestamp(3) with time zone,
  	"last_result" varchar,
  	"refresh_token" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "picks" ALTER COLUMN "comment" DROP NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "spotify_sync" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "spotify_sync" CASCADE;
  ALTER TABLE "picks" ALTER COLUMN "comment" SET NOT NULL;`)
}
