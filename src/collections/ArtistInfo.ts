import type { CollectionConfig } from 'payload'

/**
 * 곡 기록(Editor's Picks)에 나오는 아티스트의 검색용 정보.
 * 아티스트 페이지를 따로 만들지 않아도, 다른 이름이나 멤버 이름으로 찾을 수 있게 해요.
 */
export const ArtistInfo: CollectionConfig = {
  slug: 'artist-info',
  labels: { singular: '아티스트 검색 정보', plural: '아티스트 검색 정보' },
  admin: {
    group: '콘텐츠',
    useAsTitle: 'name',
    defaultColumns: ['name', 'members', 'aliases'],
    description: '곡 기록의 아티스트 이름 그대로 적고, 멤버·다른 이름을 쉼표로 적으면 검색에 걸려요.',
  },
  access: { read: () => true },
  fields: [
    {
      name: 'name',
      label: '아티스트 이름 (곡 기록과 똑같이)',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    { name: 'members', label: '멤버', type: 'text', admin: { description: '쉼표로 구분 (예: 김한주, 김건재, 최웅희)' } },
    { name: 'aliases', label: '다른 이름', type: 'text', admin: { description: '쉼표로 구분 (예: 영어 이름, 옛 이름)' } },
    { name: 'checkedAt', type: 'date', admin: { hidden: true } },
  ],
}
