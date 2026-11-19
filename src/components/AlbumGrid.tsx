import Link from 'next/link'
import type { PickAlbum } from '@/lib/data'

const big = (u: string) => u.replace('ab67616d00004851', 'ab67616d0000b273')
const year = (d: string | null) => (d ? String(d).slice(0, 4) : null)

// Editor's Picks 앨범 카드 묶음
export function AlbumGrid({ albums, empty = '조건에 맞는 앨범이 없어요.' }: { albums: PickAlbum[]; empty?: string }) {
  if (!albums.length) return <p className="muted">{empty}</p>
  return (
    <ul className="palb-grid">
      {albums.map((a) => (
        <li key={a.key}>
          <Link href={`/picks/albums/${a.key}`} className="palb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={big(a.cover)} alt="" loading="lazy" className="palb__cover" />
            <span className="palb__title">{a.album || (a.firstTrack ? `「${a.firstTrack}」 수록 앨범` : '앨범')}</span>
            <span className="palb__artist">{a.artist}</span>
            <span className="palb__meta">{[year(a.release), `${a.n}곡 담음`].filter(Boolean).join(' · ')}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
