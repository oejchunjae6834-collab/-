/**
 * Postgres 조회/쓰기 유틸 — 모든 함수 async.
 *
 * 페이지(server component) / API route에서 import해 사용:
 *   const events = await listEvents();
 *
 * pg는 plain object를 반환하므로 toPlain 래퍼 불필요.
 */
import { query, queryOne, execute } from './db.js';

/* ========== Events ========== */
export async function listEvents({ publicOnly = false, featuredOnly = false } = {}) {
  let sql = `SELECT * FROM events`;
  const conds = [];
  if (publicOnly) conds.push('is_public = 1');
  if (featuredOnly) conds.push('is_featured = 1');
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY start_date ASC';
  return query(sql);
}
export async function getEvent(id) {
  return queryOne('SELECT * FROM events WHERE id = $1', [id]);
}
export async function createEvent(data, userId) {
  const cols = ['title','event_type','start_date','end_date','start_time','end_time','location','description','is_public','is_featured','created_by'];
  const vals = cols.map((c) => c === 'created_by' ? userId : (data[c] ?? null));
  const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
  const r = await execute(`INSERT INTO events (${cols.join(',')}) VALUES (${ph}) RETURNING id`, vals);
  return getEvent(r.rows[0].id);
}
export async function updateEvent(id, data) {
  const cols = ['title','event_type','start_date','end_date','start_time','end_time','location','description','is_public','is_featured'];
  const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
  await execute(
    `UPDATE events SET ${sets} WHERE id = $${cols.length + 1}`,
    [...cols.map((c) => data[c] ?? null), id]
  );
  return getEvent(id);
}
export async function deleteEvent(id) {
  return execute('DELETE FROM events WHERE id = $1', [id]);
}

/* ========== Attendances ========== */
export async function setAttendance(eventId, userId, status) {
  if (!status) {
    await execute('DELETE FROM attendances WHERE event_id = $1 AND user_id = $2', [eventId, userId]);
    return null;
  }
  await execute(`
    INSERT INTO attendances (event_id, user_id, status, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
  `, [eventId, userId, status]);
  return { eventId, userId, status };
}
export async function listAttendance(eventId) {
  return query(`
    SELECT a.status, u.id AS user_id, u.name, u.family_members
    FROM attendances a
    JOIN users u ON u.id = a.user_id
    WHERE a.event_id = $1
    ORDER BY u.name
  `, [eventId]);
}
export async function myAttendance(eventId, userId) {
  const row = await queryOne('SELECT status FROM attendances WHERE event_id = $1 AND user_id = $2', [eventId, userId]);
  return row?.status || null;
}

/* ========== Archive ========== */
export async function listArchive({ tag, q } = {}) {
  let rows = await query(`SELECT * FROM archive_docs ORDER BY doc_date DESC`);
  if (tag && tag !== 'all') {
    rows = rows.filter((r) => {
      try { return JSON.parse(r.tags).includes(tag); } catch { return false; }
    });
  }
  if (q) {
    const lower = q.toLowerCase();
    rows = rows.filter((r) =>
      (r.title + ' ' + r.summary + ' ' + r.tags).toLowerCase().includes(lower)
    );
  }
  return rows;
}
export async function getArchive(id) {
  return queryOne('SELECT * FROM archive_docs WHERE id = $1', [id]);
}
export async function createArchive(data) {
  const cols = ['title','doc_date','tone','tags','summary','body','source','drive_file_id'];
  const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
  const r = await execute(
    `INSERT INTO archive_docs (${cols.join(',')}) VALUES (${ph}) RETURNING id`,
    cols.map((c) => data[c] ?? null)
  );
  return getArchive(r.rows[0].id);
}
export async function updateArchive(id, data) {
  const cols = ['title','doc_date','tone','tags','summary','body'];
  const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
  await execute(
    `UPDATE archive_docs SET ${sets}, updated_at = NOW() WHERE id = $${cols.length + 1}`,
    [...cols.map((c) => data[c] ?? null), id]
  );
  return getArchive(id);
}
export async function deleteArchive(id) {
  return execute('DELETE FROM archive_docs WHERE id = $1', [id]);
}

/* ========== Users / Approvals ========== */
export async function listUsers({ pendingOnly = false } = {}) {
  const sql = pendingOnly
    ? `SELECT id, email, name, family_role, family_members, motive, is_approved, role_level, created_at FROM users WHERE is_approved = 0 ORDER BY created_at DESC`
    : `SELECT id, email, name, family_role, family_members, is_approved, role_level, created_at FROM users ORDER BY role_level DESC, name ASC`;
  return query(sql);
}
export async function approveUser(id, role_level = 2) {
  await execute(
    `UPDATE users SET is_approved = 1, role_level = $1, approved_at = NOW() WHERE id = $2`,
    [role_level, id]
  );
}
export async function setRole(id, role_level) {
  await execute(
    `UPDATE users SET role_level = $1, is_approved = $2 WHERE id = $3`,
    [role_level, role_level >= 2 ? 1 : 0, id]
  );
}
export async function rejectUser(id) {
  return execute('DELETE FROM users WHERE id = $1', [id]);
}

/* ========== CMS Blocks ========== */
export async function getCmsBlocks(keys) {
  if (keys && keys.length) {
    const ph = keys.map((_, i) => `$${i + 1}`).join(',');
    const rows = await query(`SELECT key, value FROM cms_blocks WHERE key IN (${ph})`, keys);
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }
  const rows = await query(`SELECT key, value FROM cms_blocks`);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
export async function setCmsBlock(key, value, userId) {
  await execute(`
    INSERT INTO cms_blocks (key, value, updated_at, updated_by) VALUES ($1, $2, NOW(), $3)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by
  `, [key, value, userId]);
}

/* ========== 회원 관리 (관리자) ========== */
export async function getUser(id) {
  return queryOne('SELECT * FROM users WHERE id = $1', [id]);
}
export async function updateUser(id, data) {
  const cols = ['name','email','family_role','family_members','permissions','is_approved','role_level'];
  const present = cols.filter((c) => data[c] !== undefined);
  if (!present.length) return getUser(id);
  const sets = present.map((c, i) => `${c} = $${i + 1}`).join(', ');
  await execute(
    `UPDATE users SET ${sets} WHERE id = $${present.length + 1}`,
    [...present.map((c) => data[c]), id]
  );
  return getUser(id);
}
export async function deleteUser(id) {
  return execute('DELETE FROM users WHERE id = $1', [id]);
}

/* ========== 댓글 ========== */
export async function listComments(targetType, targetId) {
  return query(`
    SELECT c.id, c.body, c.created_at, c.user_id, c.parent_id, u.name AS user_name, u.role_level
    FROM comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.target_type = $1 AND c.target_id = $2
    ORDER BY c.created_at ASC
  `, [targetType, targetId]);
}
export async function createComment({ targetType, targetId, userId, body, parentId = null }) {
  let resolvedParent = parentId || null;
  if (resolvedParent) {
    const p = await queryOne('SELECT parent_id FROM comments WHERE id = $1', [resolvedParent]);
    if (p?.parent_id) resolvedParent = p.parent_id;
  }
  const r = await execute(
    'INSERT INTO comments (target_type, target_id, user_id, body, parent_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [targetType, targetId, userId, body, resolvedParent]
  );
  return r.rows[0].id;
}
export async function getComment(id) {
  return queryOne('SELECT * FROM comments WHERE id = $1', [id]);
}
export async function deleteComment(id) {
  return execute('DELETE FROM comments WHERE id = $1', [id]);
}

/* ========== Boards (메뉴) ========== */
export async function listBoards({ visibleOnly = false } = {}) {
  const sql = visibleOnly
    ? 'SELECT * FROM boards WHERE visible = 1 ORDER BY position ASC, id ASC'
    : 'SELECT * FROM boards ORDER BY position ASC, id ASC';
  return query(sql);
}
export async function getBoard(idOrSlug) {
  if (typeof idOrSlug === 'number') {
    return queryOne('SELECT * FROM boards WHERE id = $1', [idOrSlug]);
  }
  return queryOne('SELECT * FROM boards WHERE slug = $1', [idOrSlug]);
}
export async function createBoard(data) {
  const cols = ['slug','name','type','description','read_role','write_role','comments_enabled','position','visible','is_system'];
  const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
  const r = await execute(
    `INSERT INTO boards (${cols.join(',')}) VALUES (${ph}) RETURNING id`,
    cols.map((c) => data[c] ?? null)
  );
  return getBoard(r.rows[0].id);
}
export async function updateBoard(id, data) {
  const cols = ['slug','name','type','description','read_role','write_role','comments_enabled','position','visible'];
  const present = cols.filter((c) => data[c] !== undefined);
  if (!present.length) return getBoard(id);
  const sets = present.map((c, i) => `${c} = $${i + 1}`).join(', ');
  await execute(
    `UPDATE boards SET ${sets} WHERE id = $${present.length + 1}`,
    [...present.map((c) => data[c]), id]
  );
  return getBoard(id);
}
export async function deleteBoard(id) {
  const b = await getBoard(id);
  if (b?.is_system) throw new Error('시스템 보드는 삭제할 수 없어요');
  return execute('DELETE FROM boards WHERE id = $1', [id]);
}
export async function moveBoard(id, dir) {
  const all = await listBoards();
  const idx = all.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  const swap = dir === 'up' ? all[idx - 1] : all[idx + 1];
  if (!swap) return null;
  const me = all[idx];
  await execute('UPDATE boards SET position = $1 WHERE id = $2', [swap.position, me.id]);
  await execute('UPDATE boards SET position = $1 WHERE id = $2', [me.position, swap.id]);
  return true;
}

/* ========== Board Writers (개별 글쓰기 권한) ========== */
export async function listBoardWriters(boardId) {
  return query(`
    SELECT bw.user_id, u.name, u.email
    FROM board_writers bw JOIN users u ON u.id = bw.user_id
    WHERE bw.board_id = $1
    ORDER BY u.name
  `, [boardId]);
}
export async function addBoardWriter(boardId, userId) {
  await execute('INSERT INTO board_writers (board_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [boardId, userId]);
}
export async function removeBoardWriter(boardId, userId) {
  await execute('DELETE FROM board_writers WHERE board_id = $1 AND user_id = $2', [boardId, userId]);
}
export async function isBoardWriter(boardId, userId) {
  if (!boardId || !userId) return false;
  const r = await queryOne('SELECT 1 FROM board_writers WHERE board_id = $1 AND user_id = $2', [boardId, userId]);
  return !!r;
}

/* ========== Posts ========== */
export async function listPosts(boardId) {
  return query(`
    SELECT p.*, u.name AS author_name
    FROM posts p LEFT JOIN users u ON u.id = p.author_id
    WHERE p.board_id = $1
    ORDER BY p.pinned DESC, p.created_at DESC
  `, [boardId]);
}
export async function getPost(id) {
  return queryOne(`
    SELECT p.*, u.name AS author_name, b.slug AS board_slug, b.name AS board_name, b.type AS board_type, b.comments_enabled
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    LEFT JOIN boards b ON b.id = p.board_id
    WHERE p.id = $1
  `, [id]);
}
export async function createPost(data) {
  const cols = ['board_id','title','body','meta','author_id','pinned'];
  const vals = cols.map((c) => data[c] ?? (c === 'pinned' ? 0 : null));
  const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
  const r = await execute(
    `INSERT INTO posts (${cols.join(',')}) VALUES (${ph}) RETURNING id`,
    vals
  );
  return getPost(r.rows[0].id);
}
export async function updatePost(id, data) {
  const cols = ['title','body','meta','pinned'];
  const present = cols.filter((c) => data[c] !== undefined);
  if (!present.length) return getPost(id);
  const sets = present.map((c, i) => `${c} = $${i + 1}`).join(', ');
  await execute(
    `UPDATE posts SET ${sets}, updated_at = NOW() WHERE id = $${present.length + 1}`,
    [...present.map((c) => data[c]), id]
  );
  return getPost(id);
}
export async function deletePost(id) {
  return execute('DELETE FROM posts WHERE id = $1', [id]);
}

/* ========== 가족 구성원 ========== */
export async function listFamilyMembers(parentUserId) {
  return query(`
    SELECT * FROM family_members WHERE parent_user_id = $1
    ORDER BY position ASC, id ASC
  `, [parentUserId]);
}
export async function getFamilyMember(id) {
  return queryOne('SELECT * FROM family_members WHERE id = $1', [id]);
}
export async function createFamilyMember(parentUserId, data) {
  const max = (await queryOne(
    'SELECT MAX(position) AS m FROM family_members WHERE parent_user_id = $1',
    [parentUserId]
  ))?.m ?? -1;
  const r = await execute(
    'INSERT INTO family_members (parent_user_id, name, type, school, position) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [parentUserId, data.name, data.type || '자녀', data.school ?? null, max + 1]
  );
  return getFamilyMember(r.rows[0].id);
}
export async function updateFamilyMember(id, data) {
  const cols = ['name', 'type', 'school', 'position'];
  const present = cols.filter((c) => data[c] !== undefined);
  if (!present.length) return getFamilyMember(id);
  const sets = present.map((c, i) => `${c} = $${i + 1}`).join(', ');
  await execute(
    `UPDATE family_members SET ${sets} WHERE id = $${present.length + 1}`,
    [...present.map((c) => data[c]), id]
  );
  return getFamilyMember(id);
}
export async function deleteFamilyMember(id) {
  return execute('DELETE FROM family_members WHERE id = $1', [id]);
}

/* ========== Sessions (모임 안의 시간대별 세션) ========== */
export async function listSessions(eventId) {
  return query(
    'SELECT * FROM event_sessions WHERE event_id = $1 ORDER BY position ASC, id ASC',
    [eventId]
  );
}
export async function getSession(id) {
  return queryOne('SELECT * FROM event_sessions WHERE id = $1', [id]);
}
export async function createSession(eventId, data) {
  const max = (await queryOne(
    'SELECT MAX(position) AS m FROM event_sessions WHERE event_id = $1',
    [eventId]
  ))?.m ?? -1;
  const cols = ['event_id','name','start_time','end_time','capacity','notes','position'];
  const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
  const r = await execute(
    `INSERT INTO event_sessions (${cols.join(',')}) VALUES (${ph}) RETURNING id`,
    [eventId, data.name, data.start_time || null, data.end_time || null, data.capacity ?? null, data.notes || null, max + 10]
  );
  return getSession(r.rows[0].id);
}
export async function updateSession(id, data) {
  const cols = ['name','start_time','end_time','capacity','notes','position'];
  const present = cols.filter((c) => data[c] !== undefined);
  if (!present.length) return getSession(id);
  const sets = present.map((c, i) => `${c} = $${i + 1}`).join(', ');
  await execute(
    `UPDATE event_sessions SET ${sets} WHERE id = $${present.length + 1}`,
    [...present.map((c) => data[c]), id]
  );
  return getSession(id);
}
export async function deleteSession(id) {
  return execute('DELETE FROM event_sessions WHERE id = $1', [id]);
}

/** 일정에 세션이 없으면 "전체 모임" 단일 세션 자동 생성 */
export async function ensureEventHasSession(eventId) {
  const cnt = (await queryOne(
    'SELECT COUNT(*)::int AS n FROM event_sessions WHERE event_id = $1',
    [eventId]
  ))?.n ?? 0;
  if (cnt > 0) return;
  const ev = await getEvent(eventId);
  if (!ev) return;
  await execute(
    `INSERT INTO event_sessions (event_id, name, start_time, end_time, capacity, notes, position)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [eventId, '전체 모임', ev.start_time || null, ev.end_time || null, null, null, 10]
  );
}

/* ========== 세션 출석 (가족×세션 매트릭스) ========== */
export async function setSessionAttendance(sessionId, familyMemberId, status) {
  if (!status) {
    await execute(
      'DELETE FROM session_attendances WHERE session_id = $1 AND family_member_id = $2',
      [sessionId, familyMemberId]
    );
    return null;
  }
  await execute(`
    INSERT INTO session_attendances (session_id, family_member_id, status, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT(session_id, family_member_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
  `, [sessionId, familyMemberId, status]);
  return { sessionId, familyMemberId, status };
}

export async function listEventSessionAttendances(eventId) {
  return query(`
    SELECT sa.session_id, sa.family_member_id, sa.status,
           fm.name AS member_name, fm.type AS member_type, fm.age,
           u.id AS parent_user_id, u.name AS parent_name
    FROM session_attendances sa
    JOIN event_sessions s ON s.id = sa.session_id
    JOIN family_members fm ON fm.id = sa.family_member_id
    JOIN users u ON u.id = fm.parent_user_id
    WHERE s.event_id = $1
  `, [eventId]);
}

export async function myFamilySessionStatus(eventId, parentUserId) {
  return query(`
    SELECT sa.session_id, sa.family_member_id, sa.status
    FROM session_attendances sa
    JOIN family_members fm ON fm.id = sa.family_member_id
    JOIN event_sessions s ON s.id = sa.session_id
    WHERE s.event_id = $1 AND fm.parent_user_id = $2
  `, [eventId, parentUserId]);
}

/* ========== 소개 페이지 섹션 ========== */
export async function listAboutSections({ visibleOnly = false } = {}) {
  const where = visibleOnly ? ' WHERE visible = 1' : '';
  return query(`SELECT * FROM about_sections${where} ORDER BY position ASC, id ASC`);
}
export async function getAboutSection(id) {
  return queryOne('SELECT * FROM about_sections WHERE id = $1', [id]);
}
export async function createAboutSection(data) {
  const max = (await queryOne('SELECT MAX(position) AS m FROM about_sections'))?.m ?? 0;
  const r = await execute(
    `INSERT INTO about_sections (type, content, caption, position, visible)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [data.type, data.content ?? null, data.caption ?? null, max + 10, data.visible === 0 ? 0 : 1]
  );
  return getAboutSection(r.rows[0].id);
}
export async function updateAboutSection(id, data) {
  const cols = ['type', 'content', 'caption', 'position', 'visible'];
  const present = cols.filter((c) => data[c] !== undefined);
  if (!present.length) return getAboutSection(id);
  const sets = present.map((c, i) => `${c} = $${i + 1}`).join(', ');
  await execute(
    `UPDATE about_sections SET ${sets}, updated_at = NOW() WHERE id = $${present.length + 1}`,
    [...present.map((c) => data[c]), id]
  );
  return getAboutSection(id);
}
export async function deleteAboutSection(id) {
  return execute('DELETE FROM about_sections WHERE id = $1', [id]);
}
export async function moveAboutSection(id, dir) {
  const all = await listAboutSections();
  const idx = all.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  const swap = dir === 'up' ? all[idx - 1] : all[idx + 1];
  if (!swap) return null;
  const me = all[idx];
  await execute('UPDATE about_sections SET position = $1 WHERE id = $2', [swap.position, me.id]);
  await execute('UPDATE about_sections SET position = $1 WHERE id = $2', [me.position, swap.id]);
  return true;
}

/* ========== 활동 포트폴리오 ========== */
const PORTFOLIO_CATEGORIES = ['adult', 'kids', 'math', 'play'];
const PORTFOLIO_SEED = {
  adult: [
    { title: '딥리서치 활용', body: '특정 주제를 깊이 파보는 AI 도구로 자료 수집·정리 실험.', tag: '2026 진행중' },
    { title: 'Agentic AI 실습', body: '에이전트형 AI가 어디까지 자율적으로 작업을 수행하는지 함께 검증.', tag: '2026 진행중' },
    { title: '다리오 아모데이 「성장통 시기의 기술」', body: 'AI 시대의 기술 발전과 책임에 대한 독서 토론.', tag: '4월' },
    { title: '인공지능 폭발(Intelligence Explosion)', body: '"AI는 진짜 이해하는가?" 성찰적 질문 나눔.', tag: '이재포 이사장' },
  ],
  kids: [
    { title: '구글 아트&컬쳐 앱 기획', body: '체험 후 "내가 만들고 싶은 앱"을 가족별로 발표.', tag: '2월' },
    { title: 'Gemini로 봄 음악 작곡', body: '봄을 주제로 멜로디·가사 만들기. 가족 무대.', tag: '3월' },
    { title: 'Google Vids로 2040년 가족 영상', body: '1분 영상 만들기 — 영상·음악·편집을 한 도구로.', tag: '4월 과제' },
    { title: '모듈러 연산 / 시저 암호', body: '수학과 AI의 만남 — 직접 암호를 만들고 풀어보기.', tag: '수시' },
    { title: '나노 바나나 프로 체험', body: '3D 이미지 생성과 한글 텍스트 정확도 실험.', tag: '11월 온라인' },
  ],
  math: [
    { title: '한글 암호 풀이', body: '이산지나 선생님이 만들어 온 암호를 함께 풀었어요.', tag: '4월' },
    { title: '일본 고등 입시 1번', body: '겁먹지 않고 끝까지 — 모두 풀이 성공!', tag: '4월' },
    { title: '곱하기 규칙 찾기', body: '중1 대상 — 패턴을 스스로 발견하기.', tag: '7월' },
    { title: '피보나치 수열', body: '자연 속 수열을 찾아보고 0의 의미 이야기.', tag: '수시' },
  ],
  play: [
    { title: '지하정원 그림책 읽기', body: '조용히 듣는 시간이 가장 멋진 풍경이 되곤 합니다.', tag: '4월' },
    { title: '디비디비딥', body: '몸으로 하는 가위바위보 — 왕이 되면 절을 받아요.', tag: '상시' },
    { title: '서로 이름 외우기', body: '공을 주고받으며 이름을 부르는 시간.', tag: '신입 환영' },
  ],
};

async function ensurePortfolioSeed() {
  const n = (await queryOne('SELECT COUNT(*)::int AS n FROM portfolio_items'))?.n ?? 0;
  if (n > 0) return;
  for (const cat of PORTFOLIO_CATEGORIES) {
    const items = PORTFOLIO_SEED[cat] || [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await execute(
        'INSERT INTO portfolio_items (category, title, body, tag, position) VALUES ($1, $2, $3, $4, $5)',
        [cat, it.title, it.body || null, it.tag || null, (i + 1) * 10]
      );
    }
  }
}

export async function listPortfolioItems({ visibleOnly = false, category } = {}) {
  await ensurePortfolioSeed();
  const conds = [];
  const args = [];
  if (visibleOnly) conds.push('visible = 1');
  if (category) { args.push(category); conds.push(`category = $${args.length}`); }
  const where = conds.length ? ` WHERE ${conds.join(' AND ')}` : '';
  return query(
    `SELECT * FROM portfolio_items${where} ORDER BY category ASC, position ASC, id ASC`,
    args
  );
}
export async function getPortfolioItem(id) {
  return queryOne('SELECT * FROM portfolio_items WHERE id = $1', [id]);
}
export async function createPortfolioItem(data) {
  const cat = PORTFOLIO_CATEGORIES.includes(data.category) ? data.category : 'adult';
  const max = (await queryOne(
    'SELECT MAX(position) AS m FROM portfolio_items WHERE category = $1',
    [cat]
  ))?.m ?? 0;
  const r = await execute(
    `INSERT INTO portfolio_items (category, title, body, tag, image_url, position, visible)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      cat,
      data.title,
      data.body ?? null,
      data.tag ?? null,
      data.image_url ?? null,
      max + 10,
      data.visible === 0 ? 0 : 1,
    ]
  );
  return getPortfolioItem(r.rows[0].id);
}
export async function updatePortfolioItem(id, data) {
  const cols = ['category', 'title', 'body', 'tag', 'image_url', 'position', 'visible'];
  const present = cols.filter((c) => data[c] !== undefined);
  if (!present.length) return getPortfolioItem(id);
  const sets = present.map((c, i) => `${c} = $${i + 1}`).join(', ');
  await execute(
    `UPDATE portfolio_items SET ${sets}, updated_at = NOW() WHERE id = $${present.length + 1}`,
    [...present.map((c) => data[c]), id]
  );
  return getPortfolioItem(id);
}
export async function deletePortfolioItem(id) {
  return execute('DELETE FROM portfolio_items WHERE id = $1', [id]);
}
export async function movePortfolioItem(id, dir) {
  const me = await getPortfolioItem(id);
  if (!me) return null;
  const sibs = await query(
    'SELECT * FROM portfolio_items WHERE category = $1 ORDER BY position ASC, id ASC',
    [me.category]
  );
  const idx = sibs.findIndex((s) => s.id === id);
  const swap = dir === 'up' ? sibs[idx - 1] : sibs[idx + 1];
  if (!swap) return null;
  await execute('UPDATE portfolio_items SET position = $1 WHERE id = $2', [swap.position, me.id]);
  await execute('UPDATE portfolio_items SET position = $1 WHERE id = $2', [me.position, swap.id]);
  return true;
}

/* ========== Public RSVP ========== */
export async function createPublicRsvp(data) {
  const cols = ['event_id','name','email','phone','party_size','note'];
  const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
  const r = await execute(
    `INSERT INTO public_rsvps (${cols.join(',')}) VALUES (${ph}) RETURNING id`,
    cols.map((c) => data[c] ?? null)
  );
  return r.rows[0].id;
}
export async function listPublicRsvps(eventId) {
  return query('SELECT * FROM public_rsvps WHERE event_id = $1 ORDER BY created_at DESC', [eventId]);
}
