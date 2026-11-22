import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "updates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"day" varchar NOT NULL,
  	"note" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "updates_id" integer;
  CREATE UNIQUE INDEX "updates_day_idx" ON "updates" USING btree ("day");
  CREATE INDEX "updates_updated_at_idx" ON "updates" USING btree ("updated_at");
  CREATE INDEX "updates_created_at_idx" ON "updates" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_updates_fk" FOREIGN KEY ("updates_id") REFERENCES "public"."updates"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_updates_id_idx" ON "payload_locked_documents_rels" USING btree ("updates_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_updates_fk";
  DROP INDEX "payload_locked_documents_rels_updates_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "updates_id";
  DROP TABLE "updates" CASCADE;`)
}
