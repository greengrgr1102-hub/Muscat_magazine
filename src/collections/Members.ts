import type { CollectionConfig } from 'payload'

// 방문자 회원 (구글 로그인). 관리자 계정(users)과는 완전히 따로예요 — 관리자 화면에는 못 들어와요.
// room: My Room 기록(좋아요한 곡·들은 곡·최근 들은 곡·취향 결과)을 기기 사이에 옮기려고 저장해요.
export const Members: CollectionConfig = {
  slug: 'members',
  labels: { singular: '회원', plural: '회원' },
  admin: {
    group: '방문자',
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'friend', 'lastLoginAt', 'createdAt'],
    description: '구글로 로그인한 방문자. 프렌즈(후원) 여부는 여기서 표시해요.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'email', label: '이메일', type: 'email', required: true, unique: true },
    { name: 'name', label: '이름', type: 'text' },
    { name: 'image', label: '프로필 사진 주소', type: 'text', admin: { readOnly: true } },
    {
      name: 'googleSub',
      label: '구글 계정 번호',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'friend',
      label: '머스캣 프렌즈',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'lastLoginAt',
      label: '마지막 로그인',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
    { name: 'room', label: 'My Room 기록', type: 'json', admin: { readOnly: true } },
  ],
}
