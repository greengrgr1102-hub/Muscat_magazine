'use client'
import { useActionState, useTransition, useState } from 'react'
import { renameNow, fillAlbumsNow, fillFiltersNow, savePlaylist, syncNow } from './actions'

type R = { ok?: string; error?: string } | null

export function PlaylistForm({ initial }: { initial?: string | null }) {
  const [state, action, pending] = useActionState<R, FormData>(savePlaylist as never, null)
  return (
    <form action={action} className="stack-12">
      <label className="field">
        <span className="label">연동할 플레이리스트 링크</span>
        <input name="playlistUrl" defaultValue={initial || ''} placeholder="https://open.spotify.com/playlist/…" />
      </label>
      <button className="btn btn--outline" disabled={pending}>
        <span>{pending ? '저장 중…' : '저장'}</span>
      </button>
      {state?.ok ? <p className="small" style={{ color: 'var(--accent-ink)' }}>{state.ok}</p> : null}
      {state?.error ? <p className="small" style={{ color: '#B3261E' }}>{state.error}</p> : null}
    </form>
  )
}

export function SyncButton() {
  const [pending, start] = useTransition()
  const [res, setRes] = useState<R>(null)
  return (
    <div className="stack-12">
      <button className="btn btn--filled" disabled={pending} onClick={() => start(async () => setRes(await syncNow()))}>
        <span>{pending ? '가져오는 중…' : '지금 가져오기'}</span>
      </button>
      {res?.ok ? <p className="small" style={{ color: 'var(--accent-ink)' }}>{res.ok}</p> : null}
      {res?.error ? <p className="small" style={{ color: '#B3261E' }}>{res.error}</p> : null}
    </div>
  )
}

export function RenameButton() {
  const [pending, start] = useTransition()
  const [res, setRes] = useState<R>(null)
  return (
    <div className="stack-12">
      <button className="btn btn--outline" disabled={pending} onClick={() => start(async () => setRes(await renameNow()))}>
        <span>{pending ? '맞추는 중… (최대 40초)' : '곡 정보 새로 고치기'}</span>
      </button>
      {res?.ok ? <p className="small" style={{ color: 'var(--accent-ink)' }}>{res.ok}</p> : null}
      {res?.error ? <p className="small" style={{ color: '#B3261E' }}>{res.error}</p> : null}
    </div>
  )
}

export function AlbumNamesButton() {
  const [pending, start] = useTransition()
  const [res, setRes] = useState<R>(null)
  return (
    <div className="stack-12">
      <button className="btn btn--outline" disabled={pending} onClick={() => start(async () => setRes(await fillAlbumsNow()))}>
        <span>{pending ? '채우는 중… (최대 45초)' : '앨범 이름 채우기'}</span>
      </button>
      {res?.ok ? <p className="small" style={{ color: 'var(--accent-ink)' }}>{res.ok}</p> : null}
      {res?.error ? <p className="small" style={{ color: '#B3261E' }}>{res.error}</p> : null}
    </div>
  )
}

export function FilterInfoButton() {
  const [pending, start] = useTransition()
  const [res, setRes] = useState<R>(null)
  return (
    <div className="stack-12">
      <button className="btn btn--outline" disabled={pending} onClick={() => start(async () => setRes(await fillFiltersNow()))}>
        <span>{pending ? '채우는 중… (최대 45초)' : '앨범 형태·나라 채우기'}</span>
      </button>
      {res?.ok ? <p className="small" style={{ color: 'var(--accent-ink)' }}>{res.ok}</p> : null}
      {res?.error ? <p className="small" style={{ color: '#B3261E' }}>{res.error}</p> : null}
    </div>
  )
}
