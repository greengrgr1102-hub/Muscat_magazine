import Link from 'next/link'
import { ArrowLink, Button, CardGrid, Icon, Img, Lines, SectionHeader, articleHref } from '@/components/ui'
import { TYPE_LABEL, findArticles, formatDate, getAbout, getSettings } from '@/lib/data'

export default async function HomePage() {
  const [settings, about, featuredRes, latestRes] = await Promise.all([
    getSettings(),
    getAbout(),
    findArticles({ where: { featured: { equals: true } }, limit: 1 }),
    findArticles({ limit: 4 }),
  ])
  const featured = featuredRes.docs[0] ?? latestRes.docs[0]
  const latest = latestRes.docs.filter((a) => a.id !== featured?.id).slice(0, 3)
  const coverage = about.coverage || []

  return (
    <>
      <section className="hero wrap">
        <div className="hero__meta">
          <span className="label">Independent Music Magazine</span>
          <span className="label hide-mobile">Review — Curation — Interview — Release</span>
        </div>
        <h1 className="hero__title">
          <span className="display">{settings.heroLine1}</span>
          <span className="display-serif">{settings.heroLine2}</span>
        </h1>
        <div className="hero__bottom">
          <span className="arrow-link hide-mobile" aria-hidden="true">
            <Icon name="down" />
            <span>Scroll</span>
          </span>
          <div className="hero__intro">
            <p className="body-lg">
              <Lines text={settings.heroIntro} />
            </p>
            <Button href="/articles">아티클 보기</Button>
          </div>
        </div>
      </section>

      {featured ? (
        <section className="wrap section">
          <Link href={articleHref(featured)} className="featured">
            <Img media={featured.cover} label="Featured image" ratio="16 / 9" tone="tint" sizes="100vw" priority />
            <div className="featured__info grid12">
              <div className="col-3">
                <p className="label label--ink">Featured</p>
                <p className="label">
                  {TYPE_LABEL[featured.type]} · {formatDate(featured.publishedAt)}
                </p>
              </div>
              <div className="col-6 stack-16">
                <h2 className="h-lg">{featured.title}</h2>
                {featured.excerpt ? <p className="muted">{featured.excerpt}</p> : null}
              </div>
              <div className="col-3 featured__action">
                <span className="btn btn--outline">
                  <span>읽기</span>
                  <Icon name="right" />
                </span>
              </div>
            </div>
          </Link>
        </section>
      ) : null}

      <section className="wrap section">
        <SectionHeader title="Latest" right={<ArrowLink href="/articles">전체 보기</ArrowLink>} />
        <CardGrid articles={latest} />
      </section>

      {coverage.length ? (
        <section className="wrap section">
          <SectionHeader title="What we cover" right={<span className="muted">머스캣 매거진이 다루는 네 가지</span>} />
          <ul className="index-list">
            {coverage.map((c, i) => (
              <li key={c.id || i}>
                <Link href={c.type ? `/articles?type=${c.type}` : '/articles'} className="index-row">
                  <span className="label">{String(i + 1).padStart(2, '0')}</span>
                  <span className="h-md index-row__title">{c.title}</span>
                  <span className="muted index-row__desc">{c.description}</span>
                  <Icon name="right" size={24} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="cta wrap">
        <p className="label">Follow</p>
        <p className="h-xl">
          <Lines text={settings.ctaText} />
        </p>
        {settings.instagramUrl ? (
          <Button href={settings.instagramUrl} external>
            Instagram 팔로우하기
          </Button>
        ) : null}
      </section>
    </>
  )
}
