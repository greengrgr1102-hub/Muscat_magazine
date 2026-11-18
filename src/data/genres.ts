// 옵시디언 '학습/음악/장르' 노트에서 옮긴 장르 목록입니다.
// order가 작을수록 검색 화면에서 앞에 보입니다. 설명은 장르 페이지 상단에 나옵니다.
export const GENRES: { name: string; slug: string; description: string }[] = [
  {
    name: 'Shoegaze',
    slug: 'shoegaze',
    description:
      '슈게이징. 80년대 말~90년대 초 영국에서 나온, 디스토션·리버브를 겹겹이 쌓은 기타의 벽과 믹스 속에 묻힌 보컬의 록. 이름은 이펙터 페달을 내려다보는 모습에서 왔다.',
  },
  {
    name: 'Dream Pop',
    slug: 'dream-pop',
    description:
      '드림팝. 80년대 영국 4AD 계열에서 굳어진, 리버브 짙은 기타·신스와 숨결 같은 보컬로 분위기를 앞세운 팝. 슈게이징과 가깝지만 소음보다 멜로디와 공간에 무게가 있다.',
  },
  {
    name: 'Indie Rock',
    slug: 'indie-rock',
    description:
      '인디 록. 독립 레이블 기반이라는 뜻에서 출발해 지금은 소박한 편곡과 로파이 질감의 사운드를 가리키는 말로도 쓰인다.',
  },
  {
    name: 'Indie Pop',
    slug: 'indie-pop',
    description:
      '인디 팝. 80년대 영국 인디 씬(Postcard·C86·Sarah Records)에서 펑크의 DIY에 단순한 팝 멜로디를 얹으며 시작됐다. 순진한 쪽이 트위 팝, 노이즈를 얹은 쪽이 노이즈 팝.',
  },
  {
    name: 'Bedroom Pop',
    slug: 'bedroom-pop',
    description:
      '베드룸 팝. 집에서 만든 듯한 속삭이는 보컬과 로파이 질감, 미니멀한 편성의 인디 팝. 소리보다 제작 환경과 정체성으로 묶이는 이름이다.',
  },
  {
    name: 'Post-rock',
    slug: 'post-rock',
    description:
      '포스트록. 록 악기를 쓰되 리프·절/후렴·가사 같은 록의 문법을 벗어나 질감과 점진적인 빌드업으로 곡을 만드는 흐름.',
  },
  {
    name: 'Math Rock',
    slug: 'math-rock',
    description:
      '매스록. 프로그 록의 변박과 정교함에 80년대 말~90년대 인디·포스트하드코어의 거친 태도를 더한 갈래. "수학적"은 복잡한 리듬 구조를 뜻한다.',
  },
  {
    name: 'Emo',
    slug: 'emo',
    description:
      '이모. 80년대 DC 하드코어의 "감정을 드러내는 하드코어"에서 시작해 90년대 트위들링 기타의 미드웨스트 이모, 2000년대 대중화, 2010년대 리바이벌로 이어진 장르.',
  },
  {
    name: 'Post-punk',
    slug: 'post-punk',
    description:
      '포스트펑크·뉴웨이브. 펑크 직후(1978~84) DIY 정신은 가져가고 3코드 형식은 버린 실험 갈래. 같은 시기 펑크의 에너지를 팝에 담은 쪽이 뉴웨이브다.',
  },
  {
    name: 'Alternative Rock',
    slug: 'alternative-rock',
    description:
      '얼터너티브 록. 80년대 칼리지 라디오·인디 레이블의 "주류 밖 록"이 1991년 Nirvana 이후 주류가 된 우산 용어. 사운드보다 위치로 정의된다.',
  },
  {
    name: 'Britpop',
    slug: 'britpop',
    description:
      '브릿팝. 90년대 중반 미국 그런지에 대한 영국의 응답으로, 60년대 영국 팝과 영국적인 일상을 노래한 록.',
  },
  {
    name: 'Punk',
    slug: 'punk',
    description: '펑크. 70년대 중반에 나온 빠르고 짧고 거친 록. 3코드와 DIY 태도가 핵심이다.',
  },
  {
    name: 'Psychedelic Rock',
    slug: 'psychedelic-rock',
    description:
      '사이키델릭 록. 60년대 중반 환각 문화의 영향으로 에코, 긴 솔로, 인도풍 선율, 스튜디오 효과를 쓰던 록. 한국에서는 신중현 사단이 같은 시기 한국식 사이키를 만들었다.',
  },
  {
    name: 'Slowcore',
    slug: 'slowcore',
    description:
      '슬로코어·새드코어. 90년대 미국 인디에서 느린 템포, 성긴 악기, 낮은 목소리로 우울을 오래 늘이는 음악에 붙은 이름.',
  },
  {
    name: 'Surf Rock',
    slug: 'surf-rock',
    description:
      '서프록. 1960년대 초 남캘리포니아에서 Dick Dale이 스프링 리버브와 트레몰로 피킹으로 만든 "젖은" 기타 음악과 Beach Boys식 보컬 하모니 서프.',
  },
  {
    name: 'Noise',
    slug: 'noise',
    description:
      '노이즈·실험음악. 소음을 재료가 아니라 음악 자체로 다루는 흐름. 인더스트리얼에서 시작해 재패노이즈, 노이즈 록 등으로 번졌다.',
  },
  {
    name: 'Goth',
    slug: 'goth',
    description:
      '고스·다크웨이브. 포스트펑크의 차가운 신스와 가공된 기타를 어둡고 극적인 분위기로 밀어붙인 흐름.',
  },
  {
    name: 'Synth-pop',
    slug: 'synth-pop',
    description:
      '신스팝. 신시사이저·드럼머신·시퀀서를 곡의 중심 악기로 쓰는 팝. 70년대 말 Kraftwerk·YMO의 영향 아래 영국에서 폭발했다.',
  },
  {
    name: 'Art Pop',
    slug: 'art-pop',
    description:
      '아트팝. 팝의 형식을 쓰되 미술·패션·영화 같은 다른 예술의 발상으로 만든 팝. 사운드보다 태도와 콘셉트로 정의된다.',
  },
  {
    name: 'Hyperpop',
    slug: 'hyperpop',
    description:
      '하이퍼팝. 팝의 달콤함·후크·반짝임을 과장하고 왜곡하고 해체한 일렉트로닉 팝. PC Music에서 미학이 만들어지고 100 gecs와 스트리밍 플레이리스트로 이름이 굳었다.',
  },
  {
    name: 'Digicore',
    slug: 'digicore',
    description:
      '디지코어. 2010년대 후반 Discord·SoundCloud에서 모인 10대 음악가들의 인터넷 태생 마이크로장르. 오토튠 보컬, 808·트랩 비트, 글리치한 편집이 특징이다.',
  },
  {
    name: 'City Pop',
    slug: 'city-pop',
    description:
      '시티팝. 70년대 중반~80년대 일본에서 AOR·퓨전 재즈·펑크·디스코를 일본어 팝으로 소화한 도회적인 팝. 2010년대 유튜브로 세계에 재발견됐다.',
  },
  {
    name: 'Shibuya-kei',
    slug: 'shibuya-kei',
    description:
      '시부야케이. 90년대 초 도쿄 시부야의 수입 음반점 문화에서 자란 "음악 덕후들의 팝". 장르라기보다 인용과 콜라주라는 태도에 가깝다.',
  },
  {
    name: 'Shimokita-kei',
    slug: 'shimokita-kei',
    description:
      '시모키타케이. 도쿄 시모키타자와의 라이브하우스 무대에서 자라 전국구가 된 기타 록 밴드를 가리키는 말. 사운드보다 출신 표시에 가깝다.',
  },
  {
    name: 'J-rock',
    slug: 'j-rock',
    description:
      'J-록·비주얼계. 80년대 일본 언더그라운드에서 글램·펑크·메탈·고딕의 영향 아래 화려한 외모와 무대 연출까지 음악의 일부로 삼은 흐름.',
  },
  {
    name: 'Future Funk',
    slug: 'future-funk',
    description:
      '퓨처 펑크. 70~80년대 디스코·펑크·시티팝 샘플을 잘라 붙이고 4/4 킥과 사이드체인으로 춤추게 만든 인터넷 태생 장르.',
  },
  {
    name: 'Yé-yé',
    slug: 'ye-ye',
    description: '예예. 1960년대 초 프랑스를 중심으로 퍼진 경쾌한 팝. 젊은 여성 가수가 중심이었고 시부야케이에 영향을 줬다.',
  },
  {
    name: 'Folk',
    slug: 'folk',
    description:
      '포크. 구전 민요를 다시 발견해 지금의 노래로 만든 흐름. 한국에서는 60년대 말 통기타 문화에서 70년대 창작·저항 포크로 이어졌다.',
  },
  {
    name: 'Indie Folk',
    slug: 'indie-folk',
    description:
      '인디 포크. 2000년대 초 프리크 포크가 60~70년대 사이키 포크를 되살린 뒤, 더 매끄러운 형태로 대중화된 포크.',
  },
  {
    name: 'Country',
    slug: 'country',
    description: '컨트리. 애팔래치아 포크·가스펠·블루스에서 나온 미국 남부의 대중음악.',
  },
  {
    name: 'R&B',
    slug: 'r-and-b',
    description:
      'R&B·네오소울. 70년대 소울의 질감을 되살리고 재즈·힙합을 섞은 네오소울, 그리고 더 실험적인 얼터너티브 R&B까지.',
  },
  {
    name: 'Hip-hop',
    slug: 'hip-hop',
    description: '힙합. 펑크·소울 샘플과 디제잉, 랩에서 시작해 붐뱁·트랩·드릴·로파이로 갈라진 음악.',
  },
  {
    name: 'Trap',
    slug: 'trap',
    description:
      '트랩·드릴. 2000년대 애틀랜타에서 808 베이스와 빠른 하이햇으로 굳어진 힙합 갈래. 드릴은 2010년대 초 시카고에서 더 어둡게 갈라져 나왔다.',
  },
  {
    name: 'Trip Hop',
    slug: 'trip-hop',
    description:
      '트립합. 90년대 브리스톨에서 나온, 느린 힙합 비트에 소울·재즈 샘플과 영화적인 분위기를 입힌 음악.',
  },
  {
    name: 'Electronic',
    slug: 'electronic',
    description: '일렉트로닉. 하우스·테크노·트랜스·드럼앤베이스·덥스텝·IDM·앰비언트를 아우르는 전자음악.',
  },
  {
    name: 'Ambient',
    slug: 'ambient',
    description:
      '앰비언트. 듣는 사람에게 집중을 강요하지 않는 음악. 1978년 Brian Eno의 Music for Airports가 이름과 철학을 붙였다.',
  },
  {
    name: 'House',
    slug: 'house',
    description:
      '하우스·테크노. 디스코 이후 시카고 클럽에서 나온 하우스와 디트로이트에서 나온 테크노. 오늘날 클럽·페스티벌 문화의 뿌리다.',
  },
  {
    name: 'Drum & Bass',
    slug: 'drum-and-bass',
    description:
      '드럼앤베이스·정글. 90년대 초 영국 레이브에서 갈라져 나온, 잘게 썬 브레이크비트와 덥식 서브 베이스의 음악.',
  },
  {
    name: 'UK Garage',
    slug: 'uk-garage',
    description: 'UK 개러지. 90년대 영국에서 하우스를 엇박의 투스텝 리듬으로 바꾼 클럽 음악.',
  },
  {
    name: 'Jazz',
    slug: 'jazz',
    description:
      '재즈. 스탠더드의 멜로디를 연주한 뒤 같은 코드 위에서 차례로 즉흥하는 틀의 음악. 스윙·비밥·쿨·모달·프리·퓨전으로 이어진다.',
  },
  {
    name: 'Bossa Nova',
    slug: 'bossa-nova',
    description:
      '보사노바·MPB. 삼바에 쿨 재즈의 화성을 섞은 속삭이는 브라질 음악. 이후 MPB와 트로피칼리아로 이어졌다.',
  },
  {
    name: 'Reggae',
    slug: 'reggae',
    description:
      '레게·덥·스카. 자메이카 사운드시스템 문화에서 스카→록스테디→레게로 진화했고, 베이스와 이펙트를 키운 덥이 리믹스 문화를 열었다.',
  },
  {
    name: 'Reggaeton',
    slug: 'reggaeton',
    description: '레게톤. 자메이카 댄스홀의 뎀보우 리듬 위에 스페인어 랩과 노래를 얹은 카리브 도시 음악.',
  },
  {
    name: 'Afrobeats',
    slug: 'afrobeats',
    description:
      '아프로비츠·아마피아노. 2000년대 이후 나이지리아·가나 중심의 팝과 2010년대 남아공 하우스 갈래. Fela Kuti의 아프로비트와는 계보가 다르다.',
  },
  {
    name: 'Metal',
    slug: 'metal',
    description: '메탈·하드코어. 하드록에서 나온 헤비메탈과 스래시·데스·블랙·둠, 그리고 하드코어 펑크와 메탈코어.',
  },
]
