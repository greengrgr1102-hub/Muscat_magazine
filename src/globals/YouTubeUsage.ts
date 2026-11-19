import type { GlobalConfig } from 'payload'

// YouTube 검색 사용량 (하루 무료 한도를 넘지 않게). 관리자 화면에는 안 보여요.
export const YouTubeUsage: GlobalConfig = {
  slug: 'youtube-usage',
  admin: { hidden: true },
  access: { read: () => false, update: () => false },
  fields: [
    { name: 'day', type: 'text' },
    { name: 'count', type: 'number', defaultValue: 0 },
  ],
}
