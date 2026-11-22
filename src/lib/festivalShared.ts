// 서버·브라우저가 같이 쓰는 페스티벌 통계 모양 (server-only 없이)
export type FestStats = {
  fests: number
  teams: number
  multi: number
  heard: number
  sync: { id: number; short: string; heard: number; total: number }[]
  genres: { id: number; short: string; n: number; mix: { cat: string; n: number }[] }[]
  pairs: { a: string; b: string; n: number }[]
  often: { name: string; n: number; heard: boolean; fests: string[] }[]
}

export const FEST_CATS = ['록', '팝', 'R&B·소울', '힙합', '일렉트로닉', '재즈', '포크'] as const
