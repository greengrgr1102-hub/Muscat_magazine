import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { getClient } from './data'
import { siteUrl } from './spotify'

// 방문자 로그인 (구글). 관리자 로그인과는 따로예요.
// 세션 쿠키 mm_sess = 회원번호.만료시각.서명 (서버만 읽음), mm_in = 로그인했는지 표시(브라우저가 읽음)
export const SESSION_COOKIE = 'mm_sess'
export const FLAG_COOKIE = 'mm_in'
const DAYS = 60

const secret = () =>
  process.env.PAYLOAD_SECRET ||
  createHash('sha256')
    .update('muscat-member:' + (process.env.DATABASE_URL || process.env.POSTGRES_URL || 'local'))
    .digest('hex')

const b64 = (b: Buffer) => b.toString('base64url')
const sign = (v: string) => b64(createHmac('sha256', secret()).update(v).digest())

export function makeSession(memberId: number) {
  const exp = Date.now() + DAYS * 86400_000
  const v = `${memberId}.${exp}`
  return { value: `${v}.${sign(v)}`, maxAge: DAYS * 86400 }
}

export function readSession(raw?: string | null): number | null {
  if (!raw) return null
  const [id, exp, sig] = raw.split('.')
  if (!id || !exp || !sig) return null
  const want = Buffer.from(sign(`${id}.${exp}`))
  const got = Buffer.from(sig)
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null
  if (Number(exp) < Date.now()) return null
  const n = Number(id)
  return Number.isInteger(n) && n > 0 ? n : null
}

export type MemberView = {
  id: number
  name: string
  email: string
  image: string | null
  friend: boolean
}

/** 지금 로그인한 회원 (없으면 null) */
export async function currentMember(): Promise<MemberView | null> {
  const jar = await cookies()
  const id = readSession(jar.get(SESSION_COOKIE)?.value)
  if (!id) return null
  const payload = await getClient()
  const m = await payload
    .findByID({ collection: 'members', id, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!m) return null
  return {
    id: m.id,
    name: m.name || m.email.split('@')[0],
    email: m.email,
    image: m.image || null,
    friend: Boolean(m.friend),
  }
}

// ---------- 구글 ----------
export const googleConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim())
export const googleRedirect = () => `${siteUrl()}/auth/google/callback`

export function googleAuthUrl(state: string) {
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  u.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    redirect_uri: googleRedirect(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  }).toString()
  return u.toString()
}

/** 구글이 돌려준 code로 이름·이메일·사진을 받아요 */
export async function googleProfile(code: string) {
  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      redirect_uri: googleRedirect(),
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  })
  if (!tok.ok) return null
  const { access_token } = (await tok.json()) as { access_token?: string }
  if (!access_token) return null
  const me = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
    cache: 'no-store',
  })
  if (!me.ok) return null
  const p = (await me.json()) as {
    sub?: string
    email?: string
    email_verified?: boolean
    name?: string
    picture?: string
  }
  if (!p.sub || !p.email || p.email_verified === false) return null
  return { sub: p.sub, email: p.email.toLowerCase(), name: p.name || '', picture: p.picture || '' }
}

/** 돌아갈 주소는 우리 사이트 안쪽만 */
export const safeNext = (n?: string | null) =>
  n && n.startsWith('/') && !n.startsWith('//') ? n : '/my'
