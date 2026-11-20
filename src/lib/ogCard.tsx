import { ImageResponse } from 'next/og'

// 링크를 카톡·인스타·X에 붙였을 때 뜨는 카드 이미지 (1200×630)
export const OG_SIZE = { width: 1200, height: 630 }

const BG = '#fafafa'
const INK = '#111111'
const MUTED = '#6f6f6b'
const ACCENT = '#00bf63'
const ACCENT_INK = '#008a47'
const TINT = '#e2f3e8'

// 카드에 쓰는 글자만 골라 구글 폰트에서 받아요 (한국어·일본어 모두)
async function font(family: string, weight: number, text: string) {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`,
      { cache: 'force-cache' },
    ).then((r) => r.text())
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1]
    return url ? await fetch(url, { cache: 'force-cache' }).then((r) => r.arrayBuffer()) : null
  } catch {
    return null
  }
}

const big = (u?: string | null) => (u ? u.replace('ab67616d00004851', 'ab67616d0000b273').replace('ab67616d00001e02', 'ab67616d0000b273') : null)
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

export async function ogCard({
  kicker,
  title,
  sub,
  chips = [],
  covers = [],
}: {
  kicker: string
  title: string
  sub?: string | null
  chips?: string[]
  covers?: (string | null | undefined)[]
}) {
  const t = cut(title, 60)
  const s = sub ? cut(sub, 60) : ''
  const c = chips.slice(0, 4).map((x) => cut(x, 22))
  const imgs = covers.map(big).filter((x): x is string => Boolean(x)).slice(0, 4)
  const text = `${kicker}${t}${s}${c.join('')}Muscat Magazine·♪`
  const [ko, koBold, jp] = await Promise.all([
    font('Noto+Sans+KR', 500, text),
    font('Noto+Sans+KR', 800, text),
    font('Noto+Sans+JP', 700, text),
  ])
  const fonts = [
    ...(ko ? [{ name: 'KR', data: ko, weight: 500 as const, style: 'normal' as const }] : []),
    ...(koBold ? [{ name: 'KR', data: koBold, weight: 800 as const, style: 'normal' as const }] : []),
    ...(jp ? [{ name: 'JP', data: jp, weight: 700 as const, style: 'normal' as const }] : []),
  ]
  const titleSize = t.length > 36 ? 52 : t.length > 22 ? 64 : 80

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: BG, padding: 56, fontFamily: 'KR, JP' }}>
        {/* 커버: 1장이면 크게, 여러 장이면 2×2 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', width: 518, height: 518, borderRadius: 18, overflow: 'hidden', background: TINT }}>
          {imgs.length === 0 ? (
            <div style={{ display: 'flex', width: 518, height: 518, alignItems: 'center', justifyContent: 'center', color: ACCENT_INK, fontSize: 64 }}>
              ♪
            </div>
          ) : imgs.length < 4 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgs[0]} width={518} height={518} alt="" style={{ objectFit: 'cover' }} />
          ) : (
            imgs.map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={u} width={259} height={259} alt="" style={{ objectFit: 'cover' }} />
            ))
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginLeft: 56, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', color: ACCENT_INK, fontSize: 26, fontWeight: 800, letterSpacing: 1 }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: ACCENT, marginRight: 12 }} />
              {kicker}
            </div>
            <div style={{ display: 'flex', marginTop: 28, color: INK, fontSize: titleSize, fontWeight: 800, lineHeight: 1.12 }}>{t}</div>
            {s ? <div style={{ display: 'flex', marginTop: 18, color: MUTED, fontSize: 34, fontWeight: 500 }}>{s}</div> : null}
            {c.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 30 }}>
                {c.map((x) => (
                  <div
                    key={x}
                    style={{
                      display: 'flex',
                      marginRight: 10,
                      marginBottom: 10,
                      padding: '8px 18px',
                      borderRadius: 999,
                      border: `2px solid ${ACCENT}`,
                      background: TINT,
                      color: ACCENT_INK,
                      fontSize: 24,
                      fontWeight: 500,
                    }}
                  >
                    {x}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: INK, fontSize: 30, fontWeight: 800 }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: ACCENT, marginRight: 12 }} />
            Muscat Magazine
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  )
}
