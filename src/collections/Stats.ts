import type { CollectionConfig } from 'payload'

// 조회수 기록 — 날짜(day)와 대상(key)별 숫자만 저장합니다. 개인정보는 없어요.
// key 예: 'site'(페이지 보기), 'visitors'(그날 처음 온 브라우저 수), 'article:12', 'pick:5', 'play:5'
export const Stats: CollectionConfig = {
  slug: 'stats',
  labels: { singular: '조회수 기록', plural: '조회수 기록' },
  admin: { hidden: true },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: () => false,
    delete: ({ req }) => Boolean(req.user),
  },
  timestamps: false,
  indexes: [{ fields: ['day', 'key'], unique: true }],
  fields: [
    { name: 'day', type: 'text', required: true, index: true },
    { name: 'key', type: 'text', required: true, index: true },
    { name: 'count', type: 'number', defaultValue: 0 },
  ],
}
