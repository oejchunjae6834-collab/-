/**
 * Postgres 마이그레이션 + 시드 통합 스크립트.
 *
 * 사용법:
 *   npm run db:migrate
 *
 * 동작:
 *   1) DATABASE_URL에 연결
 *   2) schema.pg.sql 실행 (CREATE/ALTER TABLE IF NOT EXISTS, 멱등)
 *   3) password_hash가 비어있는 사용자 행이 있으면 인증 관련 테이블 자동 초기화
 *   4) 빈 테이블에만 초기 시드 데이터 삽입
 *
 * Render의 buildCommand에서도 호출되므로 멱등(idempotent)이 필수.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { Pool } = require('pg');

const scrypt = promisify(crypto.scrypt);
const SCRYPT_N = 16384;
const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;

async function hashPassword(plain) {
  const salt = crypto.randomBytes(SCRYPT_SALT_BYTES);
  const derived = await scrypt(plain, salt, SCRYPT_KEYLEN, { N: SCRYPT_N });
  return `scrypt$${SCRYPT_N}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

const TEMP_PW = process.env.SEED_TEMP_PASSWORD || 'dijeok2026!';

// .env 로드 (Next.js 외부 스크립트라 수동 로드)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL이 .env에 없습니다. Supabase Settings → Database → Connection string(URI/Transaction pooler)을 복사해 주세요.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function exec(sql, params = []) {
  return pool.query(sql, params);
}

async function rowCount(table) {
  const r = await pool.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
  return r.rows[0].n;
}

async function seedTable(table, rows, columns) {
  const n = await rowCount(table);
  if (n > 0) {
    console.log(`⏭  ${table}: ${n}건 — 시드 건너뜀`);
    return;
  }
  if (rows.length === 0) {
    console.log(`⏭  ${table}: 비어 있는 시드 (건너뜀)`);
    return;
  }
  for (const row of rows) {
    const vals = columns.map((c) => row[c] === undefined ? null : row[c]);
    const ph = columns.map((_, i) => `$${i + 1}`).join(', ');
    await pool.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${ph})`,
      vals
    );
  }
  console.log(`✅ ${table}: ${rows.length}건 시드 완료`);
}

async function main() {
  console.log(`🔌 연결: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);

  const schema = fs.readFileSync(path.join(__dirname, 'schema.pg.sql'), 'utf8');
  await exec(schema);
  console.log('📐 스키마 적용 완료');

  // 매직링크 → 아이디·비밀번호 1회 마이그레이션
  // password_hash가 NULL인 사용자 행이 하나라도 있으면 인증 테이블 비움.
  const stale = await pool.query('SELECT COUNT(*)::int AS n FROM users WHERE password_hash IS NULL');
  if (stale.rows[0].n > 0) {
    console.log(`🧹 password_hash 미설정 사용자 ${stale.rows[0].n}명 발견 → 인증·가족·세션 테이블 초기화`);
    await pool.query('TRUNCATE users, sessions, family_members RESTART IDENTITY CASCADE');
    console.log('🧹 초기화 완료 — 새 시드를 적용합니다.');
  }

  const seedHash = await hashPassword(TEMP_PW);

  // ---- 사용자 ----
  const users = [
    { email: 'oej@dijeok.test',  username: 'oej',   name: '오은진',     family_role: '운영진', family_members: '["엄마","아빠","첫째"]', is_approved: 1, role_level: 3 },
    { email: 'ymsn@dijeok.test', username: 'ymsn',  name: '양미선',     family_role: '운영진', family_members: '["양미선","배우자"]',     is_approved: 1, role_level: 2 },
    { email: 'lsjn@dijeok.test', username: 'lsjn',  name: '이산지나',   family_role: '운영진', family_members: '["이산지나","아이"]',     is_approved: 1, role_level: 2 },
    { email: 'kga@dijeok.test',  username: 'kga',   name: '고경애',     family_role: '운영진', family_members: '["고경애","아이"]',       is_approved: 1, role_level: 2 },
    { email: 'les@dijeok.test',  username: 'les',   name: '이은숙',     family_role: '운영진', family_members: '["이은숙","아이"]',       is_approved: 1, role_level: 2 },
    { email: 'guest@dijeok.test',username: 'guest', name: '신청대기자', family_role: '학부모', family_members: '["엄마","아이"]',         is_approved: 0, role_level: 1 },
  ];
  for (const u of users) u.password_hash = seedHash;
  await seedTable('users', users, ['email','username','password_hash','name','family_role','family_members','is_approved','role_level']);

  // ---- 일정 ----
  const events = [
    { title: '5월 산아책방 모임', event_type: '공개특강', start_date: '2026-05-13', end_date: null, start_time: '11:00', end_time: '14:00', location: '산아책방', description: '비회원도 함께하는 5월 산아책방 모임. 브런치를 나누며 디적디적 운영진과 인사하고, 디지털 리터러시·교육 이야기를 나눠요.', is_public: 1, is_featured: 1 },
    { title: '5월 운영진 회의', event_type: '운영진회의', start_date: '2026-05-26', end_date: null, start_time: '21:00', end_time: '22:30', location: '구글 Meet', description: '여름 캠프 계획 수립, 회비·캠프비 최종 결정.', is_public: 0, is_featured: 0 },
    { title: '6월 정기모임', event_type: '정기모임', start_date: '2026-06-13', end_date: null, start_time: '13:30', end_time: '20:00', location: '마하어린이도서관', description: '수학이랑 놀자 · 공동체 놀이 · 아이들 모여라 · 어른 공부 모임.', is_public: 0, is_featured: 0 },
    { title: '7월 정기모임', event_type: '정기모임', start_date: '2026-07-25', end_date: null, start_time: '13:30', end_time: '20:00', location: '마하어린이도서관', description: '곱하기 규칙 찾기 · Mixboard 작품 발표 · 어른 공부.', is_public: 0, is_featured: 0 },
    { title: '여름 캠프 (1일)', event_type: '여름캠프', start_date: '2026-08-08', end_date: '2026-08-08', start_time: '08:00', end_time: '20:00', location: '미정', description: '여름 캠프 · 캠프비 4만 원.', is_public: 0, is_featured: 0 },
    { title: '이재포 이사장 공개 특강', event_type: '공개특강', start_date: '2026-04-18', end_date: null, start_time: '14:00', end_time: '16:00', location: '산아책방', description: '비회원도 환영하는 공개 특강. 사전 신청 필요.', is_public: 1, is_featured: 0 },
    { title: '마하어린이도서관 공개 참관', event_type: '공개특강', start_date: '2026-04-19', end_date: null, start_time: '13:30', end_time: '17:30', location: '마하어린이도서관', description: '디적디적 정기모임을 외부에 공개. 가족 단위 참관 환영.', is_public: 1, is_featured: 0 },
  ];
  await seedTable('events', events, ['title','event_type','start_date','end_date','start_time','end_time','location','description','is_public','is_featured']);

  // ---- 출석 (RSVP) ----
  if (await rowCount('attendances') === 0) {
    const adminIds = (await pool.query("SELECT id FROM users WHERE role_level >= 2")).rows.map(r => r.id);
    const evIds = (await pool.query("SELECT id FROM events WHERE is_public = 0")).rows;
    const rows = [];
    for (const ev of evIds) {
      for (const uid of adminIds) {
        rows.push({ event_id: ev.id, user_id: uid, status: Math.random() > 0.2 ? 'going' : 'maybe' });
      }
    }
    await seedTable('attendances', rows, ['event_id','user_id','status']);
  }

  // ---- 아카이브 ----
  const archive = [
    { title: '겨울 캠프 기획안 검토 회의', doc_date: '2025-12-11', tone: 'formal',
      tags: '["회의록","겨울캠프","AI리터러시"]',
      summary: '이은숙 선생님이 수정한 양식 검토 — 개발자 이름, 주요 사용자, 문제 정의, 핵심 기능 3가지 포함. 캠프 슬로건 후보 "Show Me The App" 제안.',
      body: null, source: 'manual' },
    { title: '온라인 모임 후기 — 나노 바나나 프로 체험', doc_date: '2025-11-25', tone: 'friendly',
      tags: '["후기","AI리터러시","밴드글"]',
      summary: '3D 이미지 생성이 정교했고, 한글 텍스트가 깨지지 않고 정확하게 들어가는 점에 모두 놀랐어요. Mixboard와 비교하며 활용 시나리오도 이야기 나눴어요.',
      body: null, source: 'manual' },
    { title: '4월 정기모임 — 수학자 / Google Vids', doc_date: '2026-04-19', tone: 'friendly',
      tags: '["후기","정기모임_스케치","수학이랑놀자","AI리터러시","공동체놀이"]',
      summary: '한글 암호 풀이로 시작 → 일본 고등 입시 1번 문제 모두 풀이. 공동체 놀이는 지하정원 그림책 + 디비디비딥. 아이들 모여라에서 Google Vids로 영상 만들기.',
      body: null, source: 'manual' },
    { title: '4월 운영진 회의록', doc_date: '2026-04-28', tone: 'formal',
      tags: '["회의록","결정사항"]',
      summary: '공금 잔액 약 130만 원 · 미정산 항목 정리. 월 회비 현행 유지, 겨울 캠프비 4→5만 원 인상 방향 잠정 합의. 차기 회장은 5월 산아 책방 모임에서 제비뽑기.',
      body: null, source: 'manual' },
    { title: '중1 방학 공부 프로젝트 학부모 회의', doc_date: '2025-07-04', tone: 'formal',
      tags: '["회의록","결정사항","수학이랑놀자"]',
      summary: '중1을 대상으로 학원을 줄이고 스스로 공부하는 습관 만들기로 결정. 7월 모임에서 곱하기 규칙 찾기 활동 진행. 부모는 코치 역할로 한 발 물러나기.',
      body: null, source: 'manual' },
    { title: '3월 정기모임 — Gemini로 봄 음악 만들기', doc_date: '2026-03-21', tone: 'friendly',
      tags: '["후기","아이들활동","AI리터러시"]',
      summary: '아이들이 Gemini를 활용해 봄을 주제로 음악을 만들었어요. 한 가족씩 발표하는 시간이 무대 같았어요.',
      body: null, source: 'manual' },
    { title: '2월 정기모임 — Google 아트&컬쳐 앱 기획', doc_date: '2026-02-22', tone: 'friendly',
      tags: '["후기","아이들활동","AI리터러시"]',
      summary: 'Google 아트&컬쳐 앱을 같이 체험하고 "내가 만들고 싶은 앱"을 기획해 발표했어요. 아이디어가 다양했어요.',
      body: null, source: 'manual' },
    { title: '어른 공부 모임 — 다리오 아모데이 「성장통 시기의 기술」', doc_date: '2026-04-19', tone: 'friendly',
      tags: '["후기","어른공부모임"]',
      summary: '다리오 아모데이의 글을 같이 읽고 "AI가 가져올 성장통과 우리의 책임"에 대해 깊이 이야기 나눴어요.',
      body: null, source: 'manual' },
  ];
  await seedTable('archive_docs', archive, ['title','doc_date','tone','tags','summary','body','source']);

  // ---- CMS ----
  const cms = [
    { key: 'hero.kicker',  value: 'Dijeok-Dijeok · 디적디적' },
    { key: 'hero.title',   value: 'AI 시대를 부모와 아이가\\n함께 공부하는 교육공동체' },
    { key: 'hero.lede',    value: '한 달에 한 번 마하어린이도서관에서 모이고, 여름·겨울에는 캠프를 떠나요. 어른이 먼저 배우는 모임 — 가벼운 마음으로 오셔도 좋아요.' },
    { key: 'about.title',  value: '디적디적은 어떤 모임인가요?' },
    { key: 'about.body',   value: '디적디적은 AI 시대를 함께 공부하는 가족 단위 학습 공동체예요. "어른이 먼저 배우는 모임"이라는 정체성으로, 부모와 아이가 같은 자리에서 새로운 도구와 생각을 나눕니다. 매달 한 번 마하어린이도서관에서 정기모임을 갖고, 여름과 겨울에는 1박 2일 캠프를 떠나요. 운영진은 별도로 모여 다음 달 모임을 함께 준비합니다.' },
    { key: 'notice',       value: '4월 18일(토) 산아책방에서 이재포 이사장님 공개 특강이 열립니다. 비회원도 환영해요!' },
  ];
  await seedTable('cms_blocks', cms, ['key','value']);

  // ---- 가족 구성원 ----
  const familyByUser = {
    'oej@dijeok.test':  [['오은진', '부모', null], ['배우자', '부모', null], ['첫째', '자녀', '초3']],
    'ymsn@dijeok.test': [['양미선', '부모', null], ['배우자', '부모', null]],
    'lsjn@dijeok.test': [['이산지나', '부모', null], ['아이', '자녀', '초2']],
    'kga@dijeok.test':  [['고경애', '부모', null], ['아이', '자녀', '초1']],
    'les@dijeok.test':  [['이은숙', '부모', null], ['아이', '자녀', '초5']],
  };
  const familyRows = [];
  for (const [email, members] of Object.entries(familyByUser)) {
    const u = (await pool.query('SELECT id FROM users WHERE email = $1', [email])).rows[0];
    if (!u) continue;
    members.forEach(([name, type, school], i) => {
      familyRows.push({ parent_user_id: u.id, name, type, school, position: i });
    });
  }
  await seedTable('family_members', familyRows, ['parent_user_id','name','type','school','position']);

  // ---- 세션 (정기모임에 5표준 세션) ----
  const STANDARD_SESSIONS = [
    { name: '수학이랑 놀자', start_time: '13:30', end_time: '15:00', notes: '함께 푸는 수학 활동' },
    { name: '공동체 놀이',   start_time: '15:10', end_time: '15:50', notes: '몸으로 어울리는 시간' },
    { name: '아이들 모여라', start_time: '15:50', end_time: '17:30', notes: '아이들 주제 활동' },
    { name: '마하정식 저녁식사', start_time: '17:30', end_time: '18:30', notes: '준비 인원 파악용 — 꼭 체크해 주세요', capacity: 30 },
    { name: '어른 공부 모임', start_time: '18:40', end_time: '20:10', notes: '어른들 학습/토론' },
  ];
  const sessionRows = [];
  const meetEvents = (await pool.query("SELECT id FROM events WHERE event_type = '정기모임'")).rows;
  for (const ev of meetEvents) {
    STANDARD_SESSIONS.forEach((s, i) => {
      sessionRows.push({ event_id: ev.id, name: s.name, start_time: s.start_time, end_time: s.end_time, capacity: s.capacity ?? null, notes: s.notes, position: i * 10 });
    });
  }
  await seedTable('event_sessions', sessionRows, ['event_id','name','start_time','end_time','capacity','notes','position']);

  // ---- 보드 ----
  const boards = [
    { slug: 'about',       name: '소개',      type: 'about',      description: '디적디적이 어떤 모임인지 안내해요',         read_role: 0, write_role: 3, comments_enabled: 0, position: 10, visible: 1, is_system: 1 },
    { slug: 'portfolio',   name: '활동',      type: 'portfolio',  description: '활동 포트폴리오',                              read_role: 0, write_role: 3, comments_enabled: 0, position: 20, visible: 1, is_system: 1 },
    { slug: 'calendar',    name: '일정',      type: 'events',     description: '월례 모임·캠프·공개 행사 일정',                read_role: 0, write_role: 3, comments_enabled: 1, position: 30, visible: 1, is_system: 1 },
    { slug: 'archive',     name: '아카이브',  type: 'article',    description: '회의록·후기 모음',                             read_role: 2, write_role: 3, comments_enabled: 1, position: 40, visible: 1, is_system: 1 },
    { slug: 'photos',      name: '사진첩',    type: 'gallery',    description: '모임 사진을 함께 나눠요',                       read_role: 2, write_role: 3, comments_enabled: 1, position: 50, visible: 1, is_system: 0 },
    { slug: 'resources',   name: '자료실',    type: 'file',       description: '강의 슬라이드·참고 자료를 모아두는 곳',          read_role: 2, write_role: 3, comments_enabled: 1, position: 60, visible: 1, is_system: 0 },
    { slug: 'assignments', name: '과제방',    type: 'assignment', description: '월별 과제와 제출/공유',                         read_role: 2, write_role: 3, comments_enabled: 1, position: 70, visible: 1, is_system: 0 },
    { slug: 'members',     name: '회원 정보', type: 'members',    description: '회원 명단·가족 구성원',                         read_role: 2, write_role: 3, comments_enabled: 0, position: 80, visible: 1, is_system: 1 },
  ];
  await seedTable('boards', boards, ['slug','name','type','description','read_role','write_role','comments_enabled','position','visible','is_system']);

  await pool.query("UPDATE boards SET visible = 0 WHERE slug = 'ai'");

  // ---- 샘플 게시물 ----
  if (await rowCount('posts') === 0) {
    const boardIdMap = {};
    for (const b of (await pool.query('SELECT id, slug FROM boards')).rows) boardIdMap[b.slug] = b.id;

    const samplePosts = [
      { board_slug: 'photos', title: '4월 정기모임 단체 사진', body: '한글 암호 풀이 후 함께 찍은 단체샷이에요!', meta: '{"image_url":"https://images.unsplash.com/photo-1529390079861-591de354faf5?w=800"}', author_email: 'oej@dijeok.test', pinned: 0 },
      { board_slug: 'photos', title: '아이들 모여라 — Google Vids 작품', body: '"2040년 우리 가족"을 영상으로!', meta: '{"image_url":"https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800"}', author_email: 'ymsn@dijeok.test', pinned: 0 },
      { board_slug: 'photos', title: '겨울 캠프 1일차', body: '모두 함께한 즐거운 시간', meta: '{"image_url":"https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800"}', author_email: 'oej@dijeok.test', pinned: 0 },
      { board_slug: 'resources', title: '겨울 캠프 기획서 양식', body: '이은숙 선생님이 정리해주신 양식.', meta: '{"file_url":"https://docs.google.com/document/d/example1","file_name":"winter_camp_template.docx"}', author_email: 'les@dijeok.test', pinned: 1 },
      { board_slug: 'resources', title: '4월 수학이랑 놀자 슬라이드', body: '한글 암호 + 일본 입시 1번 문제 풀이 자료', meta: '{"file_url":"https://docs.google.com/presentation/d/1CNoIaii2DLfHxm1uMjDPy2lFaU-Hd9bRdrPHXHo5s5A/edit","file_name":"math_april.pdf"}', author_email: 'lsjn@dijeok.test', pinned: 0 },
      { board_slug: 'resources', title: 'Google Vids 사용 가이드', body: '4월 모임에서 다룬 Google Vids 단축키 모음.', meta: '{"file_url":"https://docs.google.com/presentation/d/1BDG5h7VrYrBjNYTwJfx9gFJSTFkSpYnagbUgCBAwt4o/edit","file_name":"google_vids_guide.pdf"}', author_email: 'oej@dijeok.test', pinned: 0 },
      { board_slug: 'assignments', title: '6월까지 — Google Vids로 "2040년 우리 가족" 영상 만들기', body: '시간이 넉넉하니 가족과 함께 천천히 만들어 보세요. 1분 내외.', meta: '{"due_date":"2026-06-13"}', author_email: 'oej@dijeok.test', pinned: 1 },
      { board_slug: 'assignments', title: '5월까지 — Mixboard로 "내가 만들고 싶은 앱" 보드 정리', body: '아이디어 보드를 시각적으로 조립해보고, 5월 모임에서 발표해요.', meta: '{"due_date":"2026-05-13"}', author_email: 'lsjn@dijeok.test', pinned: 0 },
      { board_slug: 'assignments', title: '5월까지 — 수학자 관련 영상 1편 공유', body: '수학자에 대한 짧은 영상을 찾아 단톡방에 공유해주세요.', meta: '{"due_date":"2026-05-13"}', author_email: 'lsjn@dijeok.test', pinned: 0 },
    ];
    const postRows = [];
    for (const p of samplePosts) {
      const u = (await pool.query('SELECT id FROM users WHERE email = $1', [p.author_email])).rows[0];
      postRows.push({
        board_id: boardIdMap[p.board_slug],
        title: p.title, body: p.body, meta: p.meta,
        author_id: u?.id || null,
        pinned: p.pinned,
      });
    }
    await seedTable('posts', postRows, ['board_id','title','body','meta','author_id','pinned']);
  }

  console.log('🌱 마이그레이션·시드 완료');
  console.log(`🔑 시드 계정 임시 비밀번호: ${TEMP_PW}  (아이디: oej / ymsn / lsjn / kga / les / guest)`);
  await pool.end();
}

main().catch((e) => {
  console.error('❌ 마이그레이션 실패:', e);
  process.exit(1);
});
