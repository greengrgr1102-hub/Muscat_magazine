import { asGenres, getPick } from '@/lib/data'
import { OG_SIZE, ogCard } from '@/lib/ogCard'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = "Muscat Magazine Editor's Pick"

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const pick = await getPick((await params).id)
  return ogCard({
    kicker: "EDITOR'S PICK",
    title: pick?.track || 'Untitled',
    sub: pick ? [pick.artistName, pick.album].filter(Boolean).join(' · ') : null,
    chips: pick ? asGenres(pick.genres).map((g) => g.name) : [],
    covers: [pick?.coverUrl],
  })
}
