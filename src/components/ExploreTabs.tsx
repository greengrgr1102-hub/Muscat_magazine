'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Explore(탐험) 아래 묶인 페이지들 사이를 오가는 작은 탭
const TABS = [
  { href: '/explore', label: '둘러보기' },
  { href: '/explore/genres', label: '장르 지도' },
  { href: '/explore/shuffle', label: '아무거나 틀어줘' },
  { href: '/explore/festivals', label: '페스티벌' },
  { href: '/taste', label: '취향 찾기' },
  { href: '/explore/wordle', label: '인디 워들' },
]

export function ExploreTabs() {
  const pathname = usePathname()
  return (
    <div className="wrap listen-tabs-wrap">
      <nav className="listen-tabs" aria-label="Explore 메뉴">
        {TABS.map((t) => {
          const on =
            t.href === '/explore'
              ? pathname === '/explore'
              : pathname === t.href || pathname.startsWith(t.href + '/')
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`listen-tabs__a${on ? ' is-on' : ''}`}
              aria-current={on ? 'page' : undefined}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
