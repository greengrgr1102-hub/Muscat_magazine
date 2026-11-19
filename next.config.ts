import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // 공유 카드 이미지를 만들 때 쓰는 글꼴 파일을 배포 묶음에 포함
  outputFileTracingIncludes: {
    '/**': ['./src/assets/og/**/*'],
    // 일본어 제목을 로마자로 바꿀 때 쓰는 사전 (자동 채우기가 도는 화면에만)
    '/spotify/sync': ['./node_modules/kuromoji/dict/**/*'],
    '/spotify': ['./node_modules/kuromoji/dict/**/*'],
  },
  // 사전 파일을 읽는 패키지는 묶지 않고 그대로 써요
  serverExternalPackages: ['kuroshiro', 'kuroshiro-analyzer-kuromoji', 'kuromoji'],
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
