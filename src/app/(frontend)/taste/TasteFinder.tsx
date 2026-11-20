'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AddAllButton, AddButton, PlayAllButton } from '@/components/AddButton'
import { ExportPlaylist } from '@/components/ExportPlaylist'
import { PickList } from '@/components/PickList'
import { SongPlayer } from '@/components/SongPlayer'
import { myPlaylist } from '@/lib/myPlaylist'
import { loadTaste, saveTaste, type Taste, type TasteSong } from '@/lib/taste'
import { QUIZ, encodeW, scoreAnswers } from '@/lib/tasteQuiz'

export function TasteFinder() {
  const [step, setStep] = useState<'quiz' | 'listen' | 'result'>('quiz')
  // 질문 단계
  const [qi, setQi] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [samples, setSamples] = useState<Record<string, TasteSong>>({})
  const [preview, setPreview] = useState<string | null>(null)
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

  // 질문 보기마다 붙일 샘플 곡
  useEffect(() => {
    if (step !== 'quiz' || Object.keys(samples).length) return
    fetch('/taste/data?step=quiz')
      .then((x) => x.json())
      .then((r) => setSamples(r.samples || {}))
      .catch(() => {})
  }, [step, samples])

  const quizParams = (a = answers) => {
    const { w, era } = scoreAnswers(a)
    return { w: encodeW(w), era }
  }

  async function start(more = false, a = answers) {
    setLoading(true)
    myPlaylist.stop()
    const q = new URLSearchParams({ step: 'sample', ...quizParams(a), not: (more ? seen : []).join(',') })
    const r = await fetch(`/taste/data?${q}`).then((x) => x.json())
    setSongs(r.songs || [])
    setI(0)
    if (!more) setLiked([])
    setStep('listen')
    setLoading(false)
  }

  async function finish(likedNow: TasteSong[]) {
    setLoading(true)
    const q = new URLSearchParams({ step: 'result', liked: likedNow.map((s) => s.id).join(','), ...quizParams() })
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

  /* ---------- 1. 질문 (보기마다 샘플 곡) ---------- */
  if (step === 'quiz') {
    const q = QUIZ[qi]
    const choose = (optionId: string | null) => {
      const next = { ...answers }
      if (optionId) next[q.id] = optionId
      else delete next[q.id]
      setAnswers(next)
      setPreview(null)
      if (qi + 1 < QUIZ.length) setQi(qi + 1)
      else start(false, next)
    }
    const playing = preview ? samples[preview] : null
    return (
      <section className="wrap taste">
        <p className="label">
          Find your taste · 질문 {qi + 1} / {QUIZ.length}
        </p>
        <div className="taste__bar" aria-hidden="true">
          <span style={{ width: `${((qi + 1) / QUIZ.length) * 100}%` }} />
        </div>
        <h1 className="display-md taste__h">{q.title}</h1>
        <p className="muted taste__lead">{q.lead}</p>
        <div className="taste-q">
          {q.options.map((o) => {
            const key = `${q.id}.${o.id}`
            const sample = q.samples ? samples[key] : null
            const on = answers[q.id] === o.id
            return (
              <div key={o.id} className={`taste-q__opt${on ? ' is-on' : ''}${preview === key ? ' is-playing' : ''}`}>
                <button type="button" className="taste-q__pick" onClick={() => choose(o.id)}>
                  <span className="taste-q__label">{o.label}</span>
                  <span className="taste-q__hint">{o.hint}</span>
                </button>
                {sample ? (
                  <button
                    type="button"
                    className="taste-q__sample"
                    onClick={() => {
                      myPlaylist.stop()
                      setPreview(preview === key ? null : key)
                    }}
                    aria-label={`${sample.track} 들어보기`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {sample.coverUrl ? <img src={sample.coverUrl.replace('ab67616d0000b273', 'ab67616d00001e02')} alt="" /> : <span />}
                    <span className="taste-q__song">
                      <span>{preview === key ? '■ 듣는 중' : '▶ 들어보기'}</span>
                      <span className="taste-q__song-name">
                        {sample.track} · {sample.artistName}
                      </span>
                    </span>
                  </button>
                ) : q.samples ? (
                  <span className="taste-q__sample taste-q__sample--wait">곡을 고르는 중…</span>
                ) : null}
              </div>
            )
          })}
        </div>
        {playing ? (
          <div className="taste-q__player">
            <SongPlayer key={playing.id} pickId={playing.id} embed={playing.embed} title={`${playing.track} — ${playing.artistName}`} autoPlay />
          </div>
        ) : null}
        <div className="my-actions taste__go">
          {qi > 0 ? (
            <button
              className="btn btn--outline"
              onClick={() => {
                setPreview(null)
                setQi(qi - 1)
              }}
            >
              <span>이전 질문</span>
            </button>
          ) : null}
          <button className="text-btn" onClick={() => choose(null)} disabled={loading}>
            {loading ? '곡을 고르는 중…' : '잘 모르겠어요'}
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
          <p className="label">들어보기</p>
          <h1 className="display-md taste__h">아직 끌리는 곡이 없었어요</h1>
          <p className="muted taste__lead">10곡 더 들어 보거나, 질문에 다시 답해 볼까요?</p>
          <div className="my-actions">
            <button className="btn btn--filled" onClick={() => start(true)} disabled={loading}>
              <span>10곡 더 듣기</span>
            </button>
            <button
              className="btn btn--outline"
              onClick={() => {
                setQi(0)
                setStep('quiz')
              }}
            >
              <span>질문 다시 하기</span>
            </button>
          </div>
        </section>
      )
    }
    return (
      <section className="wrap taste">
        <p className="label">
          들어보기 · {i + 1} / {songs.length}
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
        <p className="label">Your taste</p>
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
          <ExportPlaylist songs={taste.recs} name="내 취향 추천" />
          <button
            className="text-btn"
            onClick={() => {
              setTaste(null)
              setAnswers({})
              setQi(0)
              setStep('quiz')
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
