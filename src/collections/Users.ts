import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: '관리자', plural: '관리자' },
  admin: {
    group: '설정',
    useAsTitle: 'name',
    defaultColumns: ['name', 'email'],
  },
  auth: true,
  fields: [
    { name: 'name', label: '이름 (필명)', type: 'text', admin: { description: '아티클의 Editor 칸에 표시됩니다' } },
  ],
}
