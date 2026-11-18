import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { currentAdmin } from '@/lib/admin'
import { SPOTIFY_SCOPES, clientId, redirectUri, siteUrl, spotifyConfigured } from '@/lib/spotify'

// 관리자만: Spotify 로그인 화면으로 보냅니다.
export async function GET() {
  const { payload, user } = await currentAdmin()
  if (!user) return NextResponse.redirect(`${siteUrl()}/admin/login?redirect=%2Fspotify`)
  if (!spotifyConfigured()) return NextResponse.redirect(`${siteUrl()}/spotify?e=config`)
  const state = randomBytes(16).toString('hex')
  ;(await cookies()).set('sp_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' })
  const q = new URLSearchParams({
    client_id: clientId(),
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: SPOTIFY_SCOPES,
    state,
  })
  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${q}`)
}
