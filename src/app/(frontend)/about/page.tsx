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

      {about.image ? (
        <section className="wrap section">
          <Img media={about.image} ratio="21 / 10" label="Image" sizes="100vw" />
        </section>
      ) : null}

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
          <SectionHeader
            title="What we do"
            right={<span className="muted">네 가지 방식으로 음악을 전합니다</span>}
          />
          <ul className="index-list">
            {about.coverage.map((c, i) => (
              <li key={c.id || i}>
                <Link
                  href={c.type ? `/articles?type=${c.type}` : '/articles'}
                  className="index-row"
                >
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
          <SectionHeader
            title="Principles"
            right={<span className="muted">머스캣이 지키는 원칙</span>}
          />
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

      {about.editors?.length ? (
        <section className="wrap section">
          <SectionHeader
            title="Editors"
            right={<span className="muted">머스캣을 만드는 사람</span>}
          />
          <div
            className={`editors${about.editors.length === 1 && about.editors[0].photo ? ' editors--one' : ''}`}
          >
            {about.editors.map((e, i) => (
              <article key={e.id || i} className="editor">
                {e.photo ? (
                  <Img
                    media={e.photo}
                    ratio="4 / 5"
                    label="Editor"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : null}
                <div className="editor__body">
                  <p className="label">{e.role || 'Editor'}</p>
                  <h3 className="h-lg">{e.name}</h3>
                  {e.bio ? (
                    <p className="editor__bio">
                      <Lines text={e.bio} />
                    </p>
                  ) : null}
                  {e.listening ? (
                    <p className="small editor__listening">
                      <span className="label">요즘 듣는 것</span> {e.listening}
                    </p>
                  ) : null}
                  <div className="editor__links">
                    <Link href="/picks" className="arrow-link">
                      <span>에디터가 들은 곡</span>
                      <Icon name="right" />
                    </Link>
                    <Link href="/playlists" className="arrow-link">
                      <span>에디터 플리</span>
                      <Icon name="right" />
                    </Link>
                    {(e.links || []).map((l, j) => (
                      <a
                        key={l.id || j}
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="arrow-link"
                      >
                        <span>{l.label}</span>
                        <Icon name="upright" />
                      </a>
                    ))}
                  </div>
                </div>
              </article>
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
