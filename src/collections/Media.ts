import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: '이미지', plural: '이미지' },
  admin: { group: '콘텐츠' },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      label: '대체 텍스트',
      type: 'text',
      required: true,
      admin: { description: '이미지를 설명하는 짧은 문장 (예: Album Title 앨범 커버). 화면에는 안 보이고 검색·접근성용이에요' },
    },
    {
      name: 'caption',
      label: '사진 설명 (선택)',
      type: 'text',
      admin: { description: '사진 밑에 작게 보여요. 예: 2024년 롤링홀 공연 · 사진 홍길동' },
    },
  ],
  upload: {
    mimeTypes: ['image/*'],
    focalPoint: true,
    imageSizes: [
      { name: 'thumb', width: 240, height: 240, position: 'centre' },
      { name: 'card', width: 864 },
      { name: 'large', width: 1600 },
      { name: 'wide', width: 2400 },
    ],
  },
}
