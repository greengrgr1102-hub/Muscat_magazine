import type { CollectionConfig } from 'payload'

const todayKst = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)

// 업데이트 노트 — 하루에 뭐가 바뀌었는지 독자에게 짧게 알려요.
// 새 곡·새 장르·새 글·YouTube 연결 숫자는 사이트가 알아서 세고, 여기엔 새 기능 소식만 한 줄씩 적어요.
export const Updates: CollectionConfig = {
  slug: 'updates',
  labels: { singular: '업데이트 노트', plural: '업데이트 노트' },
  admin: {
    group: '콘텐츠',
    useAsTitle: 'day',
    defaultColumns: ['day', 'note', 'updatedAt'],
    description: '날짜 하나에 한 칸. 독자에게 보이는 짧은 소식만 적어요 (숫자는 자동).',
  },
  defaultSort: '-day',
  access: { read: () => true },
  fields: [
    {
      name: 'day',
      label: '날짜',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      defaultValue: todayKst,
      admin: { description: '예: 2026-11-22' },
      validate: (v: unknown) =>
        typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? true : 'YYYY-MM-DD로 적어 주세요',
    },
    {
      name: 'note',
      label: '소식',
      type: 'textarea',
      required: true,
      admin: {
        description:
          '한 줄에 하나. 링크를 걸려면 줄 끝에 → /주소 (예: 탐험에 페스티벌이 생겼어요 → /explore/festivals)',
      },
    },
  ],
}
