import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

// About 페이지 기본 내용(매거진 소개·에디터 소개)을 한 번 채워요.
// 이미 관리자 화면에서 채운 칸은 건드리지 않아요. 이후 수정은 관리자 → About 페이지에서.
export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const cur = await payload.findGlobal({ slug: 'about-page', depth: 0, req })
  const data: Record<string, unknown> = {}
  if (!cur.approach?.length) {
    data.approach = [
      { text: '좋은 것만 다룹니다. 사운드에서 오는 신선함과 만족감, 그 한 가지 기준으로 고르고 고른 이유를 씁니다.' },
      {
        text: '새로운 음악은 누군가 건네주지 않으면 잘 듣게 되지 않습니다. 머스캣은 그 건네주는 일을 합니다. 음악을 가볍게 듣는 사람도 저장해 두고 싶은 한 곡을 만나도록요.',
      },
    ]
  }
  if (!cur.coverage?.length) {
    data.coverage = [
      { title: 'Album Review', description: '사운드를 중심으로 앨범을 듣고 기록합니다.', type: 'review' },
      { title: 'Curation', description: '지금 들어야 할 곡을 골라 플레이리스트로 건넵니다.', type: 'playlist' },
      { title: 'Interview', description: '음악을 만든 사람에게 직접 묻습니다. 한국을 넘어 아시아의 아티스트까지.', type: 'interview' },
      { title: 'Release', description: '새로 나온 음악 소식을 정리합니다.', type: 'release' },
    ]
  }
  if (!cur.principles?.length) {
    data.principles = [
      { title: '아티스트를 깎아내리지 않습니다.', description: '좋은 것만 다루고, 부정적인 판정은 하지 않습니다.' },
      { title: '왜곡하지 않습니다.', description: '들은 그대로, 사실 그대로 씁니다.' },
      { title: '파는 것이 목적이 되지 않습니다.', description: '목적은 음악을 듣게 하는 것입니다.' },
    ]
  }
  if (!cur.editors?.length) {
    data.editors = [
      {
        name: '서문근희',
        role: '발행인 · 에디터',
        bio: '반복해서 듣기보다 새로 나온 앨범을 찾아 통째로 듣는 편입니다. Editor\'s Picks에는 제가 들은 노래를 하나도 빼지 않고 모아 두었습니다.',
        links: [{ label: 'Instagram', url: 'https://www.instagram.com/muscat_mag/' }],
      },
    ]
  }
  if (Object.keys(data).length) await payload.updateGlobal({ slug: 'about-page', data, req })
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // 내용을 되돌리지 않아요 (관리자 화면에서 직접 고치세요).
}
