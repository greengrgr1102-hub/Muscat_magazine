import type { CollectionConfig } from 'payload'

// Editor's Picks — 에디터가 들은 곡 중 좋았던 곡을 하나씩 올리는 짧은 기록.
// Spotify 링크만 붙이면 곡 제목·커버를 Spotify에서 가져와 채웁니다.

export const PICK_MOODS = [
  { label: '몽환적인', value: 'dreamy' },
  { label: '신나는', value: 'upbeat' },
  { label: '잔잔한', value: 'calm' },
  { label: '쓸쓸한', value: 'melancholy' },
  { label: '거친', value: 'raw' },
]
export const PICK_TEXTURES = [
  { label: '기타·밴드 사운드', value: 'guitar' },
  { label: '신스·전자음', value: 'synth' },
  { label: '어쿠스틱', value: 'acoustic' },
  { label: '리듬·그루브', value: 'groove' },
]
export const PICK_VOCALS = [
  { label: '목소리가 앞에', value: 'front' },
  { label: '소리에 묻힌 보컬', value: 'blended' },
  { label: '연주곡', value: 'instrumental' },
]
export const PICK_REGIONS = [
  { label: '한국', value: 'korea' },
  { label: '일본', value: 'japan' },
  { label: '중화권', value: 'chinese' },
  { label: '동남아시아', value: 'sea' },
  { label: '영미권', value: 'west' },
  { label: '그 밖의 지역', value: 'etc' },
]

const SPOTIFY_RE = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/

export function parseSpotify(url?: string | null): { kind: string; id: string } | null {
  const m = url?.match(SPOTIFY_RE)
  return m ? { kind: m[1], id: m[2] } : null
}

export const Picks: CollectionConfig = {
  slug: 'picks',
  labels: { singular: "Editor's Pick", plural: "Editor's Picks" },
  admin: {
    group: '콘텐츠',
    useAsTitle: 'track',
    defaultColumns: ['track', 'artistName', 'pickedAt'],
    description: 'Spotify 곡 링크와 한 줄 코멘트만 넣으면 됩니다. 곡 제목과 커버는 저장할 때 자동으로 채워져요.',
  },
  defaultSort: '-pickedAt',
  access: { read: () => true },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc }) => {
        const sp = parseSpotify(data.spotifyUrl)
        if (!sp) return data
        const changed = data.spotifyUrl !== originalDoc?.spotifyUrl
        if (!changed && data.track && data.coverUrl) return data
        try {
          const res = await fetch(
            `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/${sp.kind}/${sp.id}`)}`,
            { signal: AbortSignal.timeout(5000) },
          )
          if (res.ok) {
            const o = (await res.json()) as { title?: string; thumbnail_url?: string }
            if (o.title && (!data.track || changed)) data.track = o.title
            if (o.thumbnail_url) data.coverUrl = o.thumbnail_url
          }
        } catch {
          // Spotify에 닿지 않으면 직접 적은 값 그대로 저장합니다.
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'spotifyUrl',
      label: 'Spotify 링크',
      type: 'text',
      required: true,
      admin: { description: 'Spotify 앱에서 공유 → 링크 복사 (곡·앨범·플레이리스트)' },
      validate: (v: string | null | undefined) =>
        parseSpotify(v) ? true : 'open.spotify.com/track/… 형태의 Spotify 링크를 넣어 주세요.',
    },
    {
      name: 'artistName',
      label: '아티스트',
      type: 'text',
      required: true,
    },
    {
      name: 'comment',
      label: '에디터 한 줄',
      type: 'textarea',
      required: true,
      maxLength: 300,
      admin: { description: '왜 좋았는지 한두 문장으로' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'pickedAt',
          label: '고른 날짜',
          type: 'date',
          required: true,
          defaultValue: () => new Date().toISOString(),
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'yyyy.MM.dd' }, width: '50%' },
        },
        {
          name: 'track',
          label: '곡 제목',
          type: 'text',
          admin: { description: '비워 두면 Spotify에서 가져와요', width: '50%' },
        },
      ],
    },
    {
      name: 'artist',
      label: '아티스트 페이지 연결 (선택)',
      type: 'relationship',
      relationTo: 'artists',
      admin: { description: '사이트에 아티스트 페이지가 있으면 고르세요. 그 페이지에도 이 곡이 보여요.' },
    },
    { name: 'genres', label: '장르', type: 'relationship', relationTo: 'genres', hasMany: true },
    {
      type: 'collapsible',
      label: '취향 태그 (취향 찾기 추천에 쓰여요)',
      admin: { initCollapsed: false },
      fields: [
        { name: 'moods', label: '분위기', type: 'select', hasMany: true, options: PICK_MOODS },
        { name: 'textures', label: '소리 질감', type: 'select', hasMany: true, options: PICK_TEXTURES },
        { name: 'vocal', label: '보컬', type: 'select', options: PICK_VOCALS },
        { name: 'region', label: '지역', type: 'select', options: PICK_REGIONS },
      ],
    },
    {
      name: 'coverUrl',
      label: '커버 이미지 주소',
      type: 'text',
      admin: { readOnly: true, description: 'Spotify에서 자동으로 가져온 커버', position: 'sidebar' },
    },
  ],
}
