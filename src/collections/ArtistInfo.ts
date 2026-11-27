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
    defaultColumns: ['name', 'kind', 'gender', 'members', 'aliases'],
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
    {
      type: 'row',
      fields: [
        {
          name: 'kind',
          label: '구성',
          type: 'select',
          options: [
            { label: '솔로', value: 'solo' },
            { label: '밴드·그룹', value: 'band' },
          ],
          admin: { width: '50%', description: '인디 워들에 쓰여요. 비어 있으면 MusicBrainz로 자동으로 채워요.' },
        },
        {
          name: 'gender',
          label: '성별',
          type: 'select',
          options: [
            { label: '남성', value: 'male' },
            { label: '여성', value: 'female' },
            { label: '혼성', value: 'mixed' },
          ],
          admin: { width: '50%', description: '그룹은 멤버 성별로 (남성만·여성만·혼성). 고쳐 두면 자동 채우기가 덮어쓰지 않아요.' },
        },
      ],
    },
    { name: 'checkedAt', type: 'date', admin: { hidden: true } },
    { name: 'profileCheckedAt', type: 'date', admin: { hidden: true } },
  ],
}
