import Link from 'next/link'
import { getSettings } from '@/lib/data'
import { Icon } from './ui'
import { MobileMenu } from './MobileMenu'
import { NavLink } from './NavLink'

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Muscat Magazine 홈">
      <span className="logo__dot" />
      <span className="logo__sans">Muscat</span>
      <span className="logo__serif">Magazine</span>
    </Link>
  )
}

export const NAV = [
  { href: '/articles', label: 'Articles' },
  // 곡·앨범·Essential·플레이리스트·내 플리는 Editor's Picks 안에 묶음
  { href: '/picks', label: "Editor's Picks", also: ['/essential', '/playlists', '/my', '/share'] },
  // 장르 지도·거미줄·아무거나 틀어줘·취향 찾기는 Explore 안에 묶음
  { href: '/explore', label: 'Explore', also: ['/web', '/taste'] },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export async function Header() {
  const settings = await getSettings()
  return (
    <header className="header">
      <div className="header__inner">
        <div className="header__left">
          <Logo />
        </div>
        <nav className="header__nav" aria-label="주 메뉴">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} also={n.also}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="header__right">
          <Link href="/search" className="header__link">
            <Icon name="search" />
            <span>Search</span>
          </Link>
          {settings.instagramUrl ? (
            <a className="header__link header__link--ink" href={settings.instagramUrl} target="_blank" rel="noreferrer">
              <span>Instagram</span>
              <Icon name="upright" />
            </a>
          ) : null}
        </div>
        <div className="header__mobile">
          <Link href="/search" className="icon-btn" aria-label="검색">
            <Icon name="search" size={22} />
          </Link>
          <MobileMenu instagramUrl={settings.instagramUrl || undefined} />
        </div>
      </div>
    </header>
  )
}
