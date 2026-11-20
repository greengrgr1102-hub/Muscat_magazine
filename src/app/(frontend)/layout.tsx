import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import '@fontsource/instrument-serif/400-italic.css'
import './styles.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { SiteAnalytics } from '@/components/SiteAnalytics'
import { PageTracker } from '@/components/Track'
import { PlaylistBar } from '@/components/PlaylistBar'
import { getSettings } from '@/lib/data'

export const dynamic = 'force-dynamic'

const SITE_DESC = '에디터의 귀로 고른 음악을 소개하는 인디 음악 매거진. 앨범 리뷰, 큐레이션, 인터뷰, 발매 소식.'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  // 확인 코드는 앞에 'google-site-verification=' 같은 글자가 붙어 있어도 값만 골라 써요.
  const clean = (v?: string | null) => v?.trim().replace(/^.*verification[=:]\s*/i, '').replace(/["'<>]/g, '') || undefined
  const naver = clean(settings?.naverVerification)
  // 관리자 화면에 값이 없으면 처음 받은 구글 확인 코드를 기본으로 씁니다.
  const google = clean(settings?.googleVerification) || 'ygGKovcB3KBkPdntKycyWAO1V5uEgx6ubl18dyvSHwg'
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SERVER_URL ||
        (process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : 'http://localhost:3000'),
    ),
    title: { default: 'Muscat Magazine — 머스캣 매거진', template: '%s — Muscat Magazine' },
    description: SITE_DESC,
    keywords: ['머스캣 매거진', 'Muscat Magazine', '인디 음악', '음악 매거진', '앨범 리뷰', '인터뷰', '슈게이징'],
    openGraph: {
      siteName: 'Muscat Magazine',
      type: 'website',
      locale: 'ko_KR',
      images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Muscat Magazine' }],
    },
    twitter: { card: 'summary_large_image', images: ['/og.png'] },
    // 탭 아이콘 — 관리자 화면과 같은 파일(public/favicon.png)을 씁니다.
    icons: {
      icon: [{ url: '/favicon.png', type: 'image/png', sizes: '512x512' }],
      apple: '/apple-icon.png',
    },
    verification: {
      google,
      other: naver ? { 'naver-site-verification': naver } : undefined,
    },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAFA' },
    { media: '(prefers-color-scheme: dark)', color: '#121211' },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body id="top">
        <a href="#main" className="skip">
          본문으로 건너뛰기
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <PlaylistBar />
        <SiteAnalytics />
        <PageTracker />
      </body>
    </html>
  )
}
