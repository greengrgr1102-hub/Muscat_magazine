'use client'
import { useState } from 'react'
import { importArticle, importArtists, type ImportArticle, type ImportArtist, type ImportResult } from './actions'

type Data = { artists: ImportArtist[]; articles: ImportArticle[] }

export function Importer() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])

  async function onFile(file: File | undefined) {
    setError('')
    setResults([])
    setData(null)
    if (!file) return
    try {
      const json = JSON.parse(await file.text())
      if (!Array.isArray(json.articles) || !Array.isArray(json.artists)) throw new Error()
      setData(json)
    } catch {
      setError('가져오기용 파일(.json)이 아니에요. Claude가 만든 파일을 선택해 주세요.')
    }
  }

  async function run() {
    if (!data) return
    setRunning(true)
    setResults([])
    try {
      const ids = await importArtists(data.artists)
      for (const a of data.articles) {
        const r = await importArticle(a, ids)
        setResults((prev) => [...prev, r])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '가져오는 중 문제가 생겼어요.')
    }
    setRunning(false)
  }

  const done = results.length
  const created = results.filter((r) => r.status === 'created').length
  const skipped = results.filter((r) => r.status === 'skipped').length
  const failed = results.filter((r) => r.status === 'error')

  return (
    <div className="stack-20">
      <label className="btn btn--outline" style={{ cursor: 'pointer' }}>
        <span>파일 선택</span>
        <input type="file" accept=".json,application/json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      {error ? <p className="small" style={{ color: '#B3261E' }}>{error}</p> : null}
      {data ? (
        <div className="stack-12">
          <p>
            아티스트 {data.artists.length}명 · 글 {data.articles.length}편을 <strong>임시저장</strong>으로 가져옵니다.
          </p>
          <button className="btn btn--filled" onClick={run} disabled={running}>
            <span>{running ? `가져오는 중… ${done} / ${data.articles.length}` : '가져오기'}</span>
          </button>
        </div>
      ) : null}
      {done && !running ? (
        <div className="stack-12">
          <p>
            완료: 새로 만든 글 {created}편 · 건너뛴 글 {skipped}편 · 실패 {failed.length}편
          </p>
          {failed.length ? (
            <ul className="small muted">
              {failed.map((f) => (
                <li key={f.slug}>
                  {f.slug}: {f.message}
                </li>
              ))}
            </ul>
          ) : null}
          <a className="btn btn--outline" href="/admin/collections/articles">
            <span>관리자 화면에서 확인하기</span>
          </a>
        </div>
      ) : null}
    </div>
  )
}
