// 앨범 이름에 붙은 「The 2nd Mini Album」 같은 설명을 떼요.
//  "STUNNER - The 2nd Mini Album" → "STUNNER"
//  "3rd MINI ALBUM [LOVE PULSE]" → "LOVE PULSE"
//  "IU 5th Album 'LILAC'" → "LILAC"
//  "Fallen Angel (Digital EP)" → "Fallen Angel"
// Deluxe·Vol.·Pt.·Remastered처럼 판을 구분하는 말은 그대로 둬요. 설명만 있는 이름(「The 1st Album」)도 그대로 둬요.

const ORD = String.raw`\d+(?:st|nd|rd|th)`
const KIND = String.raw`(?:mini|full|full-length|single|digital|special|studio|debut|regular)`
// 서수나 종류 말이 꼭 붙어 있어야 해요 (「Naturous Album」 같은 진짜 제목은 건드리지 않게)
const DESC = String.raw`(?:the\s+)?(?:${ORD}\s+(?:${KIND}\s+)?|${KIND}\s+)(?:album|ep)`

const TAIL = new RegExp(String.raw`^(.*?\S)\s*[-–—:]\s*${DESC}\s*$`, 'i')
const PAREN = new RegExp(String.raw`^(.*?\S)\s*[(\[]\s*${DESC}\s*[)\]]\s*$`, 'i')
const QUOTED = new RegExp(String.raw`(?:^|\s)${DESC}\s*['‘’“"\[「『]\s*(.+?)\s*['’”"\]」』]\s*$`, 'i')

export function cleanAlbumName(name?: string | null): string | null | undefined {
  if (!name) return name
  const s = name.trim()
  const m = s.match(QUOTED) || s.match(TAIL) || s.match(PAREN)
  const out = m?.[1]?.trim()
  return out && out.length > 0 ? out : s
}
