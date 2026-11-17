import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

export function RichText({ data, className = 'prose' }: { data?: unknown; className?: string }) {
  const state = data as SerializedEditorState | null | undefined
  if (!state?.root?.children?.length) return null
  // 빈 문단 하나만 있는 경우도 건너뜁니다.
  const hasText = JSON.stringify(state.root).includes('"text":"') || JSON.stringify(state.root).includes('"type":"upload"')
  if (!hasText) return null
  return <LexicalRichText data={state} className={className} />
}
