'use client'
import { useState } from 'react'
import { applyPickGenres, type PickGenre } from './actions'

// 엑셀(좋아하는 노래 모음)에서 찾은 장르를 Editor's Picks에 채워 넣어요. 300곡씩 나눠서 보내요.
export function GenreFiller() {
  const [text, setText] = useState('')
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function run() {
    setErr('')
    setMsg('')
    let list: PickGenre[]
    try {
      const json = JSON.parse(text)
      list = Array.isArray(json) ? json : json.pickGenres
      if (!Array.isArray(list)) throw new Error()
    } catch {
      setErr('장르 채우기용 내용이 아니에요. Claude가 만든 내용을 그대로 붙여넣어 주세요.')
      return
    }
    setRunning(true)
    let updated = 0
    let skipped = 0
    try {
      for (let i = 0; i < list.length; i += 300) {
        const r = await applyPickGenres(list.slice(i, i + 300))
        updated += r.updated
        skipped += r.skipped
        setMsg(`${Math.min(i + 300, list.length).toLocaleString()} / ${list.length.toLocaleString()}곡 처리 중… (채움 ${updated}곡)`)
      }
      setMsg(`끝! ${updated.toLocaleString()}곡에 장르를 채웠어요. (이미 장르가 있거나 못 찾은 곡 ${skipped}곡은 그대로 뒀어요)`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '채우는 중 문제가 생겼어요.')
    }
    setRunning(false)
  }

  return (
    <div className="stack-12">
      <textarea
        name="pickGenres"
        aria-label="장르 채우기 내용"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder='[{"id": 12, "genres": ["dream-pop"]}, …]'
        style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 12, border: '1px solid var(--line)' }}
      />
      <button className="btn btn--filled" onClick={run} disabled={running || !text.trim()}>
        <span>{running ? '채우는 중…' : '장르 채우기'}</span>
      </button>
      {msg ? <p className="small" style={{ color: 'var(--accent-ink)' }}>{msg}</p> : null}
      {err ? <p className="small" style={{ color: '#B3261E' }}>{err}</p> : null}
    </div>
  )
}
