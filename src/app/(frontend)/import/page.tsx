import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getClient } from '@/lib/data'
import { GenreFiller } from './GenreFiller'
import { Importer } from './Importer'

export const metadata: Metadata = { title: '가져오기', robots: { index: false, follow: false } }

export default async function ImportPage() {
  const payload = await getClient()
  const { user } = await payload.auth({ headers: await headers() })

  return (
    <section className="wrap section stack-20" style={{ maxWidth: 720 }}>
      <p className="label">Admin · Import</p>
      <h1 className="h-xl">글 가져오기</h1>
      {user ? (
        <>
          <p className="muted">
            Claude가 정리해 준 가져오기 파일(.json)을 선택하면 글이 모두 임시저장 상태로 들어갑니다. 이미 있는 글은
            건너뛰니 여러 번 실행해도 괜찮아요.
          </p>
          <Importer />
          <h2 className="h-lg" style={{ marginTop: 48 }}>Editor&apos;s Picks 장르 채우기</h2>
          <p className="muted">Claude가 만든 장르 목록을 붙여넣고 누르면, 장르가 비어 있는 곡에만 채워요.</p>
          <GenreFiller />
        </>
      ) : (
        <>
          <p className="muted">관리자만 쓸 수 있는 화면이에요. 먼저 로그인해 주세요.</p>
          <a className="btn btn--filled" href="/admin/login?redirect=%2Fimport">
            <span>관리자 로그인</span>
          </a>
        </>
      )}
    </section>
  )
}
