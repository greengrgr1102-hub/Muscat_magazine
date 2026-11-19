'use client'
// 복사하기: 카카오톡·인스타 같은 앱 안 브라우저는 일반 복사 기능을 막아 둔 경우가 많아서
// 1) 기본 복사 → 2) 옛날 방식 복사 → 3) 둘 다 안 되면 false (화면에 직접 복사할 수 있는 창을 띄워요)
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* 다음 방법으로 */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '0'
    ta.style.opacity = '0'
    ta.style.fontSize = '16px' // iOS에서 화면이 확대되지 않게
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}
