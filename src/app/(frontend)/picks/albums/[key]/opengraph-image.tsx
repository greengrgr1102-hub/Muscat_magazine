import { findAlbumPicks } from '@/lib/data'
import { OG_SIZE, shareCard } from '@/lib/og'
import type { Pick } from '@/payload-types'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = 'Muscat Magazine 앨범'

export default async function Image({ params }: { params: Promise<{ key: string }> }) {
  const docs = ((await findAlbumPicks((await params).key)) as Pick[] | null) || []
  const first = docs[0]
  if (!first) return shareCard({ label: 'Album', title: '머스캣 매거진' })
  const g = new Map<string, number>()
  for (const d of docs) for (const x of d.genres || []) if (typeof x === 'object' && x?.name) g.set(x.name, (g.get(x.name) || 0) + 1)
  const genres = [...g.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n)
  return shareCard({
    label: 'Album',
    title: docs.find((d) => d.album)?.album || first.track || 'Album',
    sub: [first.artistName.split(', ')[0], genres.join(' · ')].filter(Boolean).join(' — '),
    photo: first.coverUrl ? { url: first.coverUrl.replace('ab67616d00004851', 'ab67616d0000b273') } : null,
  })
}
