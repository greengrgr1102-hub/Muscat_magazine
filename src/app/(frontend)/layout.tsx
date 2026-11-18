import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import '@fontsource/instrument-serif/400-italic.css'
import './styles.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Analytics } from '@vercel/analytics/next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SERVER_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : 'http://localhost:3000'),
  ),
  title: { default: 'Muscat Magazine', template: '%s — Muscat Magazine' },
  description: '에디터의 귀로 고른 음악을 소개하는 인디 음악 매거진. 앨범 리뷰, 큐레이션, 인터뷰, 발매 소식.',
  openGraph: { siteName: 'Muscat Magazine', type: 'website', locale: 'ko_KR' },
  // 탭 아이콘 — 관리자 화면과 같은 파일(public/favicon.png)을 씁니다.
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = { themeColor: '#FAFAFA' }

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
        <Analytics />
      </body>
    </html>
  )
}
