'use client'

// 화면 아래에 잠깐 뜨는 알림. 되돌리기 버튼을 달 수 있어요.
export type Toast = { text: string; undo?: () => void; href?: string; hrefLabel?: string }

export function toast(t: string | Toast) {
  const detail: Toast = typeof t === 'string' ? { text: t } : t
  window.dispatchEvent(new CustomEvent('mm-toast', { detail }))
}
