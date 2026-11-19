'use client'
import { useState } from 'react'
import { Chip } from '@/components/ui'

// 많이 쓰인 장르부터 한 줄만 보여주고, 「전체」를 누르면 나머지도 펼쳐요.
export function GenreLine({ genres }: { genres: { id: number; name: string; slug: string }[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="genre-line">
      <div className={`chips${open ? ' chips--wrap' : ' genre-line__one'}`}>
        {genres.map((g) => (
          <Chip key={g.id} href={`/genres/${g.slug}`}>
            {g.name}
          </Chip>
        ))}
      </div>
      <button type="button" className="text-btn small genre-line__more" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? '접기' : `전체 ${genres.length}`}
      </button>
    </div>
  )
}
