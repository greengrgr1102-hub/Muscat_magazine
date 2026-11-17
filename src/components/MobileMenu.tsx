'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Icon } from './ui'

const ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/articles', label: 'Articles' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export function MobileMenu({ instagramUrl }: { instagramUrl?: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button className="icon-btn" aria-label="메뉴 열기" aria-expanded={open} onClick={() => setOpen(true)}>
        <Icon name="menu" size={22} />
      </button>
      {open ? (
        <div className="mmenu" role="dialog" aria-modal="true" aria-label="메뉴">
          <div className="mmenu__top">
            <Link href="/" className="logo" onClick={() => setOpen(false)}>
              <span className="logo__dot" />
              <span className="logo__sans">Muscat</span>
              <span className="logo__serif">Magazine</span>
            </Link>
            <button className="icon-btn" aria-label="메뉴 닫기" onClick={() => setOpen(false)}>
              <Icon name="close" size={22} />
            </button>
          </div>
          <nav className="mmenu__nav">
            {ITEMS.map((it, i) => (
              <Link key={it.href} href={it.href} className="mmenu__item" onClick={() => setOpen(false)}>
                <span className="mmenu__label">
                  <span className="label">{String(i + 1).padStart(2, '0')}</span>
                  <span className="mmenu__title">{it.label}</span>
                </span>
                <Icon name="right" size={22} />
              </Link>
            ))}
          </nav>
          <div className="mmenu__bottom">
            <form
              className="mmenu__search"
              onSubmit={(e) => {
                e.preventDefault()
                const q = new FormData(e.currentTarget).get('q')?.toString() || ''
                router.push(`/search?q=${encodeURIComponent(q)}`)
                setOpen(false)
              }}
            >
              <input name="q" placeholder="아티스트·장르 검색" aria-label="검색어" />
              <button type="submit" aria-label="검색">
                <Icon name="search" size={20} />
              </button>
            </form>
            {instagramUrl ? (
              <a className="arrow-link" href={instagramUrl} target="_blank" rel="noreferrer">
                <span>Instagram</span>
                <Icon name="upright" />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
