'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Editor's Picks 아래 묶인 페이지들 사이를 오가는 작은 탭
const TABS = [
  { href: '/picks', label: '곡' },
  { href: '/picks/albums', label: '앨범' },
  { href: '/essential', label: 'Essential' },
  { href: '/playlists', label: '플레이리스트' },
  { href: '/my', label: '좋아요한 곡' },
]

function isOn(pathname: string, href: string) {
  // 「곡」은 /picks와 곡 상세(/picks/123)만, 앨범 페이지는 「앨범」으로
  if (href === '/picks') return pathname === '/picks' || /^\/picks\/\d+/.test(pathname)
  return pathname === href || pathname.startsWith(href + '/')
}

export function ListenTabs() {
  const pathname = usePathname()
  return (
    <div className="wrap listen-tabs-wrap">
      <nav className="listen-tabs" aria-label="Editor's Picks 메뉴">
        {TABS.map((t) => {
          const on = isOn(pathname, t.href)
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
