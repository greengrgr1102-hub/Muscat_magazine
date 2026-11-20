import type { CollectionConfig } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { cleanAlbumName } from '../lib/albumName'

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
    afterChange: [
      // 관리자가 나라·앨범 형태를 고치면 같은 아티스트(나라) / 같은 앨범 커버(형태)의 다른 곡에도 같이 넣어요.
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update' || !req.user) return doc
        const db = req.payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }
        try {
          if (doc.country && doc.country !== previousDoc?.country) {
            const first = String(doc.artistName || '').split(', ')[0]
            await db.drizzle.execute(sql`
              update picks set country = ${doc.country}, country_checked_at = now()
              where id <> ${doc.id} and split_part(artist_name, ', ', 1) = ${first}`)
          }
          const key = String(doc.coverUrl || '').match(/\/image\/([a-z0-9]{24,})$/i)?.[1]?.slice(-24)
          if (doc.releaseType && doc.releaseType !== previousDoc?.releaseType && key) {
            await db.drizzle.execute(sql`
              update picks set release_type = ${doc.releaseType}::enum_picks_release_type, type_checked_at = now()
              where id <> ${doc.id} and right(cover_url, 24) = ${key}`)
          }
        } catch {
          // 퍼뜨리기에 실패해도 이 곡 저장은 그대로
        }
        return doc
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
        description: '비워 두면 처음 재생될 때 공식 영상(아티스트 - Topic 채널, 아티스트 채널)만 자동으로 찾아요. 엉뚱한 영상이면 YouTube 링크를 붙여 넣어 바꿔 주세요.',
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
    // 저장한 YouTube 영상 길이를 곡 길이와 맞춰 봤는지 (쇼츠·짧은 클립 걸러내기)
    { name: 'youtubeCheckedAt', type: 'date', admin: { hidden: true } },
    {
      name: 'album',
      label: '앨범',
      type: 'text',
      admin: { position: 'sidebar', description: 'Spotify에서 자동으로 가져와요. 「The 2nd Mini Album」 같은 설명은 저장할 때 떼요.' },
      hooks: { beforeChange: [({ value }) => cleanAlbumName(value)] },
    },
    {
      name: 'releaseDate',
      label: '발매일',
      type: 'text',
      admin: { position: 'sidebar', description: '예: 2019-07 또는 2019-07-12 (Spotify에서 자동)' },
    },
    {
      name: 'releaseType',
      label: '앨범 형태',
      type: 'select',
      index: true,
      options: [
        { label: '정규', value: 'album' },
        { label: 'EP', value: 'ep' },
        { label: '싱글', value: 'single' },
        { label: '모음집', value: 'compilation' },
      ],
      admin: { position: 'sidebar', description: 'Spotify 앨범 페이지에서 자동으로 가져와요' },
    },
    {
      name: 'country',
      label: '나라',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: '아티스트 나라 두 글자 코드 (KR 한국, JP 일본, US 미국, GB 영국, TW 대만…). 비워 두면 자동으로 찾아요.',
      },
      hooks: { beforeChange: [({ value }) => (typeof value === 'string' && value.trim() ? value.trim().toUpperCase().slice(0, 2) : value || null)] },
    },
    // 자동 채우기를 한 번 해 봤는지 (못 찾았으면 한동안 다시 안 찾아요)
    { name: 'typeCheckedAt', type: 'date', admin: { hidden: true } },
    { name: 'countryCheckedAt', type: 'date', admin: { hidden: true } },
    // 일본어 이름을 영어 이름으로 바꿔 봤는지
    { name: 'enCheckedAt', type: 'date', admin: { hidden: true } },
  ],
}
