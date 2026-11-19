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
  { href: '/essential', label: 'Essential' },
  { href: '/picks', label: "Editor's Picks" },
  { href: '/playlists', label: 'Playlists' },
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
            <NavLink key={n.href} href={n.href}>
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
