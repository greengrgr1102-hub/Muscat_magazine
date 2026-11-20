import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "artist_info" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"members" varchar,
  	"aliases" varchar,
  	"checked_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "artist_info_id" integer;
  CREATE UNIQUE INDEX "artist_info_name_idx" ON "artist_info" USING btree ("name");
  CREATE INDEX "artist_info_updated_at_idx" ON "artist_info" USING btree ("updated_at");
  CREATE INDEX "artist_info_created_at_idx" ON "artist_info" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_artist_info_fk" FOREIGN KEY ("artist_info_id") REFERENCES "public"."artist_info"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_artist_info_id_idx" ON "payload_locked_documents_rels" USING btree ("artist_info_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "artist_info" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "artist_info" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_artist_info_fk";
  
  DROP INDEX "payload_locked_documents_rels_artist_info_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "artist_info_id";`)
}
