import type { Article, Artist, Genre, Media } from '@/payload-types'

export const TYPE_LABEL: Record<Article['type'], string> = {
  review: 'Album Review',
  interview: 'Interview',
  playlist: 'Curation',
  release: 'Release',
}

export const TYPE_ORDER: Article['type'][] = ['review', 'playlist', 'interview', 'release']

export const LISTEN_LABEL: Record<string, string> = {
  melon: 'Melon',
  spotify: 'Spotify',
  youtube: 'YouTube',
  apple: 'Apple Music',
  bandcamp: 'Bandcamp',
  soundcloud: 'SoundCloud',
  instagram: 'Instagram',
  other: 'Link',
}

export function formatDate(value?: string | null, short = false): string {
  if (!value) return ''
  const d = new Date(value)
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return short ? `${get('month')}.${get('day')}` : `${get('year')}.${get('month')}.${get('day')}`
}

export const asMedia = (m: unknown): Media | null =>
  m && typeof m === 'object' && 'url' in (m as Media) ? (m as Media) : null
export const asArtists = (list: unknown): Artist[] =>
  Array.isArray(list) ? (list.filter((a) => a && typeof a === 'object') as Artist[]) : []
export const asGenres = (list: unknown): Genre[] =>
  Array.isArray(list) ? (list.filter((g) => g && typeof g === 'object') as Genre[]) : []

