import type { CollectionConfig, Condition } from 'payload'
import { listenLinksField, slugField } from './fields'
import { totalFor } from '../lib/stats'

export const ARTICLE_TYPES = [
  { label: 'Album Review (앨범 리뷰)', value: 'review' },
  { label: 'Interview (인터뷰)', value: 'interview' },
  { label: 'Curation (플레이리스트)', value: 'playlist' },
  { label: 'Release (발매 소식)', value: 'release' },
] as const

const is =
  (type: string): Condition =>
  (data) =>
    data?.type === type

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: '아티클', plural: '아티클' },
  admin: {
    group: '콘텐츠',
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'publishedAt', 'views', '_status'],
    listSearchableFields: ['title', 'excerpt'],
  },
  defaultSort: '-publishedAt',
  versions: {
    drafts: { autosave: { interval: 2000 } },
    maxPerDoc: 30,
  },
  access: {
    // 공개된 글만 누구나 볼 수 있고, 임시저장 글은 로그인한 사람만 봅니다.
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
  },
  fields: [
    { name: 'title', label: '제목', type: 'text', required: true },
    {
      // 저장되지 않는 칸 — 관리자 화면에서 볼 때마다 조회수 기록을 더해서 보여줘요.
      name: 'views',
      label: '조회수',
      type: 'number',
      virtual: true,
      admin: { position: 'sidebar', readOnly: true, description: '사이트에서 이 글이 열린 횟수 (전체 기간)' },
      hooks: {
        afterRead: [
          async ({ req, originalDoc }) => {
            if (!req.user || !originalDoc?.id) return undefined
            try {
              return await totalFor(req.payload, `article:${originalDoc.id}`)
            } catch {
              return 0
            }
          },
        ],
      },
    },
    {
      name: 'type',
      label: '글 종류',
      type: 'select',
      required: true,
      defaultValue: 'review',
      options: [...ARTICLE_TYPES],
      admin: { position: 'sidebar' },
    },
    slugField('title'),
    {
      name: 'publishedAt',
      label: '발행일',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly', displayFormat: 'yyyy.MM.dd' } },
    },
    {
      name: 'featured',
      label: '홈 대표 글로 걸기',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: '가장 최근에 체크한 글이 홈 상단에 크게 걸립니다' },
    },
    {
      name: 'author',
      label: '에디터',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar' },
      defaultValue: ({ user }) => user?.id,
    },
    {
      name: 'readingTime',
      label: '읽는 시간 (분)',
      type: 'number',
      admin: { position: 'sidebar' },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: '기본',
          fields: [
            {
              name: 'excerpt',
              label: '요약 (한두 문장)',
              type: 'textarea',
              admin: { description: '제목 아래와 목록·검색 결과에 보입니다' },
            },
            { name: 'cover', label: '커버 이미지', type: 'upload', relationTo: 'media' },
            {
              type: 'row',
              fields: [
                {
                  name: 'artists',
                  label: '관련 아티스트',
                  type: 'relationship',
                  relationTo: 'artists',
                  hasMany: true,
                  admin: { width: '50%', description: '여기에 연결하면 아티스트 페이지에 이 글이 쌓입니다' },
                },
                {
                  name: 'genres',
                  label: '장르',
                  type: 'relationship',
                  relationTo: 'genres',
                  hasMany: true,
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'tags',
              label: '태그',
              type: 'text',
              hasMany: true,
              admin: { description: '#없이 입력 후 Enter (예: 앨범리뷰)' },
            },
          ],
        },
        {
          label: '본문',
          fields: [
            {
              name: 'intro',
              label: '도입 글',
              type: 'richText',
              admin: { description: '본문 맨 앞에 오는 글' },
            },

            // --- 앨범 리뷰 ---
            {
              name: 'albums',
              label: '다룬 앨범',
              type: 'array',
              labels: { singular: '앨범', plural: '앨범' },
              admin: { condition: is('review'), initCollapsed: false },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'albumTitle', label: '앨범 제목', type: 'text', required: true, admin: { width: '50%' } },
                    { name: 'artistName', label: '아티스트', type: 'text', admin: { width: '50%' } },
                  ],
                },
                { name: 'cover', label: '앨범 커버 (1:1)', type: 'upload', relationTo: 'media' },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'essential',
                      label: 'Essential — 꼭 들어야 할 앨범',
                      type: 'checkbox',
                      defaultValue: false,
                      admin: { width: '40%', description: '체크하면 리뷰에 Essential 표시가 붙고 /essential 페이지에 모여요.' },
                    },
                    {
                      name: 'essentialLine',
                      label: 'Essential 한 줄 (선택)',
                      type: 'text',
                      admin: {
                        width: '60%',
                        description: 'Essential 페이지 카드에 보일 짧은 이유',
                        condition: (_, sib) => Boolean(sib?.essential),
                      },
                    },
                  ],
                },
                { name: 'body', label: '리뷰', type: 'richText' },
                listenLinksField(),
              ],
            },

            // --- 인터뷰 ---
            {
              name: 'qa',
              label: '질문과 답',
              type: 'array',
              labels: { singular: '문답', plural: '문답' },
              admin: { condition: is('interview') },
              fields: [
                {
                  name: 'background',
                  label: '배경 설명 (선택)',
                  type: 'textarea',
                  admin: { description: '질문 앞에 회색으로 보이는 맥락 설명' },
                },
                {
                  name: 'question',
                  label: '질문',
                  type: 'textarea',
                  admin: {
                    description: '같은 질문에 멤버 여러 명이 답했다면, 다음 문답을 하나 더 추가해서 질문은 비우고 답한 사람과 답만 넣으세요.',
                  },
                },
                {
                  name: 'speaker',
                  label: '답한 사람 (선택)',
                  type: 'text',
                  admin: {
                    description:
                      '아티스트 페이지에 등록한 멤버 이름을 그대로 적으면 그 멤버 얼굴이 나와요. 비워 두면 아티스트 대표 사진이 나와요.',
                  },
                },
                { name: 'answer', label: '답', type: 'richText', required: true },
                {
                  name: 'pullQuote',
                  label: '이 문답 뒤에 넣을 인용구 (선택)',
                  type: 'textarea',
                },
              ],
            },

            // --- 플레이리스트 ---
            {
              name: 'tracks',
              label: '트랙 목록',
              type: 'array',
              labels: { singular: '트랙', plural: '트랙' },
              admin: { condition: is('playlist') },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'trackTitle', label: '곡 제목', type: 'text', required: true, admin: { width: '40%' } },
                    { name: 'artistName', label: '아티스트', type: 'text', required: true, admin: { width: '40%' } },
                    { name: 'duration', label: '길이', type: 'text', admin: { width: '20%', description: '예: 3:42' } },
                  ],
                },
                { name: 'note', label: '한 줄 코멘트', type: 'text' },
                { name: 'url', label: '듣기 링크', type: 'text' },
              ],
            },

            // --- 발매 소식 ---
            {
              name: 'releases',
              label: '발매 목록',
              type: 'array',
              labels: { singular: '발매', plural: '발매' },
              admin: { condition: is('release') },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'releaseTitle', label: '제목', type: 'text', required: true, admin: { width: '40%' } },
                    { name: 'artistName', label: '아티스트', type: 'text', required: true, admin: { width: '35%' } },
                    {
                      name: 'date',
                      label: '발매일',
                      type: 'date',
                      admin: { width: '25%', date: { pickerAppearance: 'dayOnly', displayFormat: 'MM.dd' } },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'kind',
                      label: '형태',
                      type: 'select',
                      defaultValue: 'single',
                      options: [
                        { label: '정규 앨범', value: 'album' },
                        { label: 'EP', value: 'ep' },
                        { label: '싱글', value: 'single' },
                        { label: '라이브 앨범', value: 'live' },
                      ],
                      admin: { width: '30%' },
                    },
                    { name: 'note', label: '한 줄 소개', type: 'text', admin: { width: '70%' } },
                  ],
                },
                { name: 'cover', label: '커버 (1:1)', type: 'upload', relationTo: 'media' },
                { name: 'url', label: '듣기 링크', type: 'text' },
              ],
            },

            {
              name: 'body',
              label: '맺음 글 (선택)',
              type: 'richText',
              admin: { description: '본문 맨 끝에 오는 글' },
            },
            {
              name: 'gallery',
              label: '사진 모음 (선택)',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              admin: {
                description:
                  '여러 장을 한 번에 올릴 수 있어요. "새로 만들기"에서 사진을 여러 장 끌어다 놓으면 한꺼번에 올라가요. 글 맨 아래에 사진 모음으로 보여요. 끌어서 순서를 바꿀 수 있어요.',
                // 인터뷰에서는 사진 모음을 쓰지 않아요 (사진은 본문 사이에)
                condition: (data) => data?.type !== 'interview',
              },
            },
          ],
        },
        {
          label: '추가 요소',
          fields: [
            listenLinksField('listen', '전체 듣기 링크'),
            {
              name: 'editorsPick',
              label: "Editor's Pick 트랙",
              type: 'array',
              labels: { singular: '트랙', plural: '트랙' },
              admin: { description: '앨범 리뷰 끝에 보이는 추천 트랙 (선택)' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'trackTitle', label: '곡 제목', type: 'text', required: true, admin: { width: '50%' } },
                    { name: 'artistName', label: '아티스트', type: 'text', admin: { width: '50%' } },
                  ],
                },
              ],
            },
            {
              name: 'related',
              label: '함께 볼 글 (선택)',
              type: 'relationship',
              relationTo: 'articles',
              hasMany: true,
              maxRows: 3,
              admin: { description: '비워 두면 같은 아티스트·종류의 최근 글이 자동으로 보입니다' },
            },
          ],
        },
      ],
    },
  ],
}
