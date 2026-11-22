import type { Metadata } from 'next'
import { getSettings } from '@/lib/data'

export const metadata: Metadata = { title: '개인정보 처리방침' }

export default async function PrivacyPage() {
  const s = await getSettings()
  const email = s.email || ''
  return (
    <>
      <section className="page-title wrap">
        <p className="label">Privacy</p>
        <h1 className="page-title__h">
          <span className="display-lg">개인정보 처리방침</span>
        </h1>
        <p className="muted page-title__desc">시행일 2026년 11월 22일</p>
      </section>
      <section className="wrap section prose-page">
        <h2>1. 무엇을 받나요</h2>
        <ul>
          <li>구글로 로그인할 때: 이름, 이메일, 프로필 사진 주소, 구글 계정 번호</li>
          <li>
            My Room 기록: 좋아요한 곡, 들은 곡, 최근 들은 곡, 취향 찾기 결과 (다른 기기에서도 보이게
            하려고 저장해요)
          </li>
          <li>뉴스레터 구독·문의를 보낼 때: 이메일, 이름, 보낸 내용</li>
        </ul>
        <p>
          로그인하지 않아도 사이트의 글과 음악은 모두 볼 수 있고, 그때 기록은 방문자의 브라우저에만
          남아요.
        </p>

        <h2>2. 왜 쓰나요</h2>
        <ul>
          <li>로그인과 My Room 기록 보관·동기화</li>
          <li>머스캣 프렌즈(후원) 표시와 혜택 제공</li>
          <li>문의 답변, 뉴스레터 발송</li>
        </ul>
        <p>광고나 마케팅 목적으로 다른 곳에 넘기거나 팔지 않아요.</p>

        <h2>3. 얼마나 보관하나요</h2>
        <p>
          탈퇴할 때까지 보관하고, My Room의 「회원 탈퇴」를 누르면 계정과 계정에 저장된 기록을 바로
          지워요. 법에 따라 보관해야 하는 정보가 생기면(예: 결제 기록) 그 기간 동안만 따로 보관해요.
        </p>

        <h2>4. 맡기는 곳</h2>
        <ul>
          <li>Vercel — 사이트와 데이터 보관(호스팅·데이터베이스)</li>
          <li>Google — 로그인(구글 계정 확인)</li>
        </ul>

        <h2>5. 내 정보 확인·삭제</h2>
        <p>
          My Room에서 내 정보를 확인하고 탈퇴할 수 있어요. 그 밖의 요청은
          {email ? (
            <>
              {' '}
              <a href={`mailto:${email}`}>{email}</a>로
            </>
          ) : (
            ' Contact 페이지로'
          )}{' '}
          알려 주세요.
        </p>

        <h2>6. 쿠키</h2>
        <p>
          로그인 상태를 기억하는 쿠키(mm_sess, mm_in)만 써요. 로그아웃하면 지워져요. 방문 통계는
          개인을 알아볼 수 없는 숫자로만 셉니다.
        </p>
      </section>
    </>
  )
}
