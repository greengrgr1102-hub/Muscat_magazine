import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { ko } from '@payloadcms/translations/languages/ko'
import { en } from '@payloadcms/translations/languages/en'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Genres } from './collections/Genres'
import { Artists } from './collections/Artists'
import { Articles } from './collections/Articles'
import { Inquiries, Subscribers } from './collections/Inquiries'
import { AboutPage, SiteSettings } from './globals/Settings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || '',
  admin: {
    user: Users.slug,
    meta: { titleSuffix: ' — Muscat Magazine 관리자' },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    fallbackLanguage: 'ko',
    supportedLanguages: { ko, en },
  },
  collections: [Articles, Artists, Genres, Media, Inquiries, Subscribers, Users],
  globals: [SiteSettings, AboutPage],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
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
    }),
  ],
})
