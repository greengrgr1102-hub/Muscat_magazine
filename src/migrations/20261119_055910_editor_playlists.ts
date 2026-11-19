import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_playlists_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__playlists_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "playlists" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"description" varchar,
  	"cover_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_playlists_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "playlists_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"picks_id" integer
  );
  
  CREATE TABLE "_playlists_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_description" varchar,
  	"version_cover_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__playlists_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_playlists_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"picks_id" integer
  );
  
  ALTER TABLE "picks" ADD COLUMN "label" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "playlists_id" integer;
  ALTER TABLE "playlists" ADD CONSTRAINT "playlists_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "playlists_rels" ADD CONSTRAINT "playlists_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "playlists_rels" ADD CONSTRAINT "playlists_rels_picks_fk" FOREIGN KEY ("picks_id") REFERENCES "public"."picks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_playlists_v" ADD CONSTRAINT "_playlists_v_parent_id_playlists_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."playlists"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_playlists_v" ADD CONSTRAINT "_playlists_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_playlists_v_rels" ADD CONSTRAINT "_playlists_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_playlists_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_playlists_v_rels" ADD CONSTRAINT "_playlists_v_rels_picks_fk" FOREIGN KEY ("picks_id") REFERENCES "public"."picks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "playlists_slug_idx" ON "playlists" USING btree ("slug");
  CREATE INDEX "playlists_cover_idx" ON "playlists" USING btree ("cover_id");
  CREATE INDEX "playlists_updated_at_idx" ON "playlists" USING btree ("updated_at");
  CREATE INDEX "playlists_created_at_idx" ON "playlists" USING btree ("created_at");
  CREATE INDEX "playlists__status_idx" ON "playlists" USING btree ("_status");
  CREATE INDEX "playlists_rels_order_idx" ON "playlists_rels" USING btree ("order");
  CREATE INDEX "playlists_rels_parent_idx" ON "playlists_rels" USING btree ("parent_id");
  CREATE INDEX "playlists_rels_path_idx" ON "playlists_rels" USING btree ("path");
  CREATE INDEX "playlists_rels_picks_id_idx" ON "playlists_rels" USING btree ("picks_id");
  CREATE INDEX "_playlists_v_parent_idx" ON "_playlists_v" USING btree ("parent_id");
  CREATE INDEX "_playlists_v_version_version_slug_idx" ON "_playlists_v" USING btree ("version_slug");
  CREATE INDEX "_playlists_v_version_version_cover_idx" ON "_playlists_v" USING btree ("version_cover_id");
  CREATE INDEX "_playlists_v_version_version_updated_at_idx" ON "_playlists_v" USING btree ("version_updated_at");
  CREATE INDEX "_playlists_v_version_version_created_at_idx" ON "_playlists_v" USING btree ("version_created_at");
  CREATE INDEX "_playlists_v_version_version__status_idx" ON "_playlists_v" USING btree ("version__status");
  CREATE INDEX "_playlists_v_created_at_idx" ON "_playlists_v" USING btree ("created_at");
  CREATE INDEX "_playlists_v_updated_at_idx" ON "_playlists_v" USING btree ("updated_at");
  CREATE INDEX "_playlists_v_latest_idx" ON "_playlists_v" USING btree ("latest");
  CREATE INDEX "_playlists_v_rels_order_idx" ON "_playlists_v_rels" USING btree ("order");
  CREATE INDEX "_playlists_v_rels_parent_idx" ON "_playlists_v_rels" USING btree ("parent_id");
  CREATE INDEX "_playlists_v_rels_path_idx" ON "_playlists_v_rels" USING btree ("path");
  CREATE INDEX "_playlists_v_rels_picks_id_idx" ON "_playlists_v_rels" USING btree ("picks_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_playlists_fk" FOREIGN KEY ("playlists_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "picks_label_idx" ON "picks" USING btree ("label");
  -- 이미 있는 곡에도 "곡 — 아티스트" 이름을 채워요
  UPDATE "picks" SET "label" = COALESCE("track", 'Untitled') || ' — ' || COALESCE("artist_name", '') WHERE "label" IS NULL;
  CREATE INDEX "payload_locked_documents_rels_playlists_id_idx" ON "payload_locked_documents_rels" USING btree ("playlists_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "playlists" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "playlists_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_playlists_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_playlists_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "playlists" CASCADE;
  DROP TABLE "playlists_rels" CASCADE;
  DROP TABLE "_playlists_v" CASCADE;
  DROP TABLE "_playlists_v_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_playlists_fk";
  
  DROP INDEX "picks_label_idx";
  DROP INDEX "payload_locked_documents_rels_playlists_id_idx";
  ALTER TABLE "picks" DROP COLUMN "label";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "playlists_id";
  DROP TYPE "public"."enum_playlists_status";
  DROP TYPE "public"."enum__playlists_v_version_status";`)
}
