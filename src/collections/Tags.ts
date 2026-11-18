import type { CollectionConfig } from 'payload'
import { slugField } from './fields'

// 취향 태그 — 에디터가 자유롭게 만들어 Editor's Picks에 붙이는 태그.
// '비슷한 곡 추천'과 취향 찾기가 이 태그를 기준으로 곡을 묶습니다.
export const TAG_GROUPS = [
  { label: '분위기', value: 'mood' },
  { label: '소리 질감', value: 'texture' },
  { label: '보컬', value: 'vocal' },
  { label: '지역', value: 'region' },
  { label: '상황·계절', value: 'scene' },
  { label: '기타', value: 'etc' },
]

export const Tags: CollectionConfig = {
  slug: 'tags',
  labels: { singular: '취향 태그', plural: '취향 태그' },
  admin: {
    group: '콘텐츠',
    useAsTitle: 'name',
    defaultColumns: ['name', 'group'],
    description: "Editor's Picks에 붙이는 태그예요. 곡 편집 화면에서 바로 새 태그를 만들 수도 있어요.",
  },
  defaultSort: 'group',
  access: { read: () => true },
  fields: [
    { name: 'name', label: '태그', type: 'text', required: true, admin: { description: '예: 몽환적인, 새벽에 듣기, 기타 노이즈' } },
    { name: 'group', label: '분류', type: 'select', options: TAG_GROUPS, defaultValue: 'mood' },
    slugField('name'),
  ],
}
