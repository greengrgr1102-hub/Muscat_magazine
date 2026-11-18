import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: '사이트 설정',
  admin: { group: '설정' },
  access: { read: () => true },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '홈',
          fields: [
            { name: 'heroLine1', label: '큰 제목 1줄', type: 'text', defaultValue: 'Music, picked' },
            { name: 'heroLine2', label: '큰 제목 2줄 (기울임체)', type: 'text', defaultValue: 'by ear.' },
            {
              name: 'heroIntro',
              label: '소개 문장',
              type: 'textarea',
              defaultValue:
                '머스캣 매거진은 에디터의 귀로 고른 음악을 소개합니다.\n사운드가 신선한 앨범을 리뷰하고, 지금 들어야 할 곡을\n고르고, 그 음악을 만든 사람을 만납니다.',
            },
          ],
        },
        {
          label: '연락처·SNS',
          fields: [
            { name: 'email', label: '대표 이메일', type: 'email', defaultValue: 'hello@muscatmagazine.com' },
            { name: 'instagramHandle', label: '인스타그램 계정', type: 'text', defaultValue: '@muscat.magazine' },
            { name: 'instagramUrl', label: '인스타그램 주소', type: 'text', defaultValue: 'https://instagram.com/' },
            { name: 'youtubeUrl', label: '유튜브 주소', type: 'text' },
            { name: 'blogUrl', label: '블로그 주소', type: 'text' },
          ],
        },
        {
          label: '풋터',
          fields: [
            {
              name: 'footerLine',
              label: '풋터 문구',
              type: 'textarea',
              defaultValue: '좋은 음악을 만나면\n가장 먼저 알려 드릴게요.',
            },
            {
              name: 'businessInfo',
              label: '사업자 정보 (Shop 오픈 시 입력)',
              type: 'textarea',
              admin: {
                description:
                  '상호, 대표자, 사업자등록번호, 통신판매업 신고번호, 주소, 연락처, 호스팅 제공자. 비워 두면 풋터에 표시되지 않습니다.',
              },
            },
          ],
        },
      ],
    },
  ],
}

export const AboutPage: GlobalConfig = {
  slug: 'about-page',
  label: 'About 페이지',
  admin: { group: '설정' },
  access: { read: () => true },
  fields: [
    {
      name: 'statement',
      label: '첫 문장',
      type: 'textarea',
      defaultValue: '머스캣 매거진은 에디터의 귀로 고른 음악을\n세상에 내놓는 인디 음악 매거진입니다.',
    },
    { name: 'image', label: '대표 이미지', type: 'upload', relationTo: 'media' },
    { name: 'approachTitle', label: 'Approach 제목', type: 'text', defaultValue: '사운드로 고릅니다.' },
    {
      name: 'approach',
      label: 'Approach 문단',
      type: 'array',
      maxRows: 3,
      fields: [{ name: 'text', label: '문단', type: 'textarea', required: true }],
    },
    {
      name: 'coverage',
      label: '하는 일',
      type: 'array',
      fields: [
        { name: 'title', label: '이름', type: 'text', required: true },
        { name: 'description', label: '설명', type: 'text' },
        {
          name: 'type',
          label: '연결할 글 종류',
          type: 'select',
          options: [
            { label: 'Album Review', value: 'review' },
            { label: 'Interview', value: 'interview' },
            { label: 'Curation', value: 'playlist' },
            { label: 'Release', value: 'release' },
          ],
        },
      ],
    },
    {
      name: 'principles',
      label: '원칙',
      type: 'array',
      fields: [
        { name: 'title', label: '원칙', type: 'textarea', required: true },
        { name: 'description', label: '설명', type: 'textarea' },
      ],
    },
  ],
}
