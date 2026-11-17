import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_articles_albums_listen_service" AS ENUM('melon', 'spotify', 'youtube', 'apple', 'bandcamp', 'soundcloud', 'instagram', 'other');
  CREATE TYPE "public"."enum_articles_releases_kind" AS ENUM('album', 'ep', 'single', 'live');
  CREATE TYPE "public"."enum_articles_listen_service" AS ENUM('melon', 'spotify', 'youtube', 'apple', 'bandcamp', 'soundcloud', 'instagram', 'other');
  CREATE TYPE "public"."enum_articles_type" AS ENUM('review', 'interview', 'playlist', 'release');
  CREATE TYPE "public"."enum_articles_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articles_v_version_albums_listen_service" AS ENUM('melon', 'spotify', 'youtube', 'apple', 'bandcamp', 'soundcloud', 'instagram', 'other');
  CREATE TYPE "public"."enum__articles_v_version_releases_kind" AS ENUM('album', 'ep', 'single', 'live');
  CREATE TYPE "public"."enum__articles_v_version_listen_service" AS ENUM('melon', 'spotify', 'youtube', 'apple', 'bandcamp', 'soundcloud', 'instagram', 'other');
  CREATE TYPE "public"."enum__articles_v_version_type" AS ENUM('review', 'interview', 'playlist', 'release');
  CREATE TYPE "public"."enum__articles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_artists_links_service" AS ENUM('melon', 'spotify', 'youtube', 'apple', 'bandcamp', 'soundcloud', 'instagram', 'other');
  CREATE TYPE "public"."enum_inquiries_kind" AS ENUM('interview', 'submission', 'collab', 'etc');
  CREATE TYPE "public"."enum_inquiries_status" AS ENUM('new', 'replied', 'archived');
  CREATE TYPE "public"."enum_about_page_coverage_type" AS ENUM('review', 'interview', 'playlist', 'release');
  CREATE TABLE "articles_albums_listen" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"service" "enum_articles_albums_listen_service" DEFAULT 'melon',
  	"url" varchar
  );
  
  CREATE TABLE "articles_albums" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"album_title" varchar,
  	"artist_name" varchar,
  	"cover_id" integer,
  	"body" jsonb
  );
  
  CREATE TABLE "articles_qa" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"background" varchar,
  	"question" varchar,
  	"answer" jsonb,
  	"pull_quote" varchar
  );
  
  CREATE TABLE "articles_tracks" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"track_title" varchar,
  	"artist_name" varchar,
  	"duration" varchar,
  	"note" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "articles_releases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"release_title" varchar,
  	"artist_name" varchar,
  	"date" timestamp(3) with time zone,
  	"kind" "enum_articles_releases_kind" DEFAULT 'single',
  	"note" varchar,
  	"cover_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "articles_listen" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"service" "enum_articles_listen_service" DEFAULT 'melon',
  	"url" varchar
  );
  
  CREATE TABLE "articles_editors_pick" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"track_title" varchar,
  	"artist_name" varchar
  );
  
  CREATE TABLE "articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"type" "enum_articles_type" DEFAULT 'review',
  	"slug" varchar,
  	"published_at" timestamp(3) with time zone,
  	"featured" boolean DEFAULT false,
  	"author_id" integer,
  	"reading_time" numeric,
  	"excerpt" varchar,
  	"cover_id" integer,
  	"intro" jsonb,
  	"body" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_articles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "articles_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "articles_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"artists_id" integer,
  	"genres_id" integer,
  	"articles_id" integer
  );
  
  CREATE TABLE "_articles_v_version_albums_listen" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"service" "enum__articles_v_version_albums_listen_service" DEFAULT 'melon',
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_articles_v_version_albums" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"album_title" varchar,
  	"artist_name" varchar,
  	"cover_id" integer,
  	"body" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_articles_v_version_qa" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"background" varchar,
  	"question" varchar,
  	"answer" jsonb,
  	"pull_quote" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_articles_v_version_tracks" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"track_title" varchar,
  	"artist_name" varchar,
  	"duration" varchar,
  	"note" varchar,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_articles_v_version_releases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"release_title" varchar,
  	"artist_name" varchar,
  	"date" timestamp(3) with time zone,
  	"kind" "enum__articles_v_version_releases_kind" DEFAULT 'single',
  	"note" varchar,
  	"cover_id" integer,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_articles_v_version_listen" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"service" "enum__articles_v_version_listen_service" DEFAULT 'melon',
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_articles_v_version_editors_pick" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"track_title" varchar,
  	"artist_name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_articles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_type" "enum__articles_v_version_type" DEFAULT 'review',
  	"version_slug" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_featured" boolean DEFAULT false,
  	"version_author_id" integer,
  	"version_reading_time" numeric,
  	"version_excerpt" varchar,
  	"version_cover_id" integer,
  	"version_intro" jsonb,
  	"version_body" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__articles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_articles_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_articles_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"artists_id" integer,
  	"genres_id" integer,
  	"articles_id" integer
  );
  
  CREATE TABLE "artists_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"service" "enum_artists_links_service" DEFAULT 'melon' NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "artists" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"name_alt" varchar,
  	"slug" varchar,
  	"photo_id" integer,
  	"note_headline" varchar,
  	"note" jsonb,
  	"based_in" varchar,
  	"active" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "artists_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"genres_id" integer
  );
  
  CREATE TABLE "genres" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"description" varchar,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar,
  	"sizes_wide_url" varchar,
  	"sizes_wide_width" numeric,
  	"sizes_wide_height" numeric,
  	"sizes_wide_mime_type" varchar,
  	"sizes_wide_filesize" numeric,
  	"sizes_wide_filename" varchar
  );
  
  CREATE TABLE "inquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"kind" "enum_inquiries_kind" NOT NULL,
  	"message" varchar NOT NULL,
  	"status" "enum_inquiries_status" DEFAULT 'new',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "subscribers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer,
  	"artists_id" integer,
  	"genres_id" integer,
  	"media_id" integer,
  	"inquiries_id" integer,
  	"subscribers_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_line1" varchar DEFAULT 'Music, picked',
  	"hero_line2" varchar DEFAULT 'by ear.',
  	"hero_intro" varchar DEFAULT '머스캣 매거진은 에디터의 귀로 고른 음악을 소개합니다.
  사운드가 신선한 앨범을 리뷰하고, 지금 들어야 할 곡을
  고르고, 그 음악을 만든 사람을 만납니다.',
  	"cta_text" varchar DEFAULT '새 음악은 인스타그램에서
  가장 먼저 만나요.',
  	"email" varchar DEFAULT 'hello@muscatmagazine.com',
  	"instagram_handle" varchar DEFAULT '@muscat.magazine',
  	"instagram_url" varchar DEFAULT 'https://instagram.com/',
  	"youtube_url" varchar,
  	"blog_url" varchar,
  	"footer_line" varchar DEFAULT '좋은 음악을 만나면
  가장 먼저 알려 드릴게요.',
  	"business_info" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "about_page_approach" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "about_page_coverage" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"type" "enum_about_page_coverage_type"
  );
  
  CREATE TABLE "about_page_principles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar
  );
  
  CREATE TABLE "about_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"statement" varchar DEFAULT '머스캣 매거진은 에디터의 귀로 고른 음악을
  세상에 내놓는 인디 음악 매거진입니다.',
  	"image_id" integer,
  	"approach_title" varchar DEFAULT '사운드로 고릅니다.',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "articles_albums_listen" ADD CONSTRAINT "articles_albums_listen_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles_albums"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_albums" ADD CONSTRAINT "articles_albums_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_albums" ADD CONSTRAINT "articles_albums_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_qa" ADD CONSTRAINT "articles_qa_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_tracks" ADD CONSTRAINT "articles_tracks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_releases" ADD CONSTRAINT "articles_releases_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_releases" ADD CONSTRAINT "articles_releases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_listen" ADD CONSTRAINT "articles_listen_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_editors_pick" ADD CONSTRAINT "articles_editors_pick_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_texts" ADD CONSTRAINT "articles_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_artists_fk" FOREIGN KEY ("artists_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_genres_fk" FOREIGN KEY ("genres_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_albums_listen" ADD CONSTRAINT "_articles_v_version_albums_listen_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v_version_albums"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_albums" ADD CONSTRAINT "_articles_v_version_albums_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_version_albums" ADD CONSTRAINT "_articles_v_version_albums_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_qa" ADD CONSTRAINT "_articles_v_version_qa_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_tracks" ADD CONSTRAINT "_articles_v_version_tracks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_releases" ADD CONSTRAINT "_articles_v_version_releases_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_version_releases" ADD CONSTRAINT "_articles_v_version_releases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_listen" ADD CONSTRAINT "_articles_v_version_listen_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_editors_pick" ADD CONSTRAINT "_articles_v_version_editors_pick_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_author_id_users_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_texts" ADD CONSTRAINT "_articles_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_artists_fk" FOREIGN KEY ("artists_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_genres_fk" FOREIGN KEY ("genres_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artists_links" ADD CONSTRAINT "artists_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artists" ADD CONSTRAINT "artists_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "artists_rels" ADD CONSTRAINT "artists_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artists_rels" ADD CONSTRAINT "artists_rels_genres_fk" FOREIGN KEY ("genres_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_artists_fk" FOREIGN KEY ("artists_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_genres_fk" FOREIGN KEY ("genres_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inquiries_fk" FOREIGN KEY ("inquiries_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscribers_fk" FOREIGN KEY ("subscribers_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_approach" ADD CONSTRAINT "about_page_approach_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_coverage" ADD CONSTRAINT "about_page_coverage_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_principles" ADD CONSTRAINT "about_page_principles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page" ADD CONSTRAINT "about_page_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "articles_albums_listen_order_idx" ON "articles_albums_listen" USING btree ("_order");
  CREATE INDEX "articles_albums_listen_parent_id_idx" ON "articles_albums_listen" USING btree ("_parent_id");
  CREATE INDEX "articles_albums_order_idx" ON "articles_albums" USING btree ("_order");
  CREATE INDEX "articles_albums_parent_id_idx" ON "articles_albums" USING btree ("_parent_id");
  CREATE INDEX "articles_albums_cover_idx" ON "articles_albums" USING btree ("cover_id");
  CREATE INDEX "articles_qa_order_idx" ON "articles_qa" USING btree ("_order");
  CREATE INDEX "articles_qa_parent_id_idx" ON "articles_qa" USING btree ("_parent_id");
  CREATE INDEX "articles_tracks_order_idx" ON "articles_tracks" USING btree ("_order");
  CREATE INDEX "articles_tracks_parent_id_idx" ON "articles_tracks" USING btree ("_parent_id");
  CREATE INDEX "articles_releases_order_idx" ON "articles_releases" USING btree ("_order");
  CREATE INDEX "articles_releases_parent_id_idx" ON "articles_releases" USING btree ("_parent_id");
  CREATE INDEX "articles_releases_cover_idx" ON "articles_releases" USING btree ("cover_id");
  CREATE INDEX "articles_listen_order_idx" ON "articles_listen" USING btree ("_order");
  CREATE INDEX "articles_listen_parent_id_idx" ON "articles_listen" USING btree ("_parent_id");
  CREATE INDEX "articles_editors_pick_order_idx" ON "articles_editors_pick" USING btree ("_order");
  CREATE INDEX "articles_editors_pick_parent_id_idx" ON "articles_editors_pick" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");
  CREATE INDEX "articles_author_idx" ON "articles" USING btree ("author_id");
  CREATE INDEX "articles_cover_idx" ON "articles" USING btree ("cover_id");
  CREATE INDEX "articles_updated_at_idx" ON "articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");
  CREATE INDEX "articles__status_idx" ON "articles" USING btree ("_status");
  CREATE INDEX "articles_texts_order_parent" ON "articles_texts" USING btree ("order","parent_id");
  CREATE INDEX "articles_rels_order_idx" ON "articles_rels" USING btree ("order");
  CREATE INDEX "articles_rels_parent_idx" ON "articles_rels" USING btree ("parent_id");
  CREATE INDEX "articles_rels_path_idx" ON "articles_rels" USING btree ("path");
  CREATE INDEX "articles_rels_artists_id_idx" ON "articles_rels" USING btree ("artists_id");
  CREATE INDEX "articles_rels_genres_id_idx" ON "articles_rels" USING btree ("genres_id");
  CREATE INDEX "articles_rels_articles_id_idx" ON "articles_rels" USING btree ("articles_id");
  CREATE INDEX "_articles_v_version_albums_listen_order_idx" ON "_articles_v_version_albums_listen" USING btree ("_order");
  CREATE INDEX "_articles_v_version_albums_listen_parent_id_idx" ON "_articles_v_version_albums_listen" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_albums_order_idx" ON "_articles_v_version_albums" USING btree ("_order");
  CREATE INDEX "_articles_v_version_albums_parent_id_idx" ON "_articles_v_version_albums" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_albums_cover_idx" ON "_articles_v_version_albums" USING btree ("cover_id");
  CREATE INDEX "_articles_v_version_qa_order_idx" ON "_articles_v_version_qa" USING btree ("_order");
  CREATE INDEX "_articles_v_version_qa_parent_id_idx" ON "_articles_v_version_qa" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_tracks_order_idx" ON "_articles_v_version_tracks" USING btree ("_order");
  CREATE INDEX "_articles_v_version_tracks_parent_id_idx" ON "_articles_v_version_tracks" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_releases_order_idx" ON "_articles_v_version_releases" USING btree ("_order");
  CREATE INDEX "_articles_v_version_releases_parent_id_idx" ON "_articles_v_version_releases" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_releases_cover_idx" ON "_articles_v_version_releases" USING btree ("cover_id");
  CREATE INDEX "_articles_v_version_listen_order_idx" ON "_articles_v_version_listen" USING btree ("_order");
  CREATE INDEX "_articles_v_version_listen_parent_id_idx" ON "_articles_v_version_listen" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_editors_pick_order_idx" ON "_articles_v_version_editors_pick" USING btree ("_order");
  CREATE INDEX "_articles_v_version_editors_pick_parent_id_idx" ON "_articles_v_version_editors_pick" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_parent_idx" ON "_articles_v" USING btree ("parent_id");
  CREATE INDEX "_articles_v_version_version_slug_idx" ON "_articles_v" USING btree ("version_slug");
  CREATE INDEX "_articles_v_version_version_author_idx" ON "_articles_v" USING btree ("version_author_id");
  CREATE INDEX "_articles_v_version_version_cover_idx" ON "_articles_v" USING btree ("version_cover_id");
  CREATE INDEX "_articles_v_version_version_updated_at_idx" ON "_articles_v" USING btree ("version_updated_at");
  CREATE INDEX "_articles_v_version_version_created_at_idx" ON "_articles_v" USING btree ("version_created_at");
  CREATE INDEX "_articles_v_version_version__status_idx" ON "_articles_v" USING btree ("version__status");
  CREATE INDEX "_articles_v_created_at_idx" ON "_articles_v" USING btree ("created_at");
  CREATE INDEX "_articles_v_updated_at_idx" ON "_articles_v" USING btree ("updated_at");
  CREATE INDEX "_articles_v_latest_idx" ON "_articles_v" USING btree ("latest");
  CREATE INDEX "_articles_v_autosave_idx" ON "_articles_v" USING btree ("autosave");
  CREATE INDEX "_articles_v_texts_order_parent" ON "_articles_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_articles_v_rels_order_idx" ON "_articles_v_rels" USING btree ("order");
  CREATE INDEX "_articles_v_rels_parent_idx" ON "_articles_v_rels" USING btree ("parent_id");
  CREATE INDEX "_articles_v_rels_path_idx" ON "_articles_v_rels" USING btree ("path");
  CREATE INDEX "_articles_v_rels_artists_id_idx" ON "_articles_v_rels" USING btree ("artists_id");
  CREATE INDEX "_articles_v_rels_genres_id_idx" ON "_articles_v_rels" USING btree ("genres_id");
  CREATE INDEX "_articles_v_rels_articles_id_idx" ON "_articles_v_rels" USING btree ("articles_id");
  CREATE INDEX "artists_links_order_idx" ON "artists_links" USING btree ("_order");
  CREATE INDEX "artists_links_parent_id_idx" ON "artists_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "artists_slug_idx" ON "artists" USING btree ("slug");
  CREATE INDEX "artists_photo_idx" ON "artists" USING btree ("photo_id");
  CREATE INDEX "artists_updated_at_idx" ON "artists" USING btree ("updated_at");
  CREATE INDEX "artists_created_at_idx" ON "artists" USING btree ("created_at");
  CREATE INDEX "artists_rels_order_idx" ON "artists_rels" USING btree ("order");
  CREATE INDEX "artists_rels_parent_idx" ON "artists_rels" USING btree ("parent_id");
  CREATE INDEX "artists_rels_path_idx" ON "artists_rels" USING btree ("path");
  CREATE INDEX "artists_rels_genres_id_idx" ON "artists_rels" USING btree ("genres_id");
  CREATE UNIQUE INDEX "genres_slug_idx" ON "genres" USING btree ("slug");
  CREATE INDEX "genres_updated_at_idx" ON "genres" USING btree ("updated_at");
  CREATE INDEX "genres_created_at_idx" ON "genres" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "media" USING btree ("sizes_large_filename");
  CREATE INDEX "media_sizes_wide_sizes_wide_filename_idx" ON "media" USING btree ("sizes_wide_filename");
  CREATE INDEX "inquiries_updated_at_idx" ON "inquiries" USING btree ("updated_at");
  CREATE INDEX "inquiries_created_at_idx" ON "inquiries" USING btree ("created_at");
  CREATE UNIQUE INDEX "subscribers_email_idx" ON "subscribers" USING btree ("email");
  CREATE INDEX "subscribers_updated_at_idx" ON "subscribers" USING btree ("updated_at");
  CREATE INDEX "subscribers_created_at_idx" ON "subscribers" USING btree ("created_at");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_artists_id_idx" ON "payload_locked_documents_rels" USING btree ("artists_id");
  CREATE INDEX "payload_locked_documents_rels_genres_id_idx" ON "payload_locked_documents_rels" USING btree ("genres_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_inquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("inquiries_id");
  CREATE INDEX "payload_locked_documents_rels_subscribers_id_idx" ON "payload_locked_documents_rels" USING btree ("subscribers_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "about_page_approach_order_idx" ON "about_page_approach" USING btree ("_order");
  CREATE INDEX "about_page_approach_parent_id_idx" ON "about_page_approach" USING btree ("_parent_id");
  CREATE INDEX "about_page_coverage_order_idx" ON "about_page_coverage" USING btree ("_order");
  CREATE INDEX "about_page_coverage_parent_id_idx" ON "about_page_coverage" USING btree ("_parent_id");
  CREATE INDEX "about_page_principles_order_idx" ON "about_page_principles" USING btree ("_order");
  CREATE INDEX "about_page_principles_parent_id_idx" ON "about_page_principles" USING btree ("_parent_id");
  CREATE INDEX "about_page_image_idx" ON "about_page" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "articles_albums_listen" CASCADE;
  DROP TABLE "articles_albums" CASCADE;
  DROP TABLE "articles_qa" CASCADE;
  DROP TABLE "articles_tracks" CASCADE;
  DROP TABLE "articles_releases" CASCADE;
  DROP TABLE "articles_listen" CASCADE;
  DROP TABLE "articles_editors_pick" CASCADE;
  DROP TABLE "articles" CASCADE;
  DROP TABLE "articles_texts" CASCADE;
  DROP TABLE "articles_rels" CASCADE;
  DROP TABLE "_articles_v_version_albums_listen" CASCADE;
  DROP TABLE "_articles_v_version_albums" CASCADE;
  DROP TABLE "_articles_v_version_qa" CASCADE;
  DROP TABLE "_articles_v_version_tracks" CASCADE;
  DROP TABLE "_articles_v_version_releases" CASCADE;
  DROP TABLE "_articles_v_version_listen" CASCADE;
  DROP TABLE "_articles_v_version_editors_pick" CASCADE;
  DROP TABLE "_articles_v" CASCADE;
  DROP TABLE "_articles_v_texts" CASCADE;
  DROP TABLE "_articles_v_rels" CASCADE;
  DROP TABLE "artists_links" CASCADE;
  DROP TABLE "artists" CASCADE;
  DROP TABLE "artists_rels" CASCADE;
  DROP TABLE "genres" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "inquiries" CASCADE;
  DROP TABLE "subscribers" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "about_page_approach" CASCADE;
  DROP TABLE "about_page_coverage" CASCADE;
  DROP TABLE "about_page_principles" CASCADE;
  DROP TABLE "about_page" CASCADE;
  DROP TYPE "public"."enum_articles_albums_listen_service";
  DROP TYPE "public"."enum_articles_releases_kind";
  DROP TYPE "public"."enum_articles_listen_service";
  DROP TYPE "public"."enum_articles_type";
  DROP TYPE "public"."enum_articles_status";
  DROP TYPE "public"."enum__articles_v_version_albums_listen_service";
  DROP TYPE "public"."enum__articles_v_version_releases_kind";
  DROP TYPE "public"."enum__articles_v_version_listen_service";
  DROP TYPE "public"."enum__articles_v_version_type";
  DROP TYPE "public"."enum__articles_v_version_status";
  DROP TYPE "public"."enum_artists_links_service";
  DROP TYPE "public"."enum_inquiries_kind";
  DROP TYPE "public"."enum_inquiries_status";
  DROP TYPE "public"."enum_about_page_coverage_type";`)
}
