import type { GlobalConfig } from 'payload'

// Spotify 플레이리스트 → Editor's Picks 자동 연동 설정.
// 로그인한 관리자만 읽고 쓸 수 있습니다. 연결과 동기화는 사이트의 /spotify 화면에서 해요.
export const SpotifySync: GlobalConfig = {
  slug: 'spotify-sync',
  label: 'Spotify 연동',
  admin: {
    group: '설정',
    description: '연결·동기화는 사이트 주소 뒤에 /spotify 를 붙인 화면에서 할 수 있어요.',
  },
  access: { read: ({ req }) => Boolean(req.user), update: ({ req }) => Boolean(req.user) },
  fields: [
    {
      name: 'playlistUrl',
      label: '연동할 플레이리스트',
      type: 'text',
      admin: { description: '내 Spotify 플레이리스트 링크 (공유 → 링크 복사)' },
    },
    { name: 'connectedAs', label: '연결된 Spotify 계정', type: 'text', admin: { readOnly: true } },
    { name: 'lastSyncedAt', label: '마지막 동기화', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'lastResult', label: '마지막 결과', type: 'text', admin: { readOnly: true } },
    // 화면에 보이지 않는 연결 정보
    { name: 'refreshToken', type: 'text', admin: { hidden: true } },
    // 지난번에 끝까지 확인한 플레이리스트 곡 수 — 다음엔 그 뒤쪽(새로 추가된 곡)만 읽어요.
    { name: 'scannedCount', type: 'number', admin: { hidden: true } },
    // 한국어 이름 맞추기: 어디까지 했는지와 지금까지 바꾼 곡 수
    { name: 'renameOffset', type: 'number', admin: { hidden: true } },
    { name: 'renameChanged', type: 'number', admin: { hidden: true } },
  ],
}
