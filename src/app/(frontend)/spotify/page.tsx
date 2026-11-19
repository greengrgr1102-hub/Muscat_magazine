import type { Metadata } from 'next'
import { currentAdmin } from '@/lib/admin'
import { formatDate } from '@/lib/data'
import { redirectUri, spotifyKeyProblem } from '@/lib/spotify'
import { AlbumNamesButton, PlaylistForm, RenameButton, SyncButton } from './SpotifyForms'

export const metadata: Metadata = { title: 'Spotify 연동', robots: { index: false, follow: false } }

const ERR: Record<string, string> = {
  config: 'Spotify 앱 정보(키)가 없거나 잘못 들어가 있어요. 아래 1단계를 확인해 주세요.',
  denied: 'Spotify 연결이 취소됐어요. 다시 시도해 주세요.',
  token: 'Spotify 연결에 실패했어요. Spotify 앱 설정의 Redirect URI가 아래 주소와 똑같은지 확인해 주세요.',
}

export default async function SpotifyPage({ searchParams }: { searchParams: Promise<{ e?: string; ok?: string }> }) {
  const sp = await searchParams
  const { payload, user } = await currentAdmin()

  if (!user) {
    return (
      <section className="wrap section stack-20" style={{ maxWidth: 720, paddingTop: 96 }}>
        <p className="label">Admin · Spotify</p>
        <h1 className="h-xl">Spotify 연동</h1>
        <p className="muted">관리자만 쓸 수 있는 화면이에요. 먼저 로그인해 주세요.</p>
        <a className="btn btn--filled" href="/admin/login?redirect=%2Fspotify">
          <span>관리자 로그인</span>
        </a>
      </section>
    )
  }

  const cfg = await payload.findGlobal({ slug: 'spotify-sync', overrideAccess: true })
  const keyProblem = spotifyKeyProblem()
  const configured = !keyProblem
  const connected = Boolean(cfg.refreshToken)

  return (
    <section className="wrap section stack-48" style={{ maxWidth: 760, paddingTop: 96 }}>
      <div className="stack-16">
        <p className="label">Admin · Spotify</p>
        <h1 className="h-xl">Spotify 연동</h1>
        <p className="muted">
          내 Spotify 플레이리스트에 곡을 추가하면 Editor&apos;s Picks에 자동으로 올라와요. 하루 한 번, 그리고 누군가
          Editor&apos;s Picks를 열 때(최대 한 시간에 한 번) 새 곡을 확인해요. 코멘트와 태그는 나중에 관리자 화면에서
          덧붙이면 돼요.
        </p>
        {sp.e ? <p style={{ color: '#B3261E' }}>{ERR[sp.e] || '문제가 생겼어요.'}</p> : null}
        {sp.ok ? <p style={{ color: 'var(--accent-ink)' }}>Spotify 계정이 연결됐어요.</p> : null}
      </div>

      <div className="stack-12">
        <p className="label">1단계 · Spotify 앱 정보 {configured ? '✓' : ''}</p>
        {configured ? (
          <p>Vercel에 Spotify 앱 정보가 들어가 있어요.</p>
        ) : keyProblem && !keyProblem.includes('아직 없어요') ? (
          <p style={{ color: '#B3261E' }}>{keyProblem} 고친 뒤에는 다시 배포해야 적용돼요.</p>
        ) : (
          <p className="muted">
            Spotify 개발자 대시보드에서 앱을 만들고, 받은 Client ID·Client Secret을 Vercel 환경 변수에 넣어 주세요. 앱의
            Redirect URI에는 아래 주소를 그대로 넣어야 해요.
          </p>
        )}
        <code style={{ background: 'var(--surface)', padding: '10px 14px', wordBreak: 'break-all' }}>{redirectUri()}</code>
      </div>

      <div className="stack-12">
        <p className="label">2단계 · 내 Spotify 계정 연결 {connected ? '✓' : ''}</p>
        {connected ? <p>연결된 계정: {cfg.connectedAs}</p> : null}
        <a className={`btn ${connected ? 'btn--outline' : 'btn--filled'}`} href="/spotify/login">
          <span>{connected ? '다시 연결하기' : 'Spotify로 연결하기'}</span>
        </a>
      </div>

      <div className="stack-12">
        <p className="label">3단계 · 플레이리스트 정하기 {cfg.playlistUrl ? '✓' : ''}</p>
        <PlaylistForm initial={cfg.playlistUrl} />
      </div>

      <div className="stack-12">
        <p className="label">가져오기</p>
        {cfg.lastSyncedAt ? (
          <p className="muted small">
            마지막 확인: {formatDate(cfg.lastSyncedAt)} {new Date(cfg.lastSyncedAt).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' })} · {cfg.lastResult}
          </p>
        ) : null}
        <SyncButton />
      </div>

      <div className="stack-12">
        <p className="label">곡 정보 새로 고치기</p>
        <p className="muted small">
          이미 가져온 곡의 이름을 Spotify의 한국어 이름으로 맞추고(IU → 아이유 등), 앨범 이름과 발매일을 채워요. 곡이 많으면 몇
          번에 나눠서 진행돼요.
          {typeof cfg.renameOffset === 'number' ? ` 지금 ${cfg.renameOffset.toLocaleString()}곡까지 확인했어요.` : ''}
        </p>
        <RenameButton />
      </div>

      <div className="stack-12">
        <p className="label">앨범 이름 채우기</p>
        <p className="muted small">
          앨범 이름이 비어 있는 앨범을 Spotify 공개 곡 페이지에서 찾아 채워요. API 요청 제한과 상관없이 돼요. 한 번에 다 안 되면 몇 번
          더 눌러 주세요. 새벽 예약 실행 때도 자동으로 이어서 해요.
        </p>
        <AlbumNamesButton />
      </div>
    </section>
  )
}

// Spotify 가져오기가 도는 화면: 넉넉하게 60초까지 기다려요.
export const maxDuration = 60
