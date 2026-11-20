import { findAlbumPicks } from '@/lib/data'
import { OG_SIZE, ogCard } from '@/lib/ogCard'
import type { Pick } from '@/payload-types'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = 'Muscat Magazine 앨범'

export default async function Image({ params }: { params: Promise<{ key: string }> }) {
  const docs = ((await findAlbumPicks((await params).key)) as Pick[] | null) || []
  const first = docs[0]
  const g = new Map<string, number>()
  for (const d of docs) for (const x of d.genres || []) if (typeof x === 'object' && x?.name) g.set(x.name, (g.get(x.name) || 0) + 1)
  const artist = first?.artistName.split(', ')[0]
  return ogCard({
    kicker: 'ALBUM',
    title: docs.find((d) => d.album)?.album || first?.track || 'Album',
    sub: artist ? `${artist} · ${docs.length}곡 담음` : null,
    chips: [...g.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n),
    covers: [first?.coverUrl],
  })
}
