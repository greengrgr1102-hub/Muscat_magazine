import type { Metadata } from 'next'
import { getSettings } from '@/lib/data'

export const metadata: Metadata = {
  title: '개인정보 처리방침',
  description: '머스캣 매거진이 어떤 정보를 왜 받고, 어디에 얼마나 두고, 어떻게 지우는지.',
}

const UPDATED = '2026년 11월 23일'

export default async function PrivacyPage() {
  const s = await getSettings()
  const email = s.email || ''
  const mail = email ? <a href={`mailto:${email}`}>{email}</a> : 'Contact 페이지'
  return (
    <>
      <section className="page-title wrap">
        <p className="label">Privacy</p>
        <h1 className="page-title__h">
          <span className="display-lg">개인정보 처리방침</span>
        </h1>
        <p className="muted page-title__desc">시행일 {UPDATED}</p>
      </section>
      <section className="wrap section prose-page">
        <p>
          머스캣 매거진(이하 &lsquo;머스캣&rsquo;)은 「개인정보 보호법」에 따라 방문자의 정보를
          보호하고, 관련 고충을 빠르게 처리하기 위해 이 처리방침을 둡니다. 꼭 필요한 것만 받고, 받은
          것은 어디에 얼마나 두는지 숨김없이 적었어요.
        </p>

        <div className="privacy-sum">
          <p>
            <strong>한눈에 보기</strong>
          </p>
          <ul>
            <li>로그인하지 않으면 머스캣은 이름·이메일 같은 개인정보를 받지 않아요.</li>
            <li>구글로 로그인하면 이름·이메일·프로필 사진만 받아요. 비밀번호는 받지 않아요.</li>
            <li>광고에 쓰거나, 다른 회사에 팔거나 넘기지 않아요. AI 학습에도 쓰지 않아요.</li>
            <li>My Room의 「회원 탈퇴」를 누르면 계정과 기록이 그 자리에서 지워져요.</li>
          </ul>
        </div>

        <h2>1. 개인정보를 쓰는 목적</h2>
        <ul>
          <li>회원 관리: 구글 로그인으로 본인 확인, 로그인 상태 유지, 탈퇴 처리</li>
          <li>My Room: 좋아요한 곡·들은 곡·취향 결과를 계정에 저장해 다른 기기에서도 이어 보기</li>
          <li>머스캣 프렌즈: 프렌즈인지 아닌지 표시하고 프렌즈 전용 기능 열기</li>
          <li>문의 답변, 뉴스레터 보내기</li>
        </ul>
        <p>이 목적 밖으로는 쓰지 않고, 목적이 바뀌면 미리 알리고 필요한 경우 다시 동의를 받아요.</p>

        <h2>2. 받는 정보와 보관 기간</h2>
        <div className="privacy-table">
          <table>
            <thead>
              <tr>
                <th>언제</th>
                <th>받는 정보</th>
                <th>왜</th>
                <th>얼마나</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>구글로 로그인할 때 (필수)</td>
                <td>이름, 이메일 주소, 프로필 사진 주소, 구글 계정 고유번호, 마지막 로그인 시각</td>
                <td>본인 확인, 회원 관리</td>
                <td>탈퇴할 때까지</td>
              </tr>
              <tr>
                <td>로그인한 채로 사이트를 쓸 때</td>
                <td>좋아요한 곡, 들은 곡, 최근 들은 곡(최대 50곡), 취향 찾기 결과, 프렌즈 여부</td>
                <td>My Room 기록 보관·동기화</td>
                <td>탈퇴할 때까지</td>
              </tr>
              <tr>
                <td>문의를 보낼 때</td>
                <td>이름, 이메일 주소, 문의 종류, 문의 내용</td>
                <td>문의 확인과 답변</td>
                <td>답변을 마친 날부터 1년</td>
              </tr>
              <tr>
                <td>뉴스레터를 구독할 때</td>
                <td>이메일 주소</td>
                <td>뉴스레터 보내기</td>
                <td>구독을 그만둘 때까지</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          법적 근거: 로그인과 My Room은 회원 이용 계약을 지키기 위해(「개인정보 보호법」 제15조
          제1항 제4호), 문의와 뉴스레터는 보내는 분이 직접 입력해 요청한 것을 처리하기 위해(같은 항
          제1호 동의) 처리해요. 주민등록번호, 전화번호, 주소, 결제 정보, 건강 같은 민감정보는 받지
          않아요.
        </p>
        <p>
          로그인하지 않으면 좋아요·들은 곡 같은 기록은 머스캣 서버로 오지 않고 방문자 브라우저에만
          남아요(7번 참고).
        </p>

        <h2>3. 지우는 방법</h2>
        <ul>
          <li>
            보관 기간이 끝나거나 탈퇴하면 바로 지워요. 데이터베이스에서 지운 정보는 다시 살릴 수
            없게 지워져요.
          </li>
          <li>
            데이터베이스 업체가 장애 복구용으로 남기는 기록에는 지운 뒤에도 짧은 기간 남아 있다가
            자동으로 사라져요. 이 기록은 복구 말고 다른 데에는 쓰이지 않아요.
          </li>
          <li>종이로 따로 출력해 두는 개인정보는 없어요.</li>
        </ul>

        <h2>4. 다른 곳에 주는 경우</h2>
        <p>
          머스캣은 방문자의 개인정보를 다른 회사나 사람에게 제공하지 않아요. 수사기관이 법에 따른
          절차로 요구하는 경우처럼 법률에 특별한 규정이 있는 때만 예외예요.
        </p>

        <h2>5. 맡기는 곳 (처리 위탁)</h2>
        <p>사이트를 운영하려고 아래 회사의 서비스를 써요. 이 회사들은 맡긴 일에만 정보를 써요.</p>
        <div className="privacy-table">
          <table>
            <thead>
              <tr>
                <th>회사</th>
                <th>맡기는 일</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Vercel Inc.</td>
                <td>사이트 호스팅, 서버 실행, 방문 통계, 이미지 보관</td>
              </tr>
              <tr>
                <td>Neon, Inc. (Vercel을 통해 사용)</td>
                <td>데이터베이스 — 회원·My Room 기록·문의·구독 정보 보관</td>
              </tr>
              <tr>
                <td>Google LLC</td>
                <td>구글 로그인 (본인 확인)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>6. 해외로 옮겨지는 정보 (국외 이전)</h2>
        <p>
          위 회사들의 서버가 해외에 있어서, 로그인하거나 문의·구독을 하면 그 정보가 해외 서버에
          저장돼요.
        </p>
        <div className="privacy-table">
          <table>
            <thead>
              <tr>
                <th>받는 곳</th>
                <th>나라</th>
                <th>옮겨지는 정보</th>
                <th>언제·어떻게</th>
                <th>보관 기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Neon, Inc.
                  <br />
                  Vercel Inc.
                </td>
                <td>싱가포르 (서버 위치), 미국 (회사)</td>
                <td>2번 표의 모든 정보</td>
                <td>로그인·저장·문의·구독할 때마다 암호화된 연결(HTTPS·TLS)로</td>
                <td>2번 표의 보관 기간과 같음</td>
              </tr>
              <tr>
                <td>Google LLC</td>
                <td>미국</td>
                <td>로그인할 때 구글 계정 확인 정보</td>
                <td>구글 로그인 버튼을 누를 때 암호화된 연결로</td>
                <td>Google 개인정보처리방침에 따름</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          법적 근거: 서비스 계약을 지키기 위해 필요한 처리 위탁·보관으로서 이 처리방침에 공개하는
          경우(「개인정보 보호법」 제28조의8 제1항 제3호)예요.
        </p>
        <p>
          거부하는 방법: 국외 이전을 원하지 않으면 로그인·문의·구독을 하지 않으면 돼요. 그래도 글과
          음악은 모두 그대로 쓸 수 있고, My Room 기록은 이 기기에만 남아요. 이미 로그인했다면
          탈퇴하면 돼요.
        </p>

        <h2>7. 쿠키와 브라우저 저장소</h2>
        <p>머스캣이 브라우저에 남기는 것은 아래가 전부예요.</p>
        <div className="privacy-table">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>종류</th>
                <th>하는 일</th>
                <th>기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>mm_sess</td>
                <td>쿠키 (필수)</td>
                <td>로그인 상태 기억 (서명된 회원 번호, 자바스크립트로 읽을 수 없음)</td>
                <td>60일 또는 로그아웃까지</td>
              </tr>
              <tr>
                <td>mm_in</td>
                <td>쿠키 (필수)</td>
                <td>로그인했는지만 표시 (개인정보 없음)</td>
                <td>60일 또는 로그아웃까지</td>
              </tr>
              <tr>
                <td>mm_oauth_state, mm_oauth_next</td>
                <td>쿠키 (필수)</td>
                <td>구글 로그인 도중 위조 방지, 돌아갈 페이지 기억</td>
                <td>10분</td>
              </tr>
              <tr>
                <td>mm_playlist, mm_played, mm_recent, mm_taste 등</td>
                <td>브라우저 저장소</td>
                <td>좋아요·들은 곡·최근 곡·취향 결과·플레이어 위치 같은 설정</td>
                <td>직접 지울 때까지</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          광고나 추적용 쿠키는 쓰지 않아요. 쿠키는 브라우저 설정에서 막거나 지울 수 있어요. 예를
          들어 Chrome은 설정 › 개인정보 보호 및 보안 › 서드 파티 쿠키, Safari는 설정 › 개인정보
          보호에서 바꿀 수 있어요. 쿠키를 막으면 로그인만 안 되고 나머지는 그대로 쓸 수 있어요.
        </p>

        <h2>8. 방문 통계와 바깥 서비스</h2>
        <ul>
          <li>
            방문 통계: 페이지를 본 횟수와 곡 재생 횟수를 숫자로만 세요. 이때 쿠키나 IP 주소를
            저장하지 않아요. Vercel 방문 분석도 쿠키 없이 동작하고, 방문자를 구분하는 값은 하루가
            지나면 버려요.
          </li>
          <li>
            서버 기록: 사이트가 제대로 동작하는지 보려고 요청 기록(접속 주소, 시각, 브라우저 종류)이
            Vercel에 잠시 남아요. 머스캣이 따로 모으지 않고, Vercel 정책에 따라 짧은 기간 뒤
            지워져요.
          </li>
          <li>
            Spotify·YouTube 플레이어: 곡을 들으려고 플레이어를 재생하면 Spotify나 YouTube(Google)가
            자기 정책에 따라 쿠키를 쓰거나 정보를 받을 수 있어요. 이 정보는 머스캣에 오지 않아요.
            자세한 내용은{' '}
            <a
              href="https://www.spotify.com/kr-ko/legal/privacy-policy/"
              target="_blank"
              rel="noreferrer"
            >
              Spotify
            </a>
            와{' '}
            <a href="https://policies.google.com/privacy?hl=ko" target="_blank" rel="noreferrer">
              Google
            </a>{' '}
            개인정보처리방침을 봐 주세요.
          </li>
        </ul>

        <h2>9. 만 14세 미만</h2>
        <p>
          머스캣은 만 14세 미만의 회원 가입(구글 로그인)을 받지 않아요. 만 14세 미만의 정보가 저장된
          것을 알게 되면 바로 지워요.
        </p>

        <h2>10. 정보를 지키는 방법</h2>
        <ul>
          <li>모든 연결은 암호화(HTTPS)되고, 데이터베이스 연결도 암호화돼요.</li>
          <li>비밀번호를 받지 않아요. 로그인은 구글이 확인해요.</li>
          <li>로그인 쿠키는 위조할 수 없게 서명하고, 자바스크립트로 읽을 수 없게 해 둬요.</li>
          <li>
            데이터베이스 접속 정보와 서비스 열쇠는 암호화해 보관하고, 공개 코드에 넣지 않아요.
          </li>
          <li>회원 정보는 관리자(에디터) 한 명만 볼 수 있어요.</li>
        </ul>

        <h2>11. 내 권리와 행사하는 방법</h2>
        <p>
          누구든지 자기 정보를 보여 달라고(열람), 고쳐 달라고(정정), 지워 달라고(삭제), 그만
          쓰라고(처리 정지) 요청할 수 있고, 동의를 거둘 수 있어요.
        </p>
        <ul>
          <li>바로 하기: My Room에서 내 계정 정보를 보고, 로그아웃하거나 탈퇴할 수 있어요.</li>
          <li>
            그 밖의 요청: {mail}로 보내 주세요. 본인인지 확인한 뒤 10일 안에 처리하고 결과를 알려
            드려요.
          </li>
          <li>대리인을 통해서도 요청할 수 있어요. 이때는 위임장이 필요해요.</li>
        </ul>

        <h2>12. 개인정보 보호책임자</h2>
        <p>
          머스캣 매거진 에디터 · {mail}
          <br />
          개인정보와 관련한 문의·불만·피해 구제는 위로 보내 주세요. 빠르게 답할게요.
        </p>

        <h2>13. 도움을 받을 수 있는 곳</h2>
        <p>머스캣의 답변이 부족하거나 피해 구제가 필요하면 아래 기관에 도움을 요청할 수 있어요.</p>
        <ul>
          <li>
            개인정보분쟁조정위원회: 1833-6972 ·{' '}
            <a href="https://www.kopico.go.kr" target="_blank" rel="noreferrer">
              kopico.go.kr
            </a>
          </li>
          <li>
            개인정보침해신고센터: 국번 없이 118 ·{' '}
            <a href="https://privacy.kisa.or.kr" target="_blank" rel="noreferrer">
              privacy.kisa.or.kr
            </a>
          </li>
          <li>대검찰청: 국번 없이 1301</li>
          <li>경찰청: 국번 없이 182</li>
        </ul>

        <h2>14. 바뀌면 알려 드려요</h2>
        <p>
          이 처리방침이 바뀌면 시행 7일 전부터 이 페이지와 업데이트 노트에 알려요. 받는 정보가
          늘어나는 것처럼 중요한 변경은 30일 전에 알려요.
        </p>
        <ul className="privacy-hist">
          <li>
            2026년 11월 23일 — 받는 정보·보관 기간·맡기는 곳·국외 이전·쿠키·권리를 자세히 적음
          </li>
          <li>2026년 11월 22일 — 처음 만듦 (구글 로그인 도입)</li>
        </ul>
      </section>
    </>
  )
}
