'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AddAllButton, AddButton, PlayAllButton } from '@/components/AddButton'
import { PickList } from '@/components/PickList'
import { SongPlayer } from '@/components/SongPlayer'
import { myPlaylist } from '@/lib/myPlaylist'
import { loadTaste, saveTaste, type Taste, type TasteSong } from '@/lib/taste'

type G = { slug: string; name: string; count: number }
const ROUND = 10

export function TasteFinder({ genres }: { genres: G[] }) {
  const [step, setStep] = useState<'pick' | 'listen' | 'result'>('pick')
  const [chosen, setChosen] = useState<string[]>([])
  const [songs, setSongs] = useState<TasteSong[]>([])
  const [i, setI] = useState(0)
  const [liked, setLiked] = useState<TasteSong[]>([])
  const [seen, setSeen] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [taste, setTaste] = useState<Taste | null>(null)

  // 예전에 찾은 취향이 있으면 결과부터 보여줘요.
  useEffect(() => {
    const t = loadTaste()
    if (t) {
      setTaste(t)
      setStep('result')
    }
  }, [])

  async function start(more = false) {
    setLoading(true)
    myPlaylist.stop()
    const q = new URLSearchParams({ step: 'sample', g: chosen.join(','), not: (more ? seen : []).join(',') })
    const r = await fetch(`/taste/data?${q}`).then((x) => x.json())
    setSongs(r.songs || [])
    setI(0)
    if (!more) setLiked([])
    setStep('listen')
    setLoading(false)
  }

  async function finish(likedNow: TasteSong[]) {
    setLoading(true)
    const q = new URLSearchParams({ step: 'result', liked: likedNow.map((s) => s.id).join(','), g: chosen.join(',') })
    const r = await fetch(`/taste/data?${q}`).then((x) => x.json())
    const t: Taste = { genres: r.genres || [], era: r.era || null, liked: r.liked || [], recs: r.recs || [], at: Date.now() }
    saveTaste(t)
    setTaste(t)
    setStep('result')
    setLoading(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function answer(like: boolean) {
    const s = songs[i]
    if (!s) return
    const nextLiked = like ? [...liked, s] : liked
    setLiked(nextLiked)
    setSeen((x) => [...x, s.id])
    if (i + 1 < songs.length) setI(i + 1)
    else if (nextLiked.length) finish(nextLiked)
    else setI(songs.length) // 하나도 고르지 않았을 때 안내
  }

  /* ---------- 1. 장르 고르기 ---------- */
  if (step === 'pick') {
    return (
      <section className="wrap taste">
        <p className="label">Find your taste · 1/3</p>
        <h1 className="display-md taste__h">어떤 소리에 끌리세요?</h1>
        <p className="muted taste__lead">마음 가는 장르를 3개까지 골라 주세요. 잘 모르겠으면 그냥 시작해도 돼요.</p>
        <div className="taste__chips">
          {genres.map((g) => {
            const on = chosen.includes(g.slug)
            return (
              <button
                key={g.slug}
                type="button"
                className={`chip${on ? ' chip--active' : ''}`}
                aria-pressed={on}
                disabled={!on && chosen.length >= 3}
                onClick={() => setChosen((c) => (on ? c.filter((x) => x !== g.slug) : [...c, g.slug]))}
              >
                {g.name}
              </button>
            )
          })}
        </div>
        <div className="my-actions taste__go">
          <button className="btn btn--filled" onClick={() => start()} disabled={loading}>
            <span>{loading ? '곡을 고르는 중…' : chosen.length ? `${chosen.length}개 장르로 10곡 듣기` : '아무 장르나 10곡 듣기'}</span>
          </button>
        </div>
      </section>
    )
  }

  /* ---------- 2. 10곡 듣고 고르기 ---------- */
  if (step === 'listen') {
    const s = songs[i]
    if (!s) {
      return (
        <section className="wrap taste">
          <p className="label">Find your taste · 2/3</p>
          <h1 className="display-md taste__h">아직 끌리는 곡이 없었어요</h1>
          <p className="muted taste__lead">10곡 더 들어 보거나, 장르를 다시 골라 볼까요?</p>
          <div className="my-actions">
            <button className="btn btn--filled" onClick={() => start(true)} disabled={loading}>
              <span>10곡 더 듣기</span>
            </button>
            <button className="btn btn--outline" onClick={() => setStep('pick')}>
              <span>장르 다시 고르기</span>
            </button>
          </div>
        </section>
      )
    }
    return (
      <section className="wrap taste">
        <p className="label">
          Find your taste · 2/3 · {i + 1} / {songs.length}
        </p>
        <div className="taste__bar" aria-hidden="true">
          <span style={{ width: `${((i + 1) / songs.length) * 100}%` }} />
        </div>
        <div className="taste__card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {s.coverUrl ? <img className="taste__cover" src={s.coverUrl} alt="" /> : <div className="taste__cover" />}
          <div className="taste__info">
            <h1 className="h-xl">{s.track}</h1>
            <p className="muted taste__artist">{s.artistName}</p>
            {s.genres.length ? <p className="small taste__genres">{s.genres.join(' · ')}</p> : null}
            <SongPlayer key={s.id} pickId={s.id} embed={s.embed} title={`${s.track} — ${s.artistName}`} autoPlay />
            <div className="taste__answer">
              <button className="btn btn--filled taste__like" onClick={() => answer(true)}>
                <span>♥ 좋아요</span>
              </button>
              <button className="btn btn--outline" onClick={() => answer(false)}>
                <span>넘기기</span>
              </button>
            </div>
            <p className="small muted">
              좋아요 {liked.length}곡
              {liked.length >= 3 ? (
                <>
                  {' · '}
                  <button className="text-btn" onClick={() => finish(liked)} disabled={loading}>
                    여기까지로 결과 보기
                  </button>
                </>
              ) : null}
            </p>
          </div>
        </div>
        {loading ? <p className="muted">취향을 정리하는 중…</p> : null}
      </section>
    )
  }

  /* ---------- 3. 결과 ---------- */
  if (!taste) return null
  return (
    <>
      <section className="wrap taste">
        <p className="label">Your taste · 3/3</p>
        <h1 className="display-md taste__h">
          {taste.genres.length ? (
            <>
              <em>{taste.genres.slice(0, 3).join(' · ')}</em> 쪽 소리를 좋아하는 편이에요
            </>
          ) : (
            '이런 곡들을 좋아하시네요'
          )}
        </h1>
        <p className="muted taste__lead">
          {taste.era ? `${taste.era} 곡에 특히 끌리는 것 같아요. ` : ''}좋아요 한 {taste.liked.length}곡을 바탕으로, 에디터가 들은 곡 중에서
          비슷한 {taste.recs.length}곡을 골랐어요.
        </p>
        <div className="my-actions">
          <PlayAllButton songs={taste.recs} label="내 취향 추천" />
          <AddAllButton songs={taste.recs} label="추천곡 통째로 담기" />
          <button
            className="text-btn"
            onClick={() => {
              setTaste(null)
              setChosen([])
              setStep('pick')
            }}
          >
            취향 다시 찾기
          </button>
        </div>
      </section>
      <section className="wrap section">
        <h2 className="h-lg taste__sub">내 취향 추천</h2>
        <PickList rows={taste.recs} groupByMonth={false} />
      </section>
      {taste.liked.length ? (
        <section className="wrap section">
          <h2 className="h-lg taste__sub">좋아요 한 곡</h2>
          <div className="taste__liked">
            {taste.liked.map((s) => (
              <div key={s.id} className="taste__liked-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {s.coverUrl ? <img src={s.coverUrl.replace('ab67616d0000b273', 'ab67616d00001e02')} alt="" /> : <span />}
                <Link href={`/picks/${s.id}`} className="plist__track">
                  {s.track}
                </Link>
                <span className="plist__artist">{s.artistName}</span>
                <AddButton song={s} compact />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}
