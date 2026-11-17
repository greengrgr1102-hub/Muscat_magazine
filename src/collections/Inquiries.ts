import type { CollectionConfig } from 'payload'

export const Inquiries: CollectionConfig = {
  slug: 'inquiries',
  labels: { singular: '문의', plural: '문의' },
  admin: {
    group: '받은 것',
    useAsTitle: 'name',
    defaultColumns: ['name', 'kind', 'email', 'status', 'createdAt'],
  },
  defaultSort: '-createdAt',
  access: {
    // 문의는 사이트 폼에서 서버를 통해서만 들어오고, 관리자만 읽을 수 있습니다.
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', label: '이름', type: 'text', required: true },
    { name: 'email', label: '이메일', type: 'email', required: true },
    {
      name: 'kind',
      label: '문의 유형',
      type: 'select',
      required: true,
      options: [
        { label: '인터뷰', value: 'interview' },
        { label: '음원 제보', value: 'submission' },
        { label: '협업', value: 'collab' },
        { label: '기타', value: 'etc' },
      ],
    },
    { name: 'message', label: '메시지', type: 'textarea', required: true },
    {
      name: 'status',
      label: '처리 상태',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: '새 문의', value: 'new' },
        { label: '답변함', value: 'replied' },
        { label: '보관', value: 'archived' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}

export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  labels: { singular: '뉴스레터 구독자', plural: '뉴스레터 구독자' },
  admin: { group: '받은 것', useAsTitle: 'email', defaultColumns: ['email', 'createdAt'] },
  defaultSort: '-createdAt',
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [{ name: 'email', label: '이메일', type: 'email', required: true, unique: true }],
}
