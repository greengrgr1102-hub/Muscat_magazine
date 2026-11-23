import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { getClient } from './data'
import { siteUrl } from './spotify'

// 방문자 로그인 (구글). 관리자 로그인과는 따로예요.
// 세션 쿠키 mm_sess = 회원번호.만료시각.서명 (서버만 읽음), mm_in = 로그인했는지 표시(브라우저가 읽음)
export const SESSION_COOKIE = 'mm_sess'
export const FLAG_COOKIE = 'mm_in'
// 로그인 상태 유지: 켜면 30일 동안 안 들어오면 자동 로그아웃(들어올 때마다 30일 연장),
// 끄면 브라우저를 닫거나 3시간 동안 아무것도 안 하면 자동 로그아웃
export const KEEP_DAYS = 30
export const IDLE_HOURS = 3
const keepMs = KEEP_DAYS * 86400_000
const idleMs = IDLE_HOURS * 3600_000

const secret = () =>
  process.env.PAYLOAD_SECRET ||
  createHash('sha256')
    .update('muscat-member:' + (process.env.DATABASE_URL || process.env.POSTGRES_URL || 'local'))
    .digest('hex')

const b64 = (b: Buffer) => b.toString('base64url')
const sign = (v: string) => b64(createHmac('sha256', secret()).update(v).digest())
const same = (a: string, b: string) => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export type Session = { id: number; exp: number; keep: boolean }

/** 회원번호.만료시각.유지여부.서명 — 유지면 30일 쿠키, 아니면 브라우저 닫으면 사라지는 쿠키 */
export function makeSession(memberId: number, keep: boolean) {
  const exp = Date.now() + (keep ? keepMs : idleMs)
  const v = `${memberId}.${exp}.${keep ? 1 : 0}`
  return { value: `${v}.${sign(v)}`, maxAge: keep ? KEEP_DAYS * 86400 : undefined }
}

export function parseSession(raw?: string | null): Session | null {
  if (!raw) return null
  const parts = raw.split('.')
  let id: string, exp: string, keep: boolean
  if (parts.length === 4) {
    // 지금 모양: 회원번호.만료.유지여부.서명
    const [i, e, k, sig] = parts
    if (!same(sign(`${i}.${e}.${k}`), sig)) return null
    ;[id, exp, keep] = [i, e, k === '1']
  } else if (parts.length === 3) {
    // 예전 모양(유지 여부 없음) — 유지로 보고, 다음 연장 때 새 모양으로 바뀌어요
    const [i, e, sig] = parts
    if (!same(sign(`${i}.${e}`), sig)) return null
    ;[id, exp, keep] = [i, e, true]
  } else return null
  if (Number(exp) < Date.now()) return null
  const n = Number(id)
  return Number.isInteger(n) && n > 0 ? { id: n, exp: Number(exp), keep } : null
}

export function readSession(raw?: string | null): number | null {
  return parseSession(raw)?.id ?? null
}

/** 쓰고 있으면 만료를 다시 늘려요 (10분에 한 번까지만) */
export function shouldRenew(s: Session) {
  const full = s.keep ? keepMs : idleMs
  return s.exp - Date.now() < full - 10 * 60_000
}

type CookieRes = {
  cookies: {
    set: (name: string, value: string, opts: Record<string, unknown>) => unknown
    delete: (name: string) => unknown
  }
}

export function setSessionCookies(res: CookieRes, memberId: number, keep: boolean) {
  const s = makeSession(memberId, keep)
  const secure = process.env.NODE_ENV === 'production'
  const base = { secure, sameSite: 'lax', path: '/', ...(s.maxAge ? { maxAge: s.maxAge } : {}) }
  res.cookies.set(SESSION_COOKIE, s.value, { ...base, httpOnly: true })
  res.cookies.set(FLAG_COOKIE, '1', { ...base, httpOnly: false })
}

export function clearSessionCookies(res: CookieRes) {
  res.cookies.delete(SESSION_COOKIE)
  res.cookies.delete(FLAG_COOKIE)
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
  if (!tok.ok) {
    // 비밀값은 찍지 않고 구글이 돌려준 오류 이름만 남겨요
    const e = (await tok.json().catch(() => ({}))) as { error?: string; error_description?: string }
    console.error(
      '[google-login] token',
      tok.status,
      e.error,
      e.error_description,
      googleRedirect(),
    )
    return null
  }
  const { access_token } = (await tok.json()) as { access_token?: string }
  if (!access_token) {
    console.error('[google-login] token: access_token 없음')
    return null
  }
  const me = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
    cache: 'no-store',
  })
  if (!me.ok) {
    console.error('[google-login] userinfo', me.status)
    return null
  }
  const p = (await me.json()) as {
    sub?: string
    email?: string
    email_verified?: boolean
    name?: string
    picture?: string
  }
  if (!p.sub || !p.email || p.email_verified === false) {
    console.error('[google-login] profile', !!p.sub, !!p.email, p.email_verified)
    return null
  }
  return { sub: p.sub, email: p.email.toLowerCase(), name: p.name || '', picture: p.picture || '' }
}

/** 돌아갈 주소는 우리 사이트 안쪽만 */
export const safeNext = (n?: string | null) =>
  n && n.startsWith('/') && !n.startsWith('//') ? n : '/my'
