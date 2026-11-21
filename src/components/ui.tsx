import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Article, Media as MediaType } from '@/payload-types'
import { LISTEN_LABEL, TYPE_LABEL, asMedia, formatDate } from '@/lib/format'

/* ---------- Icons (피그마와 같은 1.5px 선 아이콘) ---------- */
const paths = {
  right: 'M5 12h14M13 6l6 6-6 6',
  left: 'M19 12H5M11 6l-6 6 6 6',
  upright: 'M7 17L17 7M8 7h9v9',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 9h16M4 15h16',
  plus: 'M12 6v12M6 12h12',
}
export type IconName = keyof typeof paths | 'search'

export function Icon({
  name,
  size = 16,
  className,
}: {
  name: IconName
  size?: number
  className?: string
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      {name === 'search' ? (
        <>
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </>
      ) : (
        <path d={paths[name]} />
      )}
    </svg>
  )
}

/* ---------- Image ---------- */
export function Img({
  media,
  label,
  ratio = '4 / 5',
  tone = 'surface',
  sizes = '(max-width: 768px) 100vw, 33vw',
  className = '',
  priority = false,
}: {
  media?: MediaType | number | null
  label?: string
  ratio?: string
  tone?: 'surface' | 'tint' | 'dark'
  sizes?: string
  className?: string
  priority?: boolean
}) {
  const m = asMedia(media)
  const style = { aspectRatio: ratio }
  if (!m?.url) {
    return (
      <div className={`img img--empty img--${tone} ${className}`} style={style}>
        {label ? <span className="img__label">{label}</span> : null}
      </div>
    )
  }
  const s = m.sizes || {}
  const srcSet = [s.card, s.large, s.wide]
    .filter((x) => x?.url && x?.width)
    .map((x) => `${x!.url} ${x!.width}w`)
    .join(', ')
  const pos =
    typeof m.focalX === 'number' && typeof m.focalY === 'number'
      ? `${m.focalX}% ${m.focalY}%`
      : 'center'
  return (
    <div className={`img ${className}`} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={m.url}
        srcSet={srcSet || undefined}
        sizes={srcSet ? sizes : undefined}
        alt={m.alt || ''}
        loading={priority ? 'eager' : 'lazy'}
        style={{ objectPosition: pos }}
      />
    </div>
  )
}

/* ---------- Buttons / links ---------- */
export function Button({
  href,
  children,
  variant = 'filled',
  icon = 'right',
  external,
  full,
  type,
}: {
  href?: string
  children: ReactNode
  variant?: 'filled' | 'outline'
  icon?: IconName | null
  external?: boolean
  full?: boolean
  type?: 'submit' | 'button'
}) {
  const cls = `btn btn--${variant}${full ? ' btn--full' : ''}`
  const inner = (
    <>
      <span>{children}</span>
      {icon ? <Icon name={external ? 'upright' : icon} /> : null}
    </>
  )
  if (!href)
    return (
      <button className={cls} type={type || 'button'}>
        {inner}
      </button>
    )
  return external ? (
    <a className={cls} href={href} target="_blank" rel="noreferrer">
      {inner}
    </a>
  ) : (
    <Link className={cls} href={href}>
      {inner}
    </Link>
  )
}

export function ArrowLink({
  href,
  children,
  icon = 'right',
  back,
  external,
}: {
  href: string
  children: ReactNode
  icon?: IconName
  back?: boolean
  external?: boolean
}) {
  const content = back ? (
    <>
      <Icon name="left" />
      <span>{children}</span>
    </>
  ) : (
    <>
      <span>{children}</span>
      <Icon name={external ? 'upright' : icon} />
    </>
  )
  return external ? (
    <a className="arrow-link" href={href} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <Link className="arrow-link" href={href}>
      {content}
    </Link>
  )
}

export function Chip({
  href,
  children,
  active,
}: {
  href?: string
  children: ReactNode
  active?: boolean
}) {
  const cls = `chip${active ? ' chip--active' : ''}`
  return href ? (
    <Link className={cls} href={href} aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  )
}

export function ListenLinks({
  links,
  label,
  large,
}: {
  links?: { service: string; url: string; id?: string | null }[] | null
  label?: string
  large?: boolean
}) {
  if (!links?.length) return null
  return (
    <div className="listen">
      {label ? <p className="label">{label}</p> : null}
      <div className="chips">
        {links.map((l, i) => (
          <a
            key={l.id || i}
            className={large ? 'btn btn--outline' : 'chip chip--link'}
            href={l.url}
            target="_blank"
            rel="noreferrer"
          >
            <span>{LISTEN_LABEL[l.service] || l.service}</span>
            <Icon name="upright" size={large ? 16 : 14} />
          </a>
        ))}
      </div>
    </div>
  )
}

/* ---------- Section header ---------- */
export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="section-header">
      <h2 className="h-lg">{title}</h2>
      {right ? <div className="section-header__right">{right}</div> : null}
    </div>
  )
}

/* ---------- Article card ---------- */
const TONES: ('surface' | 'tint' | 'dark')[] = ['surface', 'tint', 'surface', 'dark', 'surface']

export function articleHref(a: Pick<Article, 'slug'>) {
  return `/articles/${a.slug}`
}

export function ArticleCard({ article, index = 0 }: { article: Article; index?: number }) {
  return (
    <Link href={articleHref(article)} className="card">
      <Img media={article.cover} label="Image 4:5" tone={TONES[index % TONES.length]} />
      <div className="card__meta">
        <span className="label label--ink">{TYPE_LABEL[article.type]}</span>
        <span className="label">{formatDate(article.publishedAt)}</span>
      </div>
      <h3 className="card__title">{article.title}</h3>
    </Link>
  )
}

export function CardGrid({ articles, empty }: { articles: Article[]; empty?: string }) {
  if (!articles.length) return <p className="empty">{empty || '아직 글이 없습니다.'}</p>
  return (
    <div className="card-grid">
      {articles.map((a, i) => (
        <ArticleCard key={a.id} article={a} index={i} />
      ))}
    </div>
  )
}

/* ---------- Plain multi-line text ---------- */
// mark: 이 글자를 형광펜으로 칠해요 (예: About 첫 문장의 "머스캣 매거진")
export function Lines({ text, mark }: { text?: string | null; mark?: string }) {
  if (!text) return null
  const parts = text.split('\n')
  const paint = (line: string) => {
    if (!mark || !line.includes(mark)) return line
    const bits = line.split(mark)
    return bits.map((b, j) => (
      <span key={j}>
        {b}
        {j < bits.length - 1 ? <mark className="hl">{mark}</mark> : null}
      </span>
    ))
  }
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {paint(p)}
          {i < parts.length - 1 ? (
            <>
              {' '}
              <br />
            </>
          ) : null}
        </span>
      ))}
    </>
  )
}

// 사진 밑에 작게 붙는 설명
export function Caption({ media }: { media?: MediaType | number | null }) {
  const m = asMedia(media)
  const text = (m as { caption?: string | null } | null)?.caption
  return text ? <figcaption className="caption">{text}</figcaption> : null
}
