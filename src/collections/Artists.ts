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
    {
      type: 'row',
      fields: [
        { name: 'photo', label: '대표 사진 (4:5)', type: 'upload', relationTo: 'media', admin: { width: '50%' } },
        {
          name: 'face',
          label: '작은 얼굴 사진 (선택)',
          type: 'upload',
          relationTo: 'media',
          admin: {
            width: '50%',
            description: '인터뷰 답변 옆 동그라미에 쓰여요. 정사각형 얼굴 사진이 좋아요. 비우면 대표 사진을 잘라 써요.',
          },
        },
      ],
    },
    {
      name: 'members',
      label: '멤버 (밴드일 때만)',
      type: 'array',
      labels: { singular: '멤버', plural: '멤버' },
      admin: {
        initCollapsed: true,
        description:
          '솔로 아티스트는 비워 두세요 — 위의 사진과 이름이 그대로 쓰여요. 멤버가 탈퇴해도 지우지 말고 「탈퇴한 멤버」에 체크해 주세요. 예전 인터뷰에서는 그 멤버 얼굴이 그대로 보이고, 아티스트 페이지에서는 전 멤버로 따로 표시돼요.',
        components: { RowLabel: '/components/admin/MemberRowLabel#MemberRowLabel' },
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', label: '이름', type: 'text', required: true, admin: { width: '50%' } },
            { name: 'role', label: '포지션', type: 'text', admin: { width: '50%', description: '예: 보컬, 기타' } },
          ],
        },
        { name: 'photo', label: '얼굴 사진 (정사각형이 좋아요)', type: 'upload', relationTo: 'media' },
        {
          name: 'artist',
          label: '이 멤버의 아티스트 페이지 (선택)',
          type: 'relationship',
          relationTo: 'artists',
          admin: {
            description: '솔로 활동 페이지가 있으면 골라 주세요. 아티스트 페이지에서 멤버 이름을 누르면 그 페이지로 가요. 예: 실리카겔 김춘추 → 놀이도감',
          },
        },
        {
          type: 'row',
          fields: [
            { name: 'left', label: '탈퇴한 멤버', type: 'checkbox', admin: { width: '50%' } },
            {
              name: 'period',
              label: '활동 기간 (선택)',
              type: 'text',
              admin: { width: '50%', description: '예: 2015 – 2021' },
            },
          ],
        },
      ],
    },
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
