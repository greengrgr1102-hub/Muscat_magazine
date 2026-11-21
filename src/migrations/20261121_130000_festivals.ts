import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "festivals" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"name_alt" varchar,
  	"start_date" varchar NOT NULL,
  	"end_date" varchar,
  	"country" varchar,
  	"place" varchar,
  	"url" varchar,
  	"lineup" varchar,
  	"partial" boolean,
  	"source" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "festivals_id" integer;
  CREATE INDEX "festivals_start_date_idx" ON "festivals" USING btree ("start_date");
  CREATE INDEX "festivals_updated_at_idx" ON "festivals" USING btree ("updated_at");
  CREATE INDEX "festivals_created_at_idx" ON "festivals" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_festivals_fk" FOREIGN KEY ("festivals_id") REFERENCES "public"."festivals"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_festivals_id_idx" ON "payload_locked_documents_rels" USING btree ("festivals_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_festivals_fk";
  DROP INDEX "payload_locked_documents_rels_festivals_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "festivals_id";
  DROP TABLE "festivals" CASCADE;`)
}
