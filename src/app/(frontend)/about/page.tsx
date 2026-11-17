import type { Metadata } from 'next'
import Link from 'next/link'
import { Button, Icon, Img, Lines, SectionHeader } from '@/components/ui'
import { getAbout } from '@/lib/data'

export const metadata: Metadata = { title: 'About' }

export default async function AboutPage() {
  const about = await getAbout()
  return (
    <>
      <section className="wrap about-intro">
        <p className="label">About</p>
        <h1 className="h-xl">
          <Lines text={about.statement} />
        </h1>
      </section>

      <section className="wrap section">
        <Img media={about.image} ratio="21 / 10" label="Image" sizes="100vw" />
      </section>

      {about.approach?.length ? (
        <section className="wrap section grid12 approach">
          <div className="col-4 stack-16">
            <p className="label">Approach</p>
            <h2 className="h-lg">{about.approachTitle}</h2>
          </div>
          <div className="col-7 col-start-6 approach__cols">
            {about.approach.map((p, i) => (
              <p key={p.id || i} className="body-lg">
                {p.text}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      {about.coverage?.length ? (
        <section className="wrap section">
          <SectionHeader title="What we do" right={<span className="muted">네 가지 방식으로 음악을 전합니다</span>} />
          <ul className="index-list">
            {about.coverage.map((c, i) => (
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

      {about.principles?.length ? (
        <section className="wrap section">
          <SectionHeader title="Principles" right={<span className="muted">머스캣이 지키는 원칙</span>} />
          <div className="principles">
            {about.principles.map((p, i) => (
              <div key={p.id || i} className="principle">
                <p className="label">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="h-md">
                  <Lines text={p.title} />
                </h3>
                <p className="muted">
                  <Lines text={p.description} />
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="wrap about-cta">
        <div className="stack-16">
          <p className="label">Contact</p>
          <p className="h-xl">함께 이야기 나눠요.</p>
        </div>
        <Button href="/contact">문의하기</Button>
      </section>
    </>
  )
}
