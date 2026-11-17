import type { Field } from 'payload'

/** URL에 쓰는 고유 이름. 비워 두면 제목에서 자동으로 만들어집니다. */
export const slugField = (from = 'title'): Field => ({
  name: 'slug',
  label: '주소 (slug)',
  type: 'text',
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description: '사이트 주소에 쓰입니다. 비워 두면 자동으로 만들어집니다. 예: shoegaze, album-title',
  },
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        const source = (value as string) || (data?.[from] as string) || ''
        return slugify(source)
      },
    ],
  },
})

export function slugify(input: string): string {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** 듣기 링크 (Melon, Spotify, YouTube 등) */
export const listenLinksField = (name = 'listen', label = '듣기 링크'): Field => ({
  name,
  label,
  type: 'array',
  labels: { singular: '링크', plural: '링크' },
  admin: { initCollapsed: true },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'service',
          label: '서비스',
          type: 'select',
          required: true,
          defaultValue: 'melon',
          options: [
            { label: 'Melon', value: 'melon' },
            { label: 'Spotify', value: 'spotify' },
            { label: 'YouTube', value: 'youtube' },
            { label: 'Apple Music', value: 'apple' },
            { label: 'Bandcamp', value: 'bandcamp' },
            { label: 'SoundCloud', value: 'soundcloud' },
            { label: 'Instagram', value: 'instagram' },
            { label: '기타', value: 'other' },
          ],
          admin: { width: '30%' },
        },
        { name: 'url', label: '주소', type: 'text', required: true, admin: { width: '70%' } },
      ],
    },
  ],
})
