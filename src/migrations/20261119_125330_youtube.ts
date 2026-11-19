import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "youtube_usage" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"day" varchar,
  	"count" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "picks" ADD COLUMN "youtube_id" varchar;
  ALTER TABLE "picks" ADD COLUMN "youtube_miss_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "youtube_usage" CASCADE;
  ALTER TABLE "picks" DROP COLUMN "youtube_id";
  ALTER TABLE "picks" DROP COLUMN "youtube_miss_at";`)
}
