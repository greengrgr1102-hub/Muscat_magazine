/**
 * 화면 확인용 샘플 데이터를 넣습니다. (로컬 개발용)
 * 실행: npm run seed
 * 이미 데이터가 있으면 아무것도 하지 않습니다. 다시 넣으려면 SEED_FORCE=1 npm run seed
 */
import { getPayload } from 'payload'
import config from '@payload-config'

const p = (text: string) => ({
  type: 'paragraph',
  version: 1,
  direction: 'ltr' as const,
  format: '' as const,
  indent: 0,
  textFormat: 0,
  textStyle: '',
  children: [{ type: 'text', version: 1, text, format: 0, style: '', mode: 'normal' as const, detail: 0 }],
})
const rt = (...paras: string[]) => ({
  root: { type: 'root', version: 1, direction: 'ltr' as const, format: '' as const, indent: 0, children: paras.map(p) },
})

const payload = await getPayload({ config })
const force = process.env.SEED_FORCE === '1'
const existing = await payload.count({ collection: 'articles' })
if (existing.totalDocs && !force) {
  payload.logger.info('이미 데이터가 있어 샘플을 넣지 않았습니다. (SEED_FORCE=1 로 강제 실행)')
  process.exit(0)
}
if (force) {
  for (const c of ['articles', 'artists', 'genres'] as const) {
    await payload.delete({ collection: c, where: { id: { exists: true } } })
  }
}

// 관리자 계정 (로컬 전용)
const users = await payload.count({ collection: 'users' })
let userId: number | undefined
if (!users.totalDocs) {
  const u = await payload.create({
    collection: 'users',
    data: { email: 'editor@muscat.local', password: 'muscat1234', name: 'Muscat Editor' },
  })
  userId = u.id
} else {
  userId = (await payload.find({ collection: 'users', limit: 1 })).docs[0]?.id
}

const GENRES = ['Shoegaze', 'Dream Pop', 'Indie Rock', 'Indie Pop', 'Post-Punk', 'Electronic', 'Folk', 'R&B', 'Hip-Hop']
const genre: Record<string, number> = {}
for (const [i, name] of GENRES.entries()) {
  const g = await payload.create({ collection: 'genres', data: { name, order: i } })
  genre[name] = g.id
}

const artistDefs = [
  ['Artist Name A', ['Shoegaze', 'Dream Pop'], 'City, Country', '2019 –'],
  ['Artist Name B', ['Shoegaze', 'Indie Rock'], 'Seoul, Korea', '2021 –'],
  ['Artist Name C', ['Indie Pop', 'Folk'], 'Busan, Korea', '2017 –'],
  ['Artist Name D', ['Post-Punk', 'Indie Rock'], 'Tokyo, Japan', '2020 –'],
] as const
const artist: Record<string, number> = {}
for (const [name, gs, basedIn, active] of artistDefs) {
  const a = await payload.create({
    collection: 'artists',
    data: {
      name,
      genres: gs.map((g) => genre[g]),
      basedIn,
      active,
      noteHeadline: '겹겹이 쌓은 기타 노이즈 아래로\n또렷한 멜로디가 지나가는 밴드.',
      note: rt(
        '첫 곡부터 소리의 질감이 분명합니다. 노이즈를 두껍게 쌓으면서도 멜로디는 흐려지지 않고, 리듬은 한 발 뒤에서 공간을 넓힙니다.',
        '처음 듣는다면 가장 최근 앨범의 첫 트랙부터 권합니다. 이 밴드가 소리를 다루는 방식이 한 곡 안에 다 들어 있습니다.',
      ),
      links: [
        { service: 'melon', url: 'https://www.melon.com' },
        { service: 'spotify', url: 'https://open.spotify.com' },
        { service: 'youtube', url: 'https://www.youtube.com' },
      ],
    },
  })
  artist[name] = a.id
}

const day = (d: string) => new Date(`${d}T10:00:00+09:00`).toISOString()
const base = { _status: 'published' as const, author: userId }

const review = (title: string, date: string, artists: string[], gs: string[], featured = false) => ({
  ...base,
  title,
  type: 'review' as const,
  publishedAt: day(date),
  featured,
  readingTime: 4,
  excerpt: '한 주 동안 에디터의 귀에 남은 앨범 세 장을 사운드 중심으로 기록했습니다.',
  artists: artists.map((a) => artist[a]),
  genres: gs.map((g) => genre[g]),
  tags: ['앨범리뷰', '인디', '주간리뷰'],
  intro: rt('한 주 동안 가장 오래 귀에 남은 앨범 세 장을 골랐습니다. 기준은 늘 같습니다. 처음 듣는 순간 소리가 신선한가, 그리고 다시 틀고 싶어지는가.'),
  albums: [
    {
      albumTitle: 'Album Title',
      artistName: artists[0],
      body: rt('첫 트랙의 기타 톤에서 이미 방향이 정해집니다. 겹겹이 쌓은 노이즈 아래로 멜로디가 또렷하게 지나가고, 드럼은 한 발 뒤에서 공간을 넓힙니다. 익숙한 장르 문법 안에서도 소리의 배치만으로 새롭게 들리는 앨범입니다.'),
      listen: [
        { service: 'melon', url: 'https://www.melon.com' },
        { service: 'spotify', url: 'https://open.spotify.com' },
        { service: 'youtube', url: 'https://www.youtube.com' },
      ],
    },
    {
      albumTitle: 'Album Title',
      artistName: 'Artist Name',
      body: rt('신시사이저와 어쿠스틱 악기가 같은 무게로 놓여 있습니다. 어느 한쪽이 배경으로 밀려나지 않아서, 들을 때마다 귀가 머무는 자리가 달라집니다.'),
      listen: [{ service: 'melon', url: 'https://www.melon.com' }],
    },
  ],
  editorsPick: [
    { trackTitle: 'Track Title', artistName: 'Artist Name' },
    { trackTitle: 'Track Title', artistName: 'Artist Name' },
    { trackTitle: 'Track Title', artistName: 'Artist Name' },
  ],
})

const interview = (title: string, date: string, a: string, gs: string[]) => ({
  ...base,
  title,
  type: 'interview' as const,
  publishedAt: day(date),
  readingTime: 9,
  excerpt: `${a}을 만나 새 앨범의 작업 방식과 사운드에 대해 물었습니다.`,
  artists: [artist[a]],
  genres: gs.map((g) => genre[g]),
  intro: rt(`새 앨범 발매를 앞둔 ${a}을 작업실에서 만났습니다. 곡보다 소리를 먼저 만든다는 이들의 작업 방식을 차례로 물었습니다.`),
  qa: [
    {
      background: '새 앨범은 첫 트랙부터 기타가 세 겹으로 겹쳐 들립니다. 이전 작업보다 소리의 층이 분명히 두꺼워졌습니다.',
      question: '이번 앨범에서 소리를 쌓는 방식이 달라진 계기가 있었나요?',
      answer: rt('곡을 쓰기 전에 톤부터 만들었어요. 기타 소리가 마음에 들 때까지 몇 주를 보내고, 그다음에야 멜로디를 얹었습니다.'),
    },
    {
      question: '녹음 과정에서 가장 오래 붙잡고 있던 곡은 무엇인가요?',
      answer: rt('세 번째 트랙이요. 드럼을 한 발 뒤로 빼는 데만 열 번 넘게 다시 믹스했어요.'),
      pullQuote: '“소리를 먼저 쌓고,\n노래는 그 안에서 찾아요”',
    },
    {
      background: '공연에서는 음원보다 훨씬 거칠게 들린다는 이야기가 많습니다.',
      question: '라이브와 음원의 소리를 일부러 다르게 가져가나요?',
      answer: rt('네, 공연장은 공간도 악기라고 생각해요. 같은 곡이어도 그날의 소리로 다시 만듭니다.'),
    },
  ],
  listen: [
    { service: 'melon', url: 'https://www.melon.com' },
    { service: 'spotify', url: 'https://open.spotify.com' },
    { service: 'youtube', url: 'https://www.youtube.com' },
  ],
})

const notes = ['첫 곡은 기타 톤이 맑은 곡으로 엽니다.', '리듬이 가볍게 걸어가는 곡.', '후렴에서 소리가 한꺼번에 넓어집니다.', '베이스 라인이 귀에 남는 곡.', '조용히 시작해 크게 끝납니다.', '코러스 화음이 따뜻합니다.', '기타 리프 하나로 끝까지 갑니다.', '마지막은 느린 곡으로 닫습니다.']
const times = ['3:42', '4:05', '3:18', '4:31', '5:02', '3:27', '3:55', '4:12']
const playlist = (title: string, date: string, gs: string[], artists: string[] = []) => ({
  ...base,
  title,
  type: 'playlist' as const,
  publishedAt: day(date),
  excerpt: '해가 일찍 지는 계절에 어울리는 기타 팝 여덟 곡을 골랐습니다.',
  artists: artists.map((a) => artist[a]),
  genres: gs.map((g) => genre[g]),
  intro: rt('저녁이 길어지면 손이 가는 음악도 달라집니다. 맑은 기타 톤으로 시작해 느린 곡으로 닫히도록 순서를 짰습니다. 순서대로 들어 보세요.'),
  tracks: notes.map((note, i) => ({
    trackTitle: 'Track Title',
    artistName: 'Artist Name',
    note,
    duration: times[i],
    url: 'https://open.spotify.com',
  })),
  listen: [
    { service: 'melon', url: 'https://www.melon.com' },
    { service: 'spotify', url: 'https://open.spotify.com' },
    { service: 'youtube', url: 'https://www.youtube.com' },
  ],
})

const release = (title: string, date: string) => ({
  ...base,
  title,
  type: 'release' as const,
  publishedAt: day(date),
  excerpt: '이번 주에 나온 새 음악을 한 번에 정리했습니다.',
  genres: [genre['Indie Rock']],
  releases: [
    { releaseTitle: 'Album Title', artistName: 'Artist Name A', kind: 'album' as const, date: day('2026-11-10'), note: '2년 만의 정규 앨범.', url: 'https://www.melon.com' },
    { releaseTitle: 'EP Title', artistName: 'Artist Name B', kind: 'ep' as const, date: day('2026-11-12'), note: '기타 중심의 다섯 곡을 담은 EP.', url: 'https://www.melon.com' },
    { releaseTitle: 'Live Album Title', artistName: 'Artist Name C', kind: 'live' as const, date: day('2026-11-13'), note: '라이브 세션을 그대로 녹음한 앨범.' },
    { releaseTitle: 'Single Title', artistName: 'Artist Name D', kind: 'single' as const, date: day('2026-11-09'), note: '다음 달 EP에 앞서 공개한 선공개 곡.', url: 'https://www.melon.com' },
    { releaseTitle: 'Single Title', artistName: 'Artist Name A', kind: 'single' as const, date: day('2026-11-11'), note: '리믹스 버전이 함께 실렸습니다.' },
  ],
})

const docs = [
  review('지난주 에디터가 들은 앨범은? 11월 2주차', '2026-11-16', ['Artist Name A'], ['Shoegaze', 'Dream Pop'], true),
  playlist('이번 주 플레이리스트: 초겨울 밤의 기타 팝', '2026-11-14', ['Indie Pop', 'Indie Rock'], ['Artist Name C']),
  interview('Artist Name A 인터뷰: 소리를 먼저 쌓는 사람들', '2026-11-10', 'Artist Name A', ['Shoegaze']),
  release('11월 2주차 발매 소식', '2026-11-09'),
  review('지난주 에디터가 들은 앨범은? 11월 1주차', '2026-11-09', ['Artist Name B'], ['Shoegaze', 'Indie Rock']),
  playlist('처음 듣는 사람을 위한 슈게이징 입문 5곡', '2026-11-07', ['Shoegaze'], ['Artist Name A', 'Artist Name B']),
  interview('Artist Name D 인터뷰: 공간도 악기라고 생각해요', '2026-11-03', 'Artist Name D', ['Post-Punk']),
  release('11월 1주차 발매 소식', '2026-11-02'),
  review('지난주 에디터가 들은 앨범은? 10월 5주차', '2026-11-02', ['Artist Name A', 'Artist Name C'], ['Dream Pop', 'Folk']),
  playlist('Artist Name A 입문곡 5', '2026-10-24', ['Shoegaze'], ['Artist Name A']),
]
for (const d of docs) {
  await payload.create({ collection: 'articles', data: d as never, draft: false })
}

await payload.updateGlobal({
  slug: 'about-page',
  data: {
    approach: [
      { text: '우리가 음악을 고르는 기준은 사운드입니다. 소리의 구성에서 오는 신선함과 만족감, 그 한 가지를 가장 먼저 듣습니다.' },
      { text: '좋은 음악만 소개합니다. 낯선 아티스트의 이름 앞에서도 한 번 재생해 보고 싶어지도록, 듣는 사람의 자리에서 씁니다.' },
    ],
    coverage: [
      { title: 'Album Review', description: '사운드를 중심으로 앨범을 듣고 기록합니다.', type: 'review' },
      { title: 'Curation', description: '지금 들어야 할 곡을 골라 플레이리스트로 건넵니다.', type: 'playlist' },
      { title: 'Interview', description: '음악을 만든 사람에게 직접 묻습니다.', type: 'interview' },
      { title: 'Release', description: '이번 주에 나온 새 음악을 정리합니다.', type: 'release' },
    ],
    principles: [
      { title: '판매가 목적이\n되지 않게 합니다.', description: '무언가를 파는 방식은 수단일 뿐입니다.\n목적은 언제나 음악을 듣게 하는 것입니다.' },
      { title: '아티스트를\n깎아내리지 않습니다.', description: '좋은 음악만 다룹니다.\n부정적인 판정을 내리는 글은 쓰지 않습니다.' },
      { title: '왜곡하지\n않습니다.', description: '들은 그대로, 확인한 그대로 씁니다.\n사실과 다르게 포장하지 않습니다.' },
    ],
  },
})

payload.logger.info(`샘플 데이터 완료: 장르 ${GENRES.length}, 아티스트 ${artistDefs.length}, 아티클 ${docs.length}`)
process.exit(0)
