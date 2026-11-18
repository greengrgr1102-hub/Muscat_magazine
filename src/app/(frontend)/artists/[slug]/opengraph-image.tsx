import { asGenres, asMedia, getArtist } from '@/lib/data'
import { OG_SIZE, shareCard } from '@/lib/og'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = 'Muscat Magazine'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const a = await getArtist(decodeURIComponent(slug))
  if (!a) return shareCard({ label: 'Artist', title: '머스캣 매거진' })
  const sub = a.noteHeadline || asGenres(a.genres).map((g) => g.name).join(' · ')
  return shareCard({ label: 'Artist', title: a.name, sub, photo: asMedia(a.photo) })
}
