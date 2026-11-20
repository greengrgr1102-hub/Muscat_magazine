'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useMyPlaylist } from '@/lib/myPlaylist'

// 헤더 오른쪽의 My 아이콘 — 좋아요한 곡이 있으면 작은 녹색 점
export function MyLink({ mobile = false }: { mobile?: boolean }) {
  const { songs } = useMyPlaylist()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dot = mounted && songs.length > 0
  return (
    <Link
      href="/my"
      className={mobile ? 'icon-btn my-link' : 'header__link my-link'}
      aria-label="My — 좋아요한 곡·최근 들은 곡"
    >
      <svg
        width={mobile ? 22 : 16}
        height={mobile ? 22 : 16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <circle cx="12" cy="8.5" r="3.8" />
        <path d="M4.5 20c1.3-3.6 4.2-5.5 7.5-5.5s6.2 1.9 7.5 5.5" />
      </svg>
      {mobile ? null : <span>My</span>}
      {dot ? <span className="my-link__dot" aria-hidden="true" /> : null}
    </Link>
  )
}
