import Link from 'next/link'
import { ArrowLink, CardGrid, Img, Lines, SectionHeader, articleHref } from '@/components/ui'
import { TYPE_LABEL, findArticles, formatDate, getSettings } from '@/lib/data'

export default async function HomePage() {
  const [settings, featuredRes, latestRes] = await Promise.all([
    getSettings(),
    findArticles({ where: { featured: { equals: true } }, limit: 1 }),
    findArticles({ limit: 4 }),
  ])
  const featured = featuredRes.docs[0] ?? latestRes.docs[0]
  const latest = latestRes.docs.filter((a) => a.id !== featured?.id).slice(0, 3)

  return (
    <>
      <section className="hero wrap">
        <h1 className="hero__title">
          <span className="display">{settings.heroLine1}</span>
          <span className="display-serif">{settings.heroLine2}</span>
        </h1>
        {settings.heroIntro ? (
          <p className="hero__intro body-lg muted">
            <Lines text={settings.heroIntro} />
          </p>
        ) : null}
      </section>

      {featured ? (
        <section className="wrap section">
          <Link href={articleHref(featured)} className="featured">
            <Img media={featured.cover} label="Featured image" ratio="16 / 9" tone="tint" sizes="100vw" priority />
            <div className="featured__info">
              <p className="label">
                {TYPE_LABEL[featured.type]} · {formatDate(featured.publishedAt)}
              </p>
              <h2 className="h-lg">{featured.title}</h2>
            </div>
          </Link>
        </section>
      ) : null}

      {latest.length ? (
        <section className="wrap section">
          <SectionHeader title="Latest" right={<ArrowLink href="/articles">전체 보기</ArrowLink>} />
          <CardGrid articles={latest} />
        </section>
      ) : null}
    </>
  )
}
