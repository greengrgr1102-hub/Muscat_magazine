'use client'
import { useState } from 'react'
import { copyText } from '@/lib/copy'
import type { Song } from '@/lib/myPlaylist'

// 곡 목록을 다른 앱으로 가져가기
// - Spotify: 곡 링크를 복사 → PC Spotify 앱의 플레이리스트에 붙여넣으면 한 번에 들어가요
// - YouTube: 영상 ID를 모아 YouTube 임시 재생목록으로 열어요 (로그인 없이, 50곡까지)

const spotifyTrack = (embed?: string | null) => embed?.match(/track\/([A-Za-z0-9]{22})/)?.[1] || null

type Sheet = { title: string; text?: string; body: string; done?: string }

export function ExportPlaylist({ songs, name }: { songs: Song[]; name: string }) {
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [busy, setBusy] = useState('')

  const toSpotify = async () => {
    const links = songs.map((s) => spotifyTrack(s.embed)).filter(Boolean).map((id) => `https://open.spotify.com/track/${id}`)
    if (!links.length) return
    const text = links.join('\n')
    const ok = await copyText(text)
    setSheet({
      title: 'Spotify로 옮기기',
      text: ok ? undefined : text,
      done: ok ? `${links.length}곡 링크를 복사했어요` : undefined,
      body: 'PC나 맥의 Spotify 앱에서 새 플레이리스트를 만들고, 곡 목록 자리를 누른 뒤 붙여넣기(Ctrl+V · ⌘V) 하면 곡이 한 번에 들어가요. 휴대폰 앱은 붙여넣기가 안 돼요.',
    })
  }

  const toYoutube = async () => {
    const list = songs.slice(0, 50)
    // 아직 영상을 못 찾은 곡은 사이트에 물어봐요 (이미 찾은 곡은 바로 와요)
    const ids: string[] = []
    for (let i = 0; i < list.length; i++) {
      setBusy(`YouTube 영상 찾는 중 ${i + 1}/${list.length}`)
      const r = await fetch(`/youtube/resolve?pick=${list[i].id}`)
        .then((x) => x.json() as Promise<{ id?: string | null }>)
        .catch(() => null)
      if (r?.id) ids.push(r.id)
    }
    setBusy('')
    if (!ids.length) {
      setSheet({ title: 'YouTube로 열기', body: '공식 YouTube 영상을 찾은 곡이 아직 없어요. 오늘 찾을 수 있는 횟수를 다 썼을 수도 있어요. 내일 다시 해 주세요.' })
      return
    }
    window.open(`https://www.youtube.com/watch_videos?video_ids=${ids.join(',')}`, '_blank', 'noopener')
    if (ids.length < list.length)
      setSheet({
        title: 'YouTube로 열기',
        body: `${list.length}곡 중 ${ids.length}곡은 공식 영상이 있어서 YouTube 재생목록으로 열었어요. 나머지는 공식 영상을 못 찾았거나 오늘 찾을 수 있는 횟수를 다 썼어요.`,
      })
  }

  if (!songs.length) return null
  return (
    <>
      <button type="button" className="btn btn--outline" onClick={toSpotify}>
        <span>Spotify로 옮기기</span>
      </button>
      <button type="button" className="btn btn--outline" onClick={toYoutube} disabled={Boolean(busy)}>
        <span>{busy || `YouTube로 열기${songs.length > 50 ? ' (50곡까지)' : ''}`}</span>
      </button>
      {sheet ? (
        <div className="copy-sheet" role="dialog" aria-modal="true" aria-label={sheet.title} onClick={() => setSheet(null)}>
          <div className="copy-sheet__box" onClick={(e) => e.stopPropagation()}>
            <p className="label">{sheet.title}</p>
            {sheet.done ? <p><strong>{sheet.done}</strong></p> : null}
            <p className="small muted">{sheet.body}</p>
            {sheet.text ? (
              <>
                <p className="small muted">이 브라우저에서는 자동 복사가 막혀 있어요. 아래 글을 길게 눌러 「전체 선택 → 복사」해 주세요.</p>
                <textarea readOnly value={sheet.text} onFocus={(e) => e.currentTarget.select()} autoFocus aria-label={`${name} 곡 링크`} />
              </>
            ) : null}
            <div className="my-actions">
              <button className="btn btn--outline" onClick={() => setSheet(null)}>
                <span>닫기</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
