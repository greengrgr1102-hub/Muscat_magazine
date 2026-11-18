import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_picks_moods" AS ENUM('dreamy', 'upbeat', 'calm', 'melancholy', 'raw');
  CREATE TYPE "public"."enum_picks_textures" AS ENUM('guitar', 'synth', 'acoustic', 'groove');
  CREATE TYPE "public"."enum_picks_vocal" AS ENUM('front', 'blended', 'instrumental');
  CREATE TYPE "public"."enum_picks_region" AS ENUM('korea', 'japan', 'chinese', 'sea', 'west', 'etc');
  CREATE TABLE "picks_moods" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_picks_moods",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "picks_textures" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_picks_textures",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "picks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"spotify_url" varchar NOT NULL,
  	"artist_name" varchar NOT NULL,
  	"comment" varchar NOT NULL,
  	"picked_at" timestamp(3) with time zone NOT NULL,
  	"track" varchar,
  	"artist_id" integer,
  	"vocal" "enum_picks_vocal",
  	"region" "enum_picks_region",
  	"cover_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "picks_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"genres_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "picks_id" integer;
  ALTER TABLE "picks_moods" ADD CONSTRAINT "picks_moods_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."picks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "picks_textures" ADD CONSTRAINT "picks_textures_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."picks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "picks" ADD CONSTRAINT "picks_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "picks_rels" ADD CONSTRAINT "picks_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."picks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "picks_rels" ADD CONSTRAINT "picks_rels_genres_fk" FOREIGN KEY ("genres_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "picks_moods_order_idx" ON "picks_moods" USING btree ("order");
  CREATE INDEX "picks_moods_parent_idx" ON "picks_moods" USING btree ("parent_id");
  CREATE INDEX "picks_textures_order_idx" ON "picks_textures" USING btree ("order");
  CREATE INDEX "picks_textures_parent_idx" ON "picks_textures" USING btree ("parent_id");
  CREATE INDEX "picks_artist_idx" ON "picks" USING btree ("artist_id");
  CREATE INDEX "picks_updated_at_idx" ON "picks" USING btree ("updated_at");
  CREATE INDEX "picks_created_at_idx" ON "picks" USING btree ("created_at");
  CREATE INDEX "picks_rels_order_idx" ON "picks_rels" USING btree ("order");
  CREATE INDEX "picks_rels_parent_idx" ON "picks_rels" USING btree ("parent_id");
  CREATE INDEX "picks_rels_path_idx" ON "picks_rels" USING btree ("path");
  CREATE INDEX "picks_rels_genres_id_idx" ON "picks_rels" USING btree ("genres_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_picks_fk" FOREIGN KEY ("picks_id") REFERENCES "public"."picks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_picks_id_idx" ON "payload_locked_documents_rels" USING btree ("picks_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "picks_moods" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "picks_textures" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "picks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "picks_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "picks_moods" CASCADE;
  DROP TABLE "picks_textures" CASCADE;
  DROP TABLE "picks" CASCADE;
  DROP TABLE "picks_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_picks_fk";
  
  DROP INDEX "payload_locked_documents_rels_picks_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "picks_id";
  DROP TYPE "public"."enum_picks_moods";
  DROP TYPE "public"."enum_picks_textures";
  DROP TYPE "public"."enum_picks_vocal";
  DROP TYPE "public"."enum_picks_region";`)
}
