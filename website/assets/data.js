/* ============== Mock data ==============
 * 실제 운영 시 PostgreSQL/VectorDB에서 들어올 데이터의 형태를
 * 그대로 흉내낸 정적 모킹 레이어입니다.
 */
window.DD_DATA = (function () {
  // -- 회원 (Users) --
  // isAdmin: true 인 회원이 콘텐츠를 추가/수정/삭제할 수 있어요.
  const seedMembers = [
    { id: 'oej', name: '오은진', role: '회장 · 운영진', isAdmin: true },
    { id: 'ymsn', name: '양미선', role: '운영진' },
    { id: 'lsjn', name: '이산지나', role: '운영진' },
    { id: 'kga', name: '고경애', role: '운영진' },
    { id: 'les', name: '이은숙', role: '운영진' },
    { id: 'hns', name: '홍남선', role: '운영진' },
    { id: 'lem', name: '이은미', role: '운영진' },
    { id: 'ksa', name: '김산아', role: '운영진' },
  ];

  // -- 회원가입용 코드 (데모) --
  const SIGNUP_CODE = 'dijeok2026';

  // -- 일정 (Events) --
  // YYYY-MM-DD 형식. type: meet(정기) / camp(캠프) / board(운영진)
  const seedEvents = [
    {
      id: 'ev-2026-05-09',
      title: '5월 산아 책방 모임 (회장 선출)',
      date: '2026-05-09',
      time: '11:00 ~ 14:00',
      where: '산아 책방',
      type: 'meet',
      desc: '브런치 모임 · 차기 회장 제비뽑기 · 1인 1역할 분담 검토.',
    },
    {
      id: 'ev-2026-05-26',
      title: '5월 운영진 회의 (온라인)',
      date: '2026-05-26',
      time: '21:00 ~ 22:30',
      where: '구글 Meet',
      type: 'board',
      desc: '여름 캠프 계획 수립, 회비·캠프비 최종 결정.',
    },
    {
      id: 'ev-2026-06-13',
      title: '6월 정기모임',
      date: '2026-06-13',
      time: '13:30 ~ 20:00',
      where: '마하어린이도서관',
      type: 'meet',
      desc: '수학이랑 놀자 · 공동체 놀이 · 아이들 모여라 · 어른 공부 모임.',
    },
    {
      id: 'ev-2026-07-25',
      title: '7월 정기모임',
      date: '2026-07-25',
      time: '13:30 ~ 20:00',
      where: '마하어린이도서관',
      type: 'meet',
      desc: '곱하기 규칙 찾기 · Mixboard 작품 발표 · 어른 공부.',
    },
    {
      id: 'ev-2026-08-08',
      title: '여름 캠프 (1박 2일)',
      date: '2026-08-08',
      endDate: '2026-08-09',
      time: '08.08 ~ 08.09',
      where: '미정 (5월 회의에서 확정)',
      type: 'camp',
      desc: '여름 캠프 일정 · 캠프비 4만 원 (현행 유지 검토).',
    },
  ];

  // -- 출석 상태 (Attendances) --
  // key: eventId -> { memberId: 'going' | 'no' | 'maybe' }
  const seedRsvp = {
    'ev-2026-05-09': { oej: 'going', ymsn: 'going', lsjn: 'going', kga: 'going', les: 'going', hns: 'maybe' },
    'ev-2026-05-26': { oej: 'going', ymsn: 'going', lsjn: 'maybe', kga: 'going' },
    'ev-2026-06-13': { oej: 'going', ymsn: 'going', lsjn: 'going', kga: 'going', les: 'going', hns: 'going', lem: 'maybe', ksa: 'going' },
    'ev-2026-07-25': { oej: 'going', kga: 'going', les: 'maybe' },
    'ev-2026-08-08': { oej: 'going', ymsn: 'going', lsjn: 'going', kga: 'going', les: 'going', hns: 'going', lem: 'going', ksa: 'going' },
  };

  // -- 아카이브 (회의록 + 밴드글) --
  // tone: formal(개조식) / friendly(대화체)
  const seedArchive = [
    {
      id: 'doc-2025-12-11',
      date: '2025-12-11',
      title: '겨울 캠프 기획안 검토 회의',
      summary: '이은숙 선생님이 수정한 양식 검토 — 개발자 이름, 주요 사용자, 문제 정의, 핵심 기능 3가지 포함. 캠프 슬로건 후보 “Show Me The App” 제안.',
      tags: ['회의록', '겨울캠프', 'AI리터러시'],
      tone: 'formal',
    },
    {
      id: 'doc-2025-11-25',
      date: '2025-11-25',
      title: '온라인 모임 후기 — 나노 바나나 프로 체험',
      summary: '3D 이미지 생성이 정교했고, 한글 텍스트가 깨지지 않고 정확하게 들어가는 점에 모두 놀랐어요. Mixboard와 비교하며 활용 시나리오도 이야기 나눴어요.',
      tags: ['후기', 'AI리터러시', '밴드글'],
      tone: 'friendly',
    },
    {
      id: 'doc-2026-04-19',
      date: '2026-04-19',
      title: '4월 정기모임 — 수학자 / Google Vids',
      summary: '한글 암호 풀이로 시작 → 일본 고등 입시 1번 문제 모두 풀이. 공동체 놀이는 지하정원 그림책 + 디비디비딥. 아이들 모여라에서 Google Vids로 영상 만들기.',
      tags: ['후기', '정기모임_스케치', '수학이랑놀자', 'AI리터러시', '공동체놀이'],
      tone: 'friendly',
    },
    {
      id: 'doc-2026-04-28',
      date: '2026-04-28',
      title: '4월 운영진 회의록',
      summary: '공금 잔액 약 130만 원 · 미정산 항목 정리. 월 회비 현행 유지, 겨울 캠프비 4→5만 원 인상 방향 잠정 합의. 차기 회장은 5월 산아 책방 모임에서 제비뽑기.',
      tags: ['회의록', '결정사항'],
      tone: 'formal',
    },
    {
      id: 'doc-2025-07-04',
      date: '2025-07-04',
      title: '중1 방학 공부 프로젝트 학부모 회의',
      summary: '중1을 대상으로 학원을 줄이고 스스로 공부하는 습관 만들기로 결정. 7월 모임에서 곱하기 규칙 찾기 활동 진행. 부모는 코치 역할로 한 발 물러나기.',
      tags: ['회의록', '결정사항', '수학이랑놀자'],
      tone: 'formal',
    },
    {
      id: 'doc-2025-12-14',
      date: '2025-12-14',
      title: '12월 정기모임 후기 — 과메기 특식의 날',
      summary: '12월 모임 ‘과메기’ 특식이 시그니처가 됐어요. 어른 공부 모임에서 NotebookLM으로 긴 자료 요약 실습. 아이들은 로봇 영상 보며 토론.',
      tags: ['후기', '정기모임_스케치', '밴드글'],
      tone: 'friendly',
    },
    {
      id: 'doc-2026-01-17',
      date: '2026-01-17',
      title: '겨울 캠프 1일차 후기',
      summary: '슬로건 “Show Me The App” 아래 가족별 앱 기획. 저녁엔 공동체 놀이로 마무리. 이재포 이사장님 강의가 인상적이었어요.',
      tags: ['후기', '겨울캠프', '밴드글'],
      tone: 'friendly',
    },
  ];

  // -- AI 시뮬레이션 응답 (RAG 모킹) --
  // 키워드 매칭으로 가장 가까운 답변을 반환
  const aiSeed = [
    {
      keys: ['겨울 캠프 기획서', '기획서 양식', '겨울캠프 기획'],
      mode: 'formal',
      title: '겨울 캠프 기획서 양식 (2025.12.11 회의 기준)',
      bullets: [
        '개발자 이름 · 모임 정보 · 작성일 명시',
        '주요 사용자 정의 (대상 연령·역할)',
        '문제 정의 — 사용자가 겪는 구체적 어려움',
        '핵심 기능 3가지 — 우선순위 포함',
        '슬로건 후보: “Show Me The App”',
      ],
      sources: [{ label: '2025-12-11 회의록', tag: '회의록' }],
    },
    {
      keys: ['수학 공부', '중1', '곱하기'],
      mode: 'formal',
      title: '중1 학습 프로젝트 결정사항',
      bullets: [
        '대상: 중학교 1학년',
        '방향: 학원 의존도를 낮추고 스스로 공부하는 습관 만들기',
        '7월 활동: 곱하기 규칙 찾기 (패턴 발견 중심)',
        '부모 역할: 답을 주지 않고 코치로 한 발 물러나기',
      ],
      sources: [
        { label: '2025-07-04 학부모 회의', tag: '회의록' },
        { label: '7월 정기모임 후기', tag: '후기' },
      ],
    },
    {
      keys: ['나노 바나나', '바나나 프로'],
      mode: 'friendly',
      title: '나노 바나나 프로, 이런 점이 좋았어요!',
      paragraph:
        '11.25 온라인 모임에서 다같이 써봤는데요, 우선 3D 이미지 생성이 정말 정교했어요. 가장 놀랐던 건 한글 텍스트가 깨지지 않고 또렷하게 들어간다는 점! 그동안 한글이 잘 안 나와서 답답했던 분들 모두 “오늘 이거 신기하다”라고 한마디씩 하셨답니다 :) Mixboard랑 비교하면서 활용 시나리오도 함께 이야기 나눴어요.',
      sources: [{ label: '2025-11-25 온라인 모임 후기', tag: '밴드글' }],
    },
    {
      keys: ['슬로건', '캠프 슬로건', 'Show Me'],
      mode: 'formal',
      title: '겨울 캠프 슬로건 후보',
      bullets: [
        '“Show Me The App” — 12.11 회의에서 제안되어 캠프 메인으로 확정',
        '가족 단위 앱 기획·발표 형식과 가장 잘 맞는 슬로건으로 평가됨',
      ],
      sources: [
        { label: '2025-12-11 회의록', tag: '회의록' },
        { label: '2026-01-17 캠프 1일차 후기', tag: '후기' },
      ],
    },
    {
      keys: ['다음 일정', '다음 정기', '다음 모임'],
      mode: 'formal',
      title: '곧 있을 일정',
      bullets: [
        '5월 9일(토) 11:00 — 산아 책방 브런치 모임 (회장 제비뽑기)',
        '5월 26일(화) 21:00 — 운영진 온라인 회의 (Google Meet)',
        '6월 13일(토) 13:30 — 6월 정기모임 (마하어린이도서관)',
      ],
      sources: [{ label: '캘린더 등록 일정', tag: '회의록' }],
    },
    {
      keys: ['회비', '캠프비'],
      mode: 'formal',
      title: '회비 · 캠프비 결정 (2026.04.28)',
      bullets: [
        '월 회비 2만 원 — 현행 유지',
        '여름 캠프비 4만 원 — 현행 유지 검토',
        '겨울 캠프비 4 → 5만 원 인상 방향 잠정 합의 (2박 비용 반영)',
        '5월 모임에서 여름 캠프 계획 확정 후 최종 결정',
      ],
      sources: [{ label: '2026-04-28 운영진 회의록', tag: '회의록' }],
    },
    {
      keys: ['과메기'],
      mode: 'friendly',
      title: '12월 정기모임 ‘과메기’ 이야기',
      paragraph:
        '겨울이 되면 12월 모임의 시그니처는 단연 과메기예요! 새콤하게 무친 과메기에 청양고추 한 조각 올려서 한 입 — 어른들도 아이들도 모두 좋아하는 메뉴랍니다. 운영진이 미리 인원 수요를 확인해서 준비하고 있어요. 이번에도 함께 즐겨봐요 🤗',
      sources: [{ label: '2025-12-14 정기모임 후기', tag: '밴드글' }],
    },
  ];

  // 매칭 안 될 때 기본 응답
  const aiFallback = {
    mode: 'formal',
    title: '관련 기록을 찾지 못했어요',
    bullets: [
      '저장된 회의록·밴드글 중 직접 매칭되는 항목이 없습니다.',
      '키워드를 줄여서 다시 시도해 보세요. 예) “겨울 캠프”, “수학”, “회비”',
      '관련 회의가 있었다면 운영진에게 업로드를 요청해 주세요.',
    ],
    sources: [],
  };

  return { seedMembers, seedEvents, seedArchive, seedRsvp, aiSeed, aiFallback, SIGNUP_CODE };
})();
