import Link from 'next/link'

// 「꼭 들어야 할 것」 표시. 누르면 Essential 페이지로 가요.
export function EssentialBadge({ size = 'sm', link = false }: { size?: 'sm' | 'md'; link?: boolean }) {
  const cls = `ess-badge ess-badge--${size}`
  const inner = (
    <>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l2.9 6.9L22 9.6l-5.4 4.8L18.2 22 12 18.2 5.8 22l1.6-7.6L2 9.6l7.1-.7z" />
      </svg>
      Essential
    </>
  )
  return link ? (
    <Link href="/essential" className={cls} title="꼭 들어야 할 것만 모은 Essential 보기">
      {inner}
    </Link>
  ) : (
    <span className={cls} title="Essential — 꼭 들어야 할 앨범">
      {inner}
    </span>
  )
}
