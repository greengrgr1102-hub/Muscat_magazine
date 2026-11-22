import Link from 'next/link'
import { getSettings } from '@/lib/data'
import { Icon, Lines } from './ui'
import { NewsletterForm } from './Forms'

export async function Footer() {
  const s = await getSettings()
  const social = [
    { label: 'Instagram', href: s.instagramUrl },
    { label: 'YouTube', href: s.youtubeUrl },
    { label: 'Blog', href: s.blogUrl },
  ].filter((x) => x.href)
  return (
    <footer className="footer">
      <div className="footer__top">
        <div className="footer__cta">
          <p className="h-lg">
            <Lines text={s.footerLine} />
          </p>
          <NewsletterForm />
        </div>
        <div className="footer__cols">
          <div className="footer__col">
            <p className="label">Sitemap</p>
            <Link href="/articles">Articles</Link>
            <Link href="/picks">Editor&apos;s Picks</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/updates">Updates</Link>
          </div>
          {social.length ? (
            <div className="footer__col">
              <p className="label">Social</p>
              {social.map((x) => (
                <a key={x.label} href={x.href!} target="_blank" rel="noreferrer">
                  {x.label}
                </a>
              ))}
            </div>
          ) : null}
          <div className="footer__col">
            <p className="label">Contact</p>
            {s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : null}
          </div>
        </div>
      </div>
      <p className="footer__wordmark" aria-hidden="true">
        <span className="footer__wm-sans">Muscat</span>{' '}
        <span className="footer__wm-serif">Magazine</span>
      </p>
      {s.businessInfo ? (
        <p className="footer__legal">
          <Lines text={s.businessInfo} />
        </p>
      ) : null}
      <div className="footer__bottom">
        <p>© {new Date().getFullYear()} Muscat Magazine</p>
        <a href="#top" className="arrow-link">
          <span>Top</span>
          <Icon name="up" />
        </a>
      </div>
    </footer>
  )
}
