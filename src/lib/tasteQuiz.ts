// 취향 찾기 질문.
// 방문자는 장르 이름을 몰라도 돼요: 보기마다 들어볼 수 있는 샘플 곡이 붙고,
// 고른 보기는 안에서 장르 점수로 바뀌어요.

export type Era = '2020s' | '2010s' | 'old' | 'any'

export type QuizOption = {
  id: string
  label: string
  hint: string
  /** 장르 slug → 점수 */
  w?: Record<string, number>
  era?: Era
}
export type QuizQuestion = { id: string; title: string; lead: string; samples: boolean; options: QuizOption[] }

export const QUIZ: QuizQuestion[] = [
  {
    id: 'when',
    title: '음악은 주로 언제 들어요?',
    lead: '보기마다 곡이 하나씩 붙어 있어요. 들어 보고 마음 가는 쪽을 골라 주세요.',
    samples: true,
    options: [
      { id: 'night', label: '새벽, 혼자 있을 때', hint: '조용하고 흐릿한 소리', w: { 'dream-pop': 2, slowcore: 2, ambient: 2, 'bedroom-pop': 1, shoegaze: 1 } },
      { id: 'walk', label: '걷거나 어디 갈 때', hint: '가볍게 발걸음이 맞는 곡', w: { 'indie-pop': 2, 'city-pop': 2, 'shibuya-kei': 1, 'indie-rock': 1, 'bossa-nova': 1 } },
      { id: 'up', label: '기분을 끌어올리고 싶을 때', hint: '볼륨을 올리고 싶은 곡', w: { 'indie-rock': 2, punk: 2, 'alternative-rock': 1, hyperpop: 1, house: 1, 'future-funk': 1 } },
      { id: 'rain', label: '비 오는 날, 생각이 많을 때', hint: '천천히 스며드는 곡', w: { 'indie-folk': 2, folk: 2, slowcore: 1, 'post-rock': 1, jazz: 1 } },
    ],
  },
  {
    id: 'sound',
    title: '어떤 소리에 더 끌려요?',
    lead: '악기나 소리의 결로 골라 주세요.',
    samples: true,
    options: [
      { id: 'guitar', label: '겹겹이 쌓인 기타', hint: '벽처럼 밀려오는 소리', w: { shoegaze: 3, 'post-rock': 2, noise: 1, 'alternative-rock': 1 } },
      { id: 'synth', label: '반짝이는 신스·전자음', hint: '차갑거나 반짝이는 소리', w: { 'synth-pop': 2, electronic: 2, hyperpop: 1, digicore: 1, 'future-funk': 1, house: 1 } },
      { id: 'acoustic', label: '통기타와 맨목소리', hint: '가까이서 부르는 느낌', w: { 'indie-folk': 3, folk: 2, country: 1, 'bedroom-pop': 1 } },
      { id: 'groove', label: '몸이 움직이는 그루브', hint: '리듬이 먼저 들리는 곡', w: { 'r-and-b': 2, 'hip-hop': 2, 'city-pop': 1, 'trip-hop': 1, jazz: 1, afrobeats: 1 } },
    ],
  },
  {
    id: 'temp',
    title: '노래의 온도는 어느 쪽이 좋아요?',
    lead: '같은 장르여도 온도가 달라요.',
    samples: true,
    options: [
      { id: 'hazy', label: '몽글몽글, 흐릿하게', hint: '꿈속처럼 번지는', w: { 'dream-pop': 3, shoegaze: 1, 'bedroom-pop': 1, ambient: 1 } },
      { id: 'bright', label: '쨍하고 경쾌하게', hint: '맑고 빠르게 달리는', w: { 'indie-pop': 2, 'shimokita-kei': 2, 'j-rock': 1, 'math-rock': 1, 'surf-rock': 1, britpop: 1 } },
      { id: 'cold', label: '서늘하고 어둡게', hint: '그늘진 쪽의 소리', w: { 'post-punk': 2, goth: 2, 'trip-hop': 1, slowcore: 1, noise: 1 } },
      { id: 'raw', label: '거칠고 날것 그대로', hint: '소리 지르듯 터지는', w: { punk: 2, emo: 2, noise: 1, metal: 1, 'alternative-rock': 1 } },
    ],
  },
  {
    id: 'era',
    title: '언제 나온 음악이 좋아요?',
    lead: '마지막 질문이에요.',
    samples: false,
    options: [
      { id: '2020s', label: '요즘 나온 곡', hint: '2020년대', era: '2020s' },
      { id: '2010s', label: '조금 지난 곡', hint: '2010년대', era: '2010s' },
      { id: 'old', label: '오래된 곡', hint: '2000년대 이전', era: 'old' },
      { id: 'any', label: '상관없어요', hint: '시대는 안 따져요', era: 'any' },
    ],
  },
]

/** 답(질문 id → 보기 id)을 장르 점수와 시대로 바꿔요. */
export function scoreAnswers(answers: Record<string, string>) {
  const w: Record<string, number> = {}
  let era: Era = 'any'
  for (const q of QUIZ) {
    const o = q.options.find((x) => x.id === answers[q.id])
    if (!o) continue
    for (const [g, n] of Object.entries(o.w || {})) w[g] = (w[g] || 0) + n
    if (o.era) era = o.era
  }
  return { w, era }
}

export const encodeW = (w: Record<string, number>) =>
  Object.entries(w)
    .map(([g, n]) => `${g}:${n}`)
    .join(',')

export function decodeW(s: string | null): Record<string, number> {
  const out: Record<string, number> = {}
  for (const part of (s || '').split(',')) {
    const [g, n] = part.split(':')
    const v = Number(n)
    if (g && /^[a-z0-9-]+$/.test(g) && v > 0 && v < 50) out[g] = v
  }
  return out
}

export function eraOk(era: Era, release?: string | null) {
  if (era === 'any') return true
  const y = Number((release || '').slice(0, 4))
  if (!(y > 1900)) return false
  if (era === '2020s') return y >= 2020
  if (era === '2010s') return y >= 2010 && y < 2020
  return y < 2010
}
