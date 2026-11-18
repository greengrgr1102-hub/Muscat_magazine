import { headers } from 'next/headers'
import { getClient } from './data'

// 관리자 로그인 확인 (Spotify 연결처럼 다른 사이트에서 돌아오는 화면용)
// 브라우저가 붙이는 Origin·Sec-Fetch-Site 때문에 로그인이 안 된 것처럼 보이는 문제를 피하려고
// 로그인 쿠키만 넘겨서 확인합니다. 쓰기 작업의 위조 방지는 각 화면에서 따로 합니다
// (Spotify 연결은 state 값, 폼 제출은 Next 서버 액션의 출처 확인).
export async function currentAdmin() {
  const h = await headers()
  const payload = await getClient()
  const only = new Headers({ cookie: h.get('cookie') || '', 'sec-fetch-site': 'same-origin' })
  const { user } = await payload.auth({ headers: only })
  return { payload, user }
}
