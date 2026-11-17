import { Button } from '@/components/ui'

export default function NotFound() {
  return (
    <section className="wrap not-found">
      <p className="label">404</p>
      <h1 className="h-xl">찾는 페이지가 없어요.</h1>
      <p className="muted">주소가 바뀌었거나 삭제된 글일 수 있습니다.</p>
      <div className="chips">
        <Button href="/">홈으로</Button>
        <Button href="/search" variant="outline" icon="search">
          검색하기
        </Button>
      </div>
    </section>
  )
}
