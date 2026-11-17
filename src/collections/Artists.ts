import type { CollectionConfig } from 'payload'
import { listenLinksField, slugField } from './fields'

export const Artists: CollectionConfig = {
  slug: 'artists',
  labels: { singular: '아티스트', plural: '아티스트' },
  admin: {
    group: '콘텐츠',
    useAsTitle: 'name',
    defaultColumns: ['name', 'genres', 'updatedAt'],
  },
  access: { read: () => true },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', label: '아티스트 이름', type: 'text', required: true, admin: { width: '60%' } },
        {
          name: 'nameAlt',
          label: '다른 이름 (검색용)',
          type: 'text',
          admin: { width: '40%', description: '한글·영문 표기 등. 검색에 함께 쓰입니다' },
        },
      ],
    },
    slugField('name'),
    { name: 'photo', label: '대표 사진 (4:5)', type: 'upload', relationTo: 'media' },
    {
      name: 'genres',
      label: '장르',
      type: 'relationship',
      relationTo: 'genres',
      hasMany: true,
    },
    {
      type: 'collapsible',
      label: '에디터 소개글',
      fields: [
        {
          name: 'noteHeadline',
          label: '한 줄 소개',
          type: 'textarea',
          admin: { description: '예: 겹겹이 쌓은 기타 노이즈 아래로 또렷한 멜로디가 지나가는 밴드.' },
        },
        { name: 'note', label: '소개글 본문', type: 'richText' },
      ],
    },
    {
      type: 'collapsible',
      label: '기본 정보',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'basedIn', label: '활동 지역', type: 'text', admin: { width: '50%' } },
            { name: 'active', label: '활동 시기', type: 'text', admin: { width: '50%', description: '예: 2019 –' } },
          ],
        },
      ],
    },
    listenLinksField('links', '듣기·SNS 링크'),
  ],
}
