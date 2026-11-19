import type { CollectionConfig } from 'payload'

// Editor's Picks — 에디터가 들은 곡 중 좋았던 곡을 하나씩 올리는 짧은 기록.
// Spotify 링크만 붙이면 곡 제목·커버를 Spotify에서 가져와 채웁니다.

const SPOTIFY_RE = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/

export function youtubeIdOf(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) return null
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s
  const m = s.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

export function parseSpotify(url?: string | null): { kind: string; id: string } | null {
  const m = url?.match(SPOTIFY_RE)
  return m ? { kind: m[1], id: m[2] } : null
}

export const Picks: CollectionConfig = {
  slug: 'picks',
  labels: { singular: "Editor's Pick", plural: "Editor's Picks" },
  admin: {
    group: '콘텐츠',
    useAsTitle: 'label',
    defaultColumns: ['track', 'artistName', 'pickedAt'],
    description: 'Spotify 곡 링크와 한 줄 코멘트만 넣으면 됩니다. 곡 제목과 커버는 저장할 때 자동으로 채워져요.',
  },
  defaultSort: '-pickedAt',
  access: { read: () => true },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation }) => {
        const sp = parseSpotify(data.spotifyUrl)
        if (!sp) return data
        const changed = data.spotifyUrl !== originalDoc?.spotifyUrl
        // 곡 이름과 커버가 이미 있으면(플레이리스트 자동 가져오기 등) Spotify에 다시 묻지 않아요.
        if ((!changed || operation === 'create') && data.track && data.coverUrl) return data
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
      maxLength: 300,
      admin: { description: '왜 좋았는지 한두 문장으로 (비워 둬도 돼요)' },
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
      name: 'tags',
      label: '취향 태그',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      admin: {
        description: '분위기, 질감, 듣기 좋은 순간 등 자유롭게. 목록에 없으면 오른쪽 + 버튼으로 바로 만들어요. 비슷한 곡 추천에 쓰여요.',
      },
    },
    {
      name: 'coverUrl',
      label: '커버 이미지 주소',
      type: 'text',
      admin: { readOnly: true, description: 'Spotify에서 자동으로 가져온 커버', position: 'sidebar' },
    },
    {
      // 관리자 화면 검색·선택용 이름: "곡 — 아티스트"
      name: 'label',
      type: 'text',
      index: true,
      admin: { hidden: true },
      hooks: {
        beforeChange: [({ siblingData }) => `${siblingData.track || 'Untitled'} — ${siblingData.artistName || ''}`.trim()],
      },
    },
    {
      name: 'youtubeId',
      label: 'YouTube 영상',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: '비워 두면 처음 재생될 때 자동으로 찾아요. 엉뚱한 영상이면 YouTube 링크를 붙여 넣어 바꿔 주세요.',
      },
      hooks: {
        // youtube.com/watch?v=… · youtu.be/… · music.youtube.com/… 어떤 링크든 영상 ID만 남겨요
        beforeChange: [({ value }) => youtubeIdOf(value) ?? (value ? String(value).trim() : value)],
      },
    },
    {
      name: 'youtubeMissAt',
      type: 'date',
      admin: { hidden: true },
    },
    {
      name: 'album',
      label: '앨범',
      type: 'text',
      admin: { position: 'sidebar', description: 'Spotify에서 자동으로 가져와요' },
    },
    {
      name: 'releaseDate',
      label: '발매일',
      type: 'text',
      admin: { position: 'sidebar', description: '예: 2019-07 또는 2019-07-12 (Spotify에서 자동)' },
    },
  ],
}
