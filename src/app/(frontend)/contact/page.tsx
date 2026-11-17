import type { Metadata } from 'next'
import { ContactForm } from '@/components/Forms'
import { getSettings } from '@/lib/data'

export const metadata: Metadata = { title: 'Contact' }

export default async function ContactPage() {
  const s = await getSettings()
  const info = [
    s.email && { label: 'Email', value: s.email, note: '일반 문의와 제안', href: `mailto:${s.email}` },
    { label: 'Submission', value: '음원 · 발매 소식 제보', note: '보도자료와 음원 링크를 함께 보내 주세요.' },
    { label: 'Interview', value: '인터뷰 · 협업 제안', note: '아티스트, 레이블, 공연 기획 모두 환영합니다.' },
    s.instagramHandle && {
      label: 'Instagram',
      value: s.instagramHandle,
      note: 'DM으로도 문의할 수 있습니다.',
      href: s.instagramUrl || undefined,
    },
  ].filter(Boolean) as { label: string; value: string; note: string; href?: string }[]

  return (
    <>
      <section className="page-title wrap">
        <h1 className="display-lg">Contact</h1>
        <p className="muted page-title__desc">
          인터뷰 제안, 음원·발매 소식 제보, 협업 문의
          <br />
          모두 환영합니다. 편하게 연락 주세요.
        </p>
      </section>
      <section className="wrap section grid12 contact">
        <dl className="col-5 contact-info">
          {info.map((it) => (
            <div key={it.label}>
              <dt className="label">{it.label}</dt>
              <dd>
                {it.href ? (
                  <a className="h-sm" href={it.href} target={it.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                    {it.value}
                  </a>
                ) : (
                  <span className="h-sm">{it.value}</span>
                )}
                <span className="small muted">{it.note}</span>
              </dd>
            </div>
          ))}
        </dl>
        <div className="col-6 col-start-7">
          <ContactForm />
        </div>
      </section>
    </>
  )
}
