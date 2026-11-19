import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "about_page_editors_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "about_page_editors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" varchar,
  	"photo_id" integer,
  	"bio" varchar,
  	"listening" varchar
  );
  
  ALTER TABLE "about_page_editors_links" ADD CONSTRAINT "about_page_editors_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page_editors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_editors" ADD CONSTRAINT "about_page_editors_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page_editors" ADD CONSTRAINT "about_page_editors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "about_page_editors_links_order_idx" ON "about_page_editors_links" USING btree ("_order");
  CREATE INDEX "about_page_editors_links_parent_id_idx" ON "about_page_editors_links" USING btree ("_parent_id");
  CREATE INDEX "about_page_editors_order_idx" ON "about_page_editors" USING btree ("_order");
  CREATE INDEX "about_page_editors_parent_id_idx" ON "about_page_editors" USING btree ("_parent_id");
  CREATE INDEX "about_page_editors_photo_idx" ON "about_page_editors" USING btree ("photo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "about_page_editors_links" CASCADE;
  DROP TABLE "about_page_editors" CASCADE;`)
}
