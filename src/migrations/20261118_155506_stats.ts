import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"day" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"count" numeric DEFAULT 0
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "stats_id" integer;
  CREATE INDEX "stats_day_idx" ON "stats" USING btree ("day");
  CREATE INDEX "stats_key_idx" ON "stats" USING btree ("key");
  CREATE UNIQUE INDEX "day_key_idx" ON "stats" USING btree ("day","key");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stats_fk" FOREIGN KEY ("stats_id") REFERENCES "public"."stats"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_stats_id_idx" ON "payload_locked_documents_rels" USING btree ("stats_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stats" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "stats" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_stats_fk";
  
  DROP INDEX "payload_locked_documents_rels_stats_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "stats_id";`)
}
