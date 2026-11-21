import type { Metadata } from 'next'
import Link from 'next/link'
import { ExploreTabs } from '@/components/ExploreTabs'
import { exploreSeeds } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Explore',
  description:
    '장르 지도, 거미줄, 아무거나 틀어줘, 취향 찾기 — 에디터가 들은 수천 곡 사이를 헤매 보세요.',
}
export const dynamic = 'force-dynamic'

const small = (u?: string | null) => (u ? u.replace('ab67616d0000b273', 'ab67616d00001e02') : null)

// 탐험 첫 화면: 음악을 찾아다니는 방법들을 한곳에
export default async function ExplorePage() {
  const seeds = await exploreSeeds()
  const cards = [
    {
      href: '/explore/genres',
      kicker: 'Genre Map',
      title: '장르 지도',
      desc: '함께 자주 붙는 장르끼리 이어져 있어요. 장르를 누르면 대표곡이 나오고, 거기서 또 옆 장르로 건너가요.',
    },
    {
      href: '/explore/shuffle',
      kicker: 'Shuffle',
      title: '아무거나 틀어줘',
      desc: '장르나 나라, 시대만 고르면 아직 안 들어본 곡을 하나씩 틀어 드려요.',
    },
    {
      href: '/taste',
      kicker: 'Taste Finder',
      title: '취향 찾기',
      desc: '질문 네 개에 답하고 몇 곡만 들어 보면, 내 취향에 맞는 곡을 골라 드려요.',
    },
    {
      href: '/explore/festivals',
      kicker: 'Festivals',
      title: '페스티벌',
      desc: '올해 페스티벌 무대에 선 팀들. 에디터가 들은 아티스트는 바로 들어볼 수 있어요.',
    },
  ]
  return (
    <>
      <section className="page-title wrap">
        <p className="label">Explore</p>
        <h1 className="page-title__h">
          <span className="display-lg">탐험</span>
        </h1>
        <p className="muted page-title__desc">에디터가 들은 수천 곡 사이를 이리저리 헤매 보세요.</p>
      </section>
      <ExploreTabs />
      <section className="wrap section">
        <ul className="explore-cards">
          {cards.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className="explore-card">
                <p className="label">{c.kicker}</p>
                <h2 className="h-md">{c.title}</h2>
                <p className="muted">{c.desc}</p>
                <span className="arrow-link">
                  <span>시작하기</span>
                </span>
              </Link>
            </li>
          ))}
          <li>
            <div className="explore-card">
              <p className="label">Web</p>
              <h2 className="h-md">거미줄</h2>
              <p className="muted">
                곡이나 앨범 하나에서 비슷한 음악이 거미줄처럼 펼쳐져요. 오늘의 출발점에서 시작해
                보세요.
              </p>
              <div className="explore-seeds">
                {seeds.song ? (
                  <Link href={`/web/${seeds.song.id}`} className="explore-seed">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {seeds.song.cover ? <img src={small(seeds.song.cover)!} alt="" /> : null}
                    <span>
                      <strong>곡에서 시작</strong>
                      <span className="muted">
                        {seeds.song.track} — {seeds.song.artist}
                      </span>
                    </span>
                  </Link>
                ) : null}
                {seeds.album ? (
                  <Link href={`/web/album/${seeds.album.key}`} className="explore-seed">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {seeds.album.cover ? <img src={small(seeds.album.cover)!} alt="" /> : null}
                    <span>
                      <strong>앨범에서 시작</strong>
                      <span className="muted">
                        {seeds.album.album || '앨범'} — {seeds.album.artist}
                      </span>
                    </span>
                  </Link>
                ) : null}
              </div>
              <p className="small muted">곡·앨범 페이지의 거미줄 버튼으로도 시작할 수 있어요.</p>
            </div>
          </li>
        </ul>
      </section>
    </>
  )
}
