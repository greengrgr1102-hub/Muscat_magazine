'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function NavLink({ href, also = [], children }: { href: string; also?: string[]; children: ReactNode }) {
  const pathname = usePathname()
  const active = [href, ...also].some((h) => pathname === h || pathname.startsWith(h + '/'))
  return (
    <Link href={href} className={`nav-link${active ? ' nav-link--active' : ''}`} aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  )
}
