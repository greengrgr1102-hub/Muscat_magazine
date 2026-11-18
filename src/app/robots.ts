import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/spotify'

// 검색엔진 안내: 관리자·도구 화면은 빼고 모두 수집해도 돼요.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/import', '/spotify', '/api/'] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  }
}
