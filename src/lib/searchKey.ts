/**
 * 검색용으로 글자를 고르게 만들어요.
 * 대소문자·띄어쓰기·하이픈·문장부호·악센트 차이를 없애서
 * 「City Pop」「city-pop」「citypop」「시티 팝」「시티팝」이 각각 같은 키가 돼요.
 * DB 쪽 sqlKey()와 똑같은 규칙이어야 해요.
 */
export const ACCENT_FROM = 'áàâäãåāéèêëēíìîïīóòôöõøōúùûüūñçýÿ'
export const ACCENT_TO = 'aaaaaaaeeeeeiiiiiooooooouuuuuncyy'
// 남기는 글자: 숫자, 영문, 한글, 히라가나·가타카나, 한자
export const KEEP = '0-9a-z가-힣ㄱ-ㅎぁ-ゖァ-ヺ一-鿿'

const strip = new RegExp(`[^${KEEP}]`, 'g')

export function searchKey(s: string | null | undefined): string {
  if (!s) return ''
  let out = ''
  for (const ch of s.toLowerCase()) {
    const i = ACCENT_FROM.indexOf(ch)
    out += i >= 0 ? ACCENT_TO[i] : ch
  }
  return out.replace(strip, '')
}
