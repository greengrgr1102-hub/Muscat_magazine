import 'server-only'
import path from 'path'
import { pinyin } from 'pinyin-pro'

// 일본어·중국어 이름을 로마자 발음으로 (한국 독자가 읽을 수 있게)
//  スーパースターになったら → Supasuta ni nattara
//  莫創崴 → Mo Chuang Wai

type Converter = { convert: (s: string, o: Record<string, unknown>) => Promise<string> }
let ready: Promise<Converter> | null = null

function kuroshiro(): Promise<Converter> {
  if (!ready) {
    ready = (async () => {
      const K = (await import('kuroshiro')) as unknown as { default: new () => Converter & { init: (a: unknown) => Promise<void> } }
      const A = (await import('kuroshiro-analyzer-kuromoji')) as unknown as { default: new (o: { dictPath: string }) => unknown }
      const Kuro = (K.default as unknown as { default?: typeof K.default }).default || K.default
      const Ana = (A.default as unknown as { default?: typeof A.default }).default || A.default
      const k = new Kuro()
      await k.init(new Ana({ dictPath: path.join(process.cwd(), 'node_modules/kuromoji/dict') }))
      return k
    })()
  }
  return ready
}

const KANA = /[぀-ヿｦ-ﾟ]/
const HAN = /[㐀-鿿豈-﫿]/

const tidy = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?)\]」』])/g, '$1')
    .replace(/([(\[「『])\s+/g, '$1')
    .trim()

const cap = (s: string) => s.replace(/^\p{Ll}/u, (c) => c.toUpperCase())
const capWords = (s: string) => s.replace(/(^|\s)(\p{Ll})/gu, (_, a, c) => a + c.toUpperCase())

const zh = (s: string) => s.replace(/[㐀-鿿豈-﫿]+/g, (m) => ` ${pinyin(m, { toneType: 'none', type: 'array' }).join(' ')} `)

/**
 * kind: 'title'(곡·앨범) 은 첫 글자만 대문자, 'name'(아티스트) 은 단어마다 대문자.
 * chinese: 중국·대만·홍콩 아티스트면 한자를 중국어 발음으로 읽어요. 아니면 일본어로 읽어요.
 */
export async function romanize(text: string, { kind = 'title', chinese = false }: { kind?: 'title' | 'name'; chinese?: boolean } = {}) {
  let out = text
  if (chinese && !KANA.test(text)) out = zh(text)
  else {
    const k = await kuroshiro()
    out = await k.convert(text, { to: 'romaji', mode: 'spaced', romajiSystem: 'passport' })
    // 사전에 없어서 남은 한자는 중국어 발음으로
    if (HAN.test(out)) out = zh(out)
  }
  out = tidy(out)
  return kind === 'name' ? capWords(out) : cap(out)
}
