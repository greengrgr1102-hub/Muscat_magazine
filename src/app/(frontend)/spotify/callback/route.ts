import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getClient } from '@/lib/data'
import { exchangeCode, siteUrl, spotifyMe } from '@/lib/spotify'

// Spotify 로그인 후 돌아오는 곳: 연결 정보를 저장합니다.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const payload = await getClient()
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return NextResponse.redirect(`${siteUrl()}/admin/login?redirect=%2Fspotify`)
  const jar = await cookies()
  const state = jar.get('sp_state')?.value
  jar.delete('sp_state')
  const code = url.searchParams.get('code')
  if (!code || !state || state !== url.searchParams.get('state')) {
    return NextResponse.redirect(`${siteUrl()}/spotify?e=denied`)
  }
  try {
    const tok = await exchangeCode(code)
    const name = await spotifyMe(tok.access_token)
    await payload.updateGlobal({
      slug: 'spotify-sync',
      overrideAccess: true,
      data: { refreshToken: tok.refresh_token, connectedAs: name || '연결됨' },
    })
    return NextResponse.redirect(`${siteUrl()}/spotify?ok=1`)
  } catch {
    return NextResponse.redirect(`${siteUrl()}/spotify?e=token`)
  }
}
