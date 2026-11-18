import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "artists" ADD COLUMN "face_id" integer;
  ALTER TABLE "media" ADD COLUMN "caption" varchar;
  ALTER TABLE "artists" ADD CONSTRAINT "artists_face_id_media_id_fk" FOREIGN KEY ("face_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "artists_face_idx" ON "artists" USING btree ("face_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "artists" DROP CONSTRAINT "artists_face_id_media_id_fk";
  
  DROP INDEX "artists_face_idx";
  ALTER TABLE "artists" DROP COLUMN "face_id";
  ALTER TABLE "media" DROP COLUMN "caption";`)
}
