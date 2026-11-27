import type { Metadata } from 'next'
import { ExploreTabs } from '@/components/ExploreTabs'
import { Wordle } from './Wordle'

export const metadata: Metadata = {
  title: '인디 워들',
  description:
    '하루에 한 장. 앨범 이름을 넣으면 정답 앨범과 발매 연도·나라·형태·장르를 비교해 줘요. 10번 안에 맞혀 보세요.',
  alternates: { canonical: '/explore/wordle' },
}

export default function WordlePage() {
  return (
    <>
      <section className="page-title wrap wd-title">
        <p className="label">Indie Wordle</p>
        <h1 className="page-title__h">
          <span className="display-lg">인디 워들</span>
        </h1>
        <p className="muted page-title__desc">
          하루에 한 장. 앨범 이름을 넣으면 정답과 항목별로 비교해 줘요.
          <br />
          10번 안에 맞혀 보세요.
        </p>
      </section>
      <ExploreTabs />
      <Wordle />
    </>
  )
}
