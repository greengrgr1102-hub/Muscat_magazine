import { getPick } from '@/lib/data'
import { OG_SIZE, shareCard } from '@/lib/og'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = "Muscat Magazine Editor's Pick"

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const pick = await getPick((await params).id)
  if (!pick) return shareCard({ label: "Editor's Pick", title: '머스캣 매거진' })
  return shareCard({
    label: "Editor's Pick",
    title: pick.track || 'Untitled',
    sub: pick.comment ? `${pick.artistName} — ${pick.comment}` : pick.artistName,
    photo: pick.coverUrl ? { url: pick.coverUrl } : null,
  })
}
