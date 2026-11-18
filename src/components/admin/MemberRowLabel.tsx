'use client'
import { useRowLabel } from '@payloadcms/ui'

// 멤버 목록에서 각 줄에 이름(과 탈퇴 표시)이 보이게
export function MemberRowLabel() {
  const { data, rowNumber } = useRowLabel<{ name?: string; role?: string; left?: boolean }>()
  const name = data?.name || `멤버 ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`
  return (
    <span>
      {name}
      {data?.role ? ` · ${data.role}` : ''}
      {data?.left ? ' (탈퇴)' : ''}
    </span>
  )
}
