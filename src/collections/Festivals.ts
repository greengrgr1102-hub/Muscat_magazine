import { revalidatePath } from 'next/cache'
import type { CollectionConfig } from 'payload'

/**
 * 올해 페스티벌 출연진 — Explore › 페스티벌 페이지에 보여요.
 * 출연진은 한 줄에 한 팀씩. "## 7/31 (금)"처럼 ##로 시작하는 줄은 날짜(요일) 제목이 돼요.
 * 곡 기록에 있는 아티스트는 페이지에서 녹색 점이 붙고, 누르면 바로 들을 수 있어요.
 */
export const Festivals: CollectionConfig = {
  slug: 'festivals',
  labels: { singular: '페스티벌', plural: '페스티벌' },
  admin: {
    group: '콘텐츠',
    useAsTitle: 'name',
    defaultColumns: ['name', 'startDate', 'country', 'place'],
    description: '올해 페스티벌 출연진. 출연진은 한 줄에 한 팀, "## 날짜"로 날짜를 나눠요.',
  },
  access: { read: () => true },
  // 관리자에서 고치면 페스티벌 페이지를 바로 새로 만들어요
  hooks: {
    afterChange: [
      () => {
        try {
          revalidatePath('/explore/festivals')
        } catch {}
      },
    ],
    afterDelete: [
      () => {
        try {
          revalidatePath('/explore/festivals')
        } catch {}
      },
    ],
  },
  defaultSort: 'startDate',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          label: '페스티벌 이름',
          type: 'text',
          required: true,
          admin: { width: '60%' },
        },
        { name: 'nameAlt', label: '다른 이름 (영문 등)', type: 'text', admin: { width: '40%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startDate',
          label: '시작일',
          type: 'text',
          required: true,
          index: true,
          admin: { width: '25%', description: '예: 2026-07-31' },
        },
        {
          name: 'endDate',
          label: '마지막 날',
          type: 'text',
          admin: { width: '25%', description: '예: 2026-08-02' },
        },
        {
          name: 'country',
          label: '나라',
          type: 'text',
          admin: { width: '20%', description: 'KR, JP, TW…' },
        },
        { name: 'place', label: '장소', type: 'text', admin: { width: '30%' } },
      ],
    },
    { name: 'url', label: '공식 페이지', type: 'text' },
    {
      name: 'lineup',
      label: '출연진',
      type: 'textarea',
      admin: {
        rows: 20,
        description: '한 줄에 한 팀. "## 7/31 (금)"처럼 ##로 시작하면 날짜 제목.',
      },
    },
    {
      name: 'partial',
      label: '출연진 일부만 확인됨',
      type: 'checkbox',
      admin: { description: '켜 두면 페이지에 "공개된 기사 기준 일부"라고 표시돼요.' },
    },
    {
      name: 'flat',
      label: '출연 순서 없음',
      type: 'checkbox',
      admin: {
        description:
          '켜 두면 포스터처럼 앞 팀을 크게 하지 않고 모두 같은 크기로 보여요 (쇼케이스형 페스티벌처럼 헤드라이너가 없을 때).',
      },
    },
    {
      name: 'source',
      label: '출처 메모',
      type: 'text',
      admin: { description: '라인업을 확인한 곳 (페이지엔 안 보여요)' },
    },
  ],
}
