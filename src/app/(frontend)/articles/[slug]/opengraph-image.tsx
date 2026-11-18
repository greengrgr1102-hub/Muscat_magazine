import { asArtists, asMedia, getArticle } from '@/lib/data'
import { TYPE_LABEL, formatDate } from '@/lib/format'
import { OG_SIZE, shareCard } from '@/lib/og'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = 'Muscat Magazine'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const a = await getArticle(decodeURIComponent(slug))
  if (!a) return shareCard({ label: 'Muscat Magazine', title: '머스캣 매거진' })
  const names = asArtists(a.artists).map((x) => x.name)
  const sub = [names.join(', '), formatDate(a.publishedAt)].filter(Boolean).join(' · ')
  return shareCard({ label: TYPE_LABEL[a.type], title: a.title, sub, photo: asMedia(a.cover) })
}
