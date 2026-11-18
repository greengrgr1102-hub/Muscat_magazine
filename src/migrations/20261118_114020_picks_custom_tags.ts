import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_tags_group" AS ENUM('mood', 'texture', 'vocal', 'region', 'scene', 'etc');
  CREATE TABLE "tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"group" "enum_tags_group" DEFAULT 'mood',
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "picks_moods" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "picks_textures" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "picks_moods" CASCADE;
  DROP TABLE "picks_textures" CASCADE;
  ALTER TABLE "picks_rels" ADD COLUMN "tags_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tags_id" integer;
  CREATE UNIQUE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");
  CREATE INDEX "tags_updated_at_idx" ON "tags" USING btree ("updated_at");
  CREATE INDEX "tags_created_at_idx" ON "tags" USING btree ("created_at");
  ALTER TABLE "picks_rels" ADD CONSTRAINT "picks_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "picks_rels_tags_id_idx" ON "picks_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("tags_id");
  ALTER TABLE "picks" DROP COLUMN "vocal";
  ALTER TABLE "picks" DROP COLUMN "region";
  DROP TYPE "public"."enum_picks_moods";
  DROP TYPE "public"."enum_picks_textures";
  DROP TYPE "public"."enum_picks_vocal";
  DROP TYPE "public"."enum_picks_region";`)

  // 시작용 취향 태그 — 관리자 화면에서 자유롭게 고치거나 지우고 새로 만들 수 있어요.
  const starter: [string, string][] = [
    ['몽환적인', 'mood'], ['신나는', 'mood'], ['잔잔한', 'mood'], ['쓸쓸한', 'mood'], ['거친', 'mood'],
    ['기타 노이즈', 'texture'], ['신스·전자음', 'texture'], ['어쿠스틱', 'texture'], ['그루브', 'texture'],
    ['목소리가 앞에', 'vocal'], ['묻힌 보컬', 'vocal'], ['연주곡', 'vocal'],
    ['새벽에', 'scene'], ['산책할 때', 'scene'], ['비 오는 날', 'scene'],
  ]
  for (const [name, group] of starter) {
    await payload.create({ collection: 'tags', data: { name, group: group as never }, req })
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
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
  
  ALTER TABLE "tags" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "tags" CASCADE;
  ALTER TABLE "picks_rels" DROP CONSTRAINT "picks_rels_tags_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tags_fk";
  
  DROP INDEX "picks_rels_tags_id_idx";
  DROP INDEX "payload_locked_documents_rels_tags_id_idx";
  ALTER TABLE "picks" ADD COLUMN "vocal" "enum_picks_vocal";
  ALTER TABLE "picks" ADD COLUMN "region" "enum_picks_region";
  ALTER TABLE "picks_moods" ADD CONSTRAINT "picks_moods_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."picks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "picks_textures" ADD CONSTRAINT "picks_textures_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."picks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "picks_moods_order_idx" ON "picks_moods" USING btree ("order");
  CREATE INDEX "picks_moods_parent_idx" ON "picks_moods" USING btree ("parent_id");
  CREATE INDEX "picks_textures_order_idx" ON "picks_textures" USING btree ("order");
  CREATE INDEX "picks_textures_parent_idx" ON "picks_textures" USING btree ("parent_id");
  ALTER TABLE "picks_rels" DROP COLUMN "tags_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "tags_id";
  DROP TYPE "public"."enum_tags_group";`)
}
