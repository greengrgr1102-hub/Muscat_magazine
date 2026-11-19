import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { ko } from '@payloadcms/translations/languages/ko'
import { en } from '@payloadcms/translations/languages/en'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { createHash } from 'crypto'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Genres } from './collections/Genres'
import { Picks } from './collections/Picks'
import { Tags } from './collections/Tags'
import { Artists } from './collections/Artists'
import { Articles } from './collections/Articles'
import { Inquiries, Subscribers } from './collections/Inquiries'
import { Stats } from './collections/Stats'
import { Playlists } from './collections/Playlists'
import { AboutPage, SiteSettings } from './globals/Settings'
import { SpotifySync } from './globals/SpotifySync'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || ''
// Vercel이 자동으로 넣어 주는 운영 주소를 기본값으로 씁니다.
const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
// PAYLOAD_SECRET을 따로 넣지 않으면 DB 주소에서 만든 값을 씁니다. (직접 넣으면 그 값이 우선)
const SECRET =
  process.env.PAYLOAD_SECRET || (DB_URL ? createHash('sha256').update('muscat:' + DB_URL).digest('hex') : '')

export default buildConfig({
  serverURL: SERVER_URL,
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' — Muscat Magazine 관리자',
      icons: [{ rel: 'icon', type: 'image/png', url: '/favicon.png' }],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      beforeDashboard: ['/components/admin/StatsDashboard#StatsDashboard'],
    },
  },
  i18n: {
    fallbackLanguage: 'ko',
    supportedLanguages: { ko, en },
  },
  collections: [Articles, Picks, Playlists, Artists, Genres, Tags, Media, Inquiries, Subscribers, Users, Stats],
  globals: [SiteSettings, AboutPage, SpotifySync],
  editor: lexicalEditor(),
  secret: SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: DB_URL,
    },
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  plugins: [
    // Vercel Blob 토큰이 있을 때(배포 환경)만 이미지를 Vercel Blob에 저장합니다.
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
      // 사진을 브라우저에서 Blob 저장소로 바로 올려요. Vercel 서버를 거치지 않아 4.5MB 제한에 걸리지 않습니다.
      clientUploads: true,
    }),
  ],
})
