import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import sharp from 'sharp'

// 링크를 공유할 때 보이는 카드 이미지 (1200×630)
export const OG_SIZE = { width: 1200, height: 630 }
const PHOTO_W = 520
const BG = '#FAFAFA'
const INK = '#111111'
const MUTED = '#6b6b6b'
const ACCENT = '#00bf63'
const ACCENT_INK = '#008a47'

type Photo = { url?: string | null; focalX?: number | null; focalY?: number | null } | null | undefined

let fontsP: Promise<{ name: string; data: Buffer; weight: 500 | 600 | 400; style: 'normal' | 'italic' }[]> | null = null
function fonts() {
  const dir = join(process.cwd(), 'src/assets/og')
  fontsP ??= Promise.all([
    readFile(join(dir, 'Pretendard-Medium.otf')).then((data) => ({ name: 'Pretendard', data, weight: 500 as const, style: 'normal' as const })),
    readFile(join(dir, 'Pretendard-SemiBold.otf')).then((data) => ({ name: 'Pretendard', data, weight: 600 as const, style: 'normal' as const })),
    readFile(join(dir, 'InstrumentSerif-Italic.woff')).then((data) => ({ name: 'Instrument Serif', data, weight: 400 as const, style: 'italic' as const })),
  ])
  return fontsP
}

const siteUrl = () =>
  process.env.NEXT_PUBLIC_SERVER_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')

// 사진을 오른쪽 칸 크기로, 관리자에서 찍은 중심점 기준으로 잘라 JPEG로 만듭니다.
async function cropPhoto(photo: Photo, w: number, h: number): Promise<string | null> {
  if (!photo?.url) return null
  try {
    const url = photo.url.startsWith('http') ? photo.url : new URL(photo.url, siteUrl()).toString()
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const input = Buffer.from(await res.arrayBuffer())
    const img = sharp(input).rotate()
    const meta = await img.metadata()
    const sw = meta.autoOrient?.width || meta.width
    const sh = meta.autoOrient?.height || meta.height
    if (!sw || !sh) return null
    const scale = Math.max(w / sw, h / sh)
    const rw = Math.round(sw * scale)
    const rh = Math.round(sh * scale)
    const fx = (photo.focalX ?? 50) / 100
    const fy = (photo.focalY ?? 50) / 100
    const left = Math.min(Math.max(0, Math.round(rw * fx - w / 2)), rw - w)
    const top = Math.min(Math.max(0, Math.round(rh * fy - h / 2)), rh - h)
    const out = await img.resize(rw, rh).extract({ left, top, width: w, height: h }).jpeg({ quality: 82 }).toBuffer()
    return `data:image/jpeg;base64,${out.toString('base64')}`
  } catch {
    return null
  }
}

export async function shareCard({ label, title, sub, photo }: { label: string; title: string; sub?: string | null; photo?: Photo }) {
  const [fontList, img] = await Promise.all([fonts(), cropPhoto(photo, PHOTO_W, OG_SIZE.height)])
  const big = title.length > 28 ? 52 : title.length > 14 ? 62 : 76
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: BG, fontFamily: 'Pretendard' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            padding: '56px 60px 60px 64px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, color: INK }}>
            <div style={{ width: 7, height: 36, background: ACCENT, marginRight: 16 }} />
            <span style={{ fontWeight: 600, letterSpacing: -0.5 }}>Muscat</span>
            <span style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 38, marginLeft: 9 }}>Magazine</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: ACCENT_INK, letterSpacing: 2, textTransform: 'uppercase' }}>{label}</div>
            <div
              style={{
                display: 'block',
                marginTop: 18,
                fontSize: big,
                fontWeight: 600,
                lineHeight: 1.22,
                color: INK,
                letterSpacing: -1,
                wordBreak: 'keep-all',
                lineClamp: 3,
              }}
            >
              {title}
            </div>
            {sub ? (
              <div
                style={{
                  display: 'block',
                  marginTop: 22,
                  fontSize: 24,
                  fontWeight: 500,
                  color: MUTED,
                  lineHeight: 1.45,
                  wordBreak: 'keep-all',
                  lineClamp: 2,
                }}
              >
                {sub}
              </div>
            ) : null}
          </div>
        </div>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} width={PHOTO_W} height={OG_SIZE.height} style={{ width: PHOTO_W, height: OG_SIZE.height }} alt="" />
        ) : (
          <div style={{ display: 'flex', width: 14, height: '100%', background: ACCENT }} />
        )}
      </div>
    ),
    { ...OG_SIZE, fonts: fontList },
  )
}
