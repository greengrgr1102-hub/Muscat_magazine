import type { CollectionConfig } from 'payload'
import { slugField } from './fields'

// 에디터 플리 — Editor's Picks 곡들을 골라 엮은 플레이리스트.
// 공개하면 사이트 /playlists 에 올라가고, 방문자가 「통째로 담기」로 자기 플리에 담을 수 있어요.
export const Playlists: CollectionConfig = {
  slug: 'playlists',
  labels: { singular: '에디터 플리', plural: '에디터 플리' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'songs', 'updatedAt', '_status'],
    description: 'Editor\'s Picks 곡을 골라 플레이리스트로 엮어요. 공개하면 사이트에 올라가요.',
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
  },
  fields: [
    { name: 'title', label: '제목', type: 'text', required: true },
    slugField('title'),
    {
      name: 'description',
      label: '소개',
      type: 'textarea',
      admin: { description: '어떤 순간에 듣는 플리인지 짧게 (예: 새벽 3시, 잠들기 전 듣는 슈게이즈)' },
    },
    {
      name: 'cover',
      label: '커버 (선택)',
      type: 'upload',
      relationTo: 'media',
      admin: { description: '비워 두면 앞쪽 곡 커버 4장을 모아 보여 줘요.' },
    },
    {
      name: 'songs',
      label: '곡',
      type: 'relationship',
      relationTo: 'picks',
      hasMany: true,
      required: true,
      admin: {
        description: '곡 이름으로 검색해서 담아요. 끌어서 순서를 바꿀 수 있어요.',
        isSortable: true,
      },
    },
  ],
}
