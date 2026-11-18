import type { CollectionConfig } from 'payload'
import { slugField } from './fields'

export const Genres: CollectionConfig = {
  slug: 'genres',
  labels: { singular: '장르', plural: '장르' },
  admin: {
    group: '콘텐츠',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'order'],
  },
  defaultSort: 'order',
  access: { read: () => true },
  fields: [
    { name: 'name', label: '장르 이름', type: 'text', required: true, admin: { description: '예: Shoegaze' } },
    slugField('name'),
    {
      name: 'description',
      label: '설명',
      type: 'textarea',
      admin: { description: '장르 페이지 상단에 보이는 짧은 소개 (선택)' },
    },
    {
      name: 'order',
      label: '정렬 순서',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', description: '아티클 목록의 장르 선택 순서입니다. 검색 화면의 장르는 열 때마다 무작위로 섞입니다.' },
    },
  ],
}
