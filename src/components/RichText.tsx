import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import type { Media } from '@/payload-types'

// 본문에 넣은 사진: 사진 + 밑에 작은 설명
const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  upload: ({ node }) => {
    const m = (node as unknown as { value?: Media | number }).value
    if (!m || typeof m !== 'object' || !m.url) return null
    const src = m.sizes?.large?.url || m.url
    return (
      <figure className="prose-figure">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={m.alt || ''} width={m.width || undefined} height={m.height || undefined} loading="lazy" />
        {m.caption ? <figcaption className="caption">{m.caption}</figcaption> : null}
      </figure>
    )
  },
})

export function RichText({ data, className = 'prose' }: { data?: unknown; className?: string }) {
  const state = data as SerializedEditorState | null | undefined
  if (!state?.root?.children?.length) return null
  // 빈 문단 하나만 있는 경우도 건너뜁니다.
  const hasText = JSON.stringify(state.root).includes('"text":"') || JSON.stringify(state.root).includes('"type":"upload"')
  if (!hasText) return null
  return <LexicalRichText data={state} className={className} converters={converters} />
}
