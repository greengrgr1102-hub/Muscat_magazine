import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "artists_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" varchar,
  	"photo_id" integer,
  	"left" boolean,
  	"period" varchar
  );
  
  ALTER TABLE "articles_qa" ADD COLUMN "speaker" varchar;
  ALTER TABLE "_articles_v_version_qa" ADD COLUMN "speaker" varchar;
  ALTER TABLE "artists_members" ADD CONSTRAINT "artists_members_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "artists_members" ADD CONSTRAINT "artists_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "artists_members_order_idx" ON "artists_members" USING btree ("_order");
  CREATE INDEX "artists_members_parent_id_idx" ON "artists_members" USING btree ("_parent_id");
  CREATE INDEX "artists_members_photo_idx" ON "artists_members" USING btree ("photo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "artists_members" CASCADE;
  ALTER TABLE "articles_qa" DROP COLUMN "speaker";
  ALTER TABLE "_articles_v_version_qa" DROP COLUMN "speaker";`)
}
