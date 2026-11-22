'use client'
import { useState } from 'react'

// 회원 탈퇴 — 계정과 계정에 저장된 기록을 지워요 (이 기기의 기록은 남아요)
export function Withdraw() {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className="text-btn muted small"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm('탈퇴하면 계정에 저장된 기록이 모두 지워져요. 탈퇴할까요?')) return
        setBusy(true)
        await fetch('/me', { method: 'DELETE' }).catch(() => null)
        try {
          window.localStorage.removeItem('mm_room_owner')
          window.localStorage.removeItem('mm_room_hash')
          window.localStorage.removeItem('mm_room_synced')
        } catch {
          /* 무시 */
        }
        window.location.href = '/my'
      }}
    >
      {busy ? '지우는 중…' : '회원 탈퇴'}
    </button>
  )
}
