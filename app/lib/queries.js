/**
 * DB 조회/쓰기 유틸 — 페이지/라우트에서 import해 사용.
 *
 * node:sqlite는 row를 null-prototype 객체로 반환하기 때문에,
 * React Server → Client Component로 prop 전달 시 직렬화에 실패합니다.
 * 모든 반환값을 toPlain/toPlainArr 로 한 번 정규화합니다.
 */
import { getDb, migrate, toPlain, toPlainArr } from './db.js';

let _migrated = false;
function ensure() {
  if (_migrated) return;
  migrate();
  _migrated = true;
}

/* ========== Events ========== */
export function listEvents({ publicOnly = false, featuredOnly = false } = {}) {
  ensure();
  let sql = `SELECT * FROM events`;
  const conds = [];
  if (publicOnly) conds.push('is_public = 1');
  if (featuredOnly) conds.push('is_featured = 1');
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY start_date ASC';
  return toPlainArr(getDb().prepare(sql).all());
}
export function getEvent(id) {
  ensure();
  return toPlain(getDb().prepare('SELECT * FROM events WHERE id = ?').get(id));
}
export function createEvent(data, userId) {
  ensure();
  const cols = ['title','event_type','start_date','end_date','start_time','end_time','location','description','is_public','is_featured','created_by'];
  const vals = cols.map((c) => c === 'created_by' ? userId : (data[c] ?? null));
  const stmt = getDb().prepare(`INSERT INTO events (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`);
  const r = stmt.run(...vals);
  return getEvent(Number(r.lastInsertRowid));
}
export function updateEvent(id, data) {
  ensure();
  const cols = ['title','event_type','start_date','end_date','start_time','end_time','location','description','is_public','is_featured'];
  const sets = cols.map((c) => `${c} = ?`).join(', ');
  getDb().prepare(`UPDATE events SET ${sets} WHERE id = ?`).run(...cols.map((c) => data[c] ?? null), id);
  return getEvent(id);
}
export function deleteEvent(id) {
  ensure();
  return getDb().prepare('DELETE FROM events WHERE id = ?').run(id);
}

/* ========== Attendances ========== */
export function setAttendance(eventId, userId, status) {
  ensure();
  if (!status) {
    getDb().prepare('DELETE FROM attendances WHERE event_id = ? AND user_id = ?').run(eventId, userId);
    return null;
  }
  getDb().prepare(`
    INSERT INTO attendances (event_id, user_id, status, updated_at)
    VALUES (?, ?, ?, datetime('now','localtime'))
    ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
  `).run(eventId, userId, status);
  return { eventId, userId, status };
}
export function listAttendance(eventId) {
  ensure();
  return toPlainArr(getDb().prepare(`
    SELECT a.status, u.id AS user_id, u.name, u.family_members
    FROM attendances a
    JOIN users u ON u.id = a.user_id
    WHERE a.event_id = ?
    ORDER BY u.name
  `).all(eventId));
}
export function myAttendance(eventId, userId) {
  ensure();
  const row = getDb().prepare('SELECT status FROM attendances WHERE event_id = ? AND user_id = ?').get(eventId, userId);
  return row?.status || null;
}

/* ========== Archive ========== */
export function listArchive({ tag, q } = {}) {
  ensure();
  let rows = toPlainArr(getDb().prepare(`SELECT * FROM archive_docs ORDER BY doc_date DESC`).all());
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
export function getArchive(id) {
  ensure();
  return toPlain(getDb().prepare('SELECT * FROM archive_docs WHERE id = ?').get(id));
}
export function createArchive(data) {
  ensure();
  const cols = ['title','doc_date','tone','tags','summary','body','source','drive_file_id'];
  const r = getDb().prepare(`INSERT INTO archive_docs (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`)
    .run(...cols.map((c) => data[c] ?? null));
  return getArchive(Number(r.lastInsertRowid));
}
export function updateArchive(id, data) {
  ensure();
  const cols = ['title','doc_date','tone','tags','summary','body'];
  const sets = cols.map((c) => `${c} = ?`).join(', ');
  getDb().prepare(`UPDATE archive_docs SET ${sets}, updated_at = datetime('now','localtime') WHERE id = ?`)
    .run(...cols.map((c) => data[c] ?? null), id);
  return getArchive(id);
}
export function deleteArchive(id) {
  ensure();
  return getDb().prepare('DELETE FROM archive_docs WHERE id = ?').run(id);
}

/* ========== Users / Approvals ========== */
export function listUsers({ pendingOnly = false } = {}) {
  ensure();
  const sql = pendingOnly
    ? `SELECT id, email, name, family_role, family_members, motive, is_approved, role_level, created_at FROM users WHERE is_approved = 0 ORDER BY created_at DESC`
    : `SELECT id, email, name, family_role, family_members, is_approved, role_level, created_at FROM users ORDER BY role_level DESC, name ASC`;
  return toPlainArr(getDb().prepare(sql).all());
}
export function approveUser(id, role_level = 2) {
  ensure();
  getDb().prepare(`
    UPDATE users SET is_approved = 1, role_level = ?, approved_at = datetime('now','localtime')
    WHERE id = ?
  `).run(role_level, id);
}
export function setRole(id, role_level) {
  ensure();
  getDb().prepare(`UPDATE users SET role_level = ?, is_approved = ? WHERE id = ?`)
    .run(role_level, role_level >= 2 ? 1 : 0, id);
}
export function rejectUser(id) {
  ensure();
  getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
}

/* ========== CMS Blocks ========== */
export function getCmsBlocks(keys) {
  ensure();
  if (keys && keys.length) {
    const ph = keys.map(() => '?').join(',');
    return Object.fromEntries(
      getDb().prepare(`SELECT key, value FROM cms_blocks WHERE key IN (${ph})`).all(...keys)
        .map((r) => [r.key, r.value])
    );
  }
  return Object.fromEntries(
    getDb().prepare(`SELECT key, value FROM cms_blocks`).all().map((r) => [r.key, r.value])
  );
}
export function setCmsBlock(key, value, userId) {
  ensure();
  getDb().prepare(`
    INSERT INTO cms_blocks (key, value, updated_at, updated_by) VALUES (?, ?, datetime('now','localtime'), ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by
  `).run(key, value, userId);
}

/* ========== 회원 관리 (관리자) ========== */
export function getUser(id) {
  ensure();
  return toPlain(getDb().prepare('SELECT * FROM users WHERE id = ?').get(id));
}
export function updateUser(id, data) {
  ensure();
  // 수정 가능한 필드만 화이트리스트
  const cols = ['name','email','family_role','family_members','permissions','is_approved','role_level'];
  const present = cols.filter((c) => data[c] !== undefined);
  if (!present.length) return getUser(id);
  const sets = present.map((c) => `${c} = ?`).join(', ');
  getDb().prepare(`UPDATE users SET ${sets} WHERE id = ?`)
    .run(...present.map((c) => data[c]), id);
  return getUser(id);
}
export function deleteUser(id) {
  ensure();
  return getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
}

/* ========== 댓글 ========== */
export function listComments(targetType, targetId) {
  ensure();
  return toPlainArr(getDb().prepare(`
    SELECT c.id, c.body, c.created_at, c.user_id, c.parent_id, u.name AS user_name, u.role_level
    FROM comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.target_type = ? AND c.target_id = ?
    ORDER BY c.created_at ASC
  `).all(targetType, targetId));
}
export function createComment({ targetType, targetId, userId, body, parentId = null }) {
  ensure();
  // 답글의 답글이면 최상위 부모로 평탄화
  let resolvedParent = parentId || null;
  if (resolvedParent) {
    const p = getDb().prepare('SELECT parent_id FROM comments WHERE id = ?').get(resolvedParent);
    if (p?.parent_id) resolvedParent = p.parent_id;
  }
  const r = getDb().prepare(
    'INSERT INTO comments (target_type, target_id, user_id, body, parent_id) VALUES (?, ?, ?, ?, ?)'
  ).run(targetType, targetId, userId, body, resolvedParent);
  return Number(r.lastInsertRowid);
}
export function getComment(id) {
  ensure();
  return toPlain(getDb().prepare('SELECT * FROM comments WHERE id = ?').get(id));
}
export function deleteComment(id) {
  ensure();
  return getDb().prepare('DELETE FROM comments WHERE id = ?').run(id);
}

/* ========== Boards (메뉴) ========== */
export function listBoards({ visibleOnly = false } = {}) {
  ensure();
  const sql = visibleOnly
    ? 'SELECT * FROM boards WHERE visible = 1 ORDER BY position ASC, id ASC'
    : 'SELECT * FROM boards ORDER BY position ASC, id ASC';
  return toPlainArr(getDb().prepare(sql).all());
}
export function getBoard(idOrSlug) {
  ensure();
  const row = typeof idOrSlug === 'number'
    ? getDb().prepare('SELECT * FROM boards WHERE id = ?').get(idOrSlug)
    : getDb().prepare('SELECT * FROM boards WHERE slug = ?').get(idOrSlug);
  return toPlain(row);
}
export function createBoard(data) {
  ensure();
  const cols = ['slug','name','type','description','read_role','write_role','comments_enabled','position','visible','is_system'];
  const r = getDb().prepare(`INSERT INTO boards (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`)
    .run(...cols.map((c) => data[c] ?? null));
  return getBoard(Number(r.lastInsertRowid));
}
export function updateBoard(id, data) {
  ensure();
  const cols = ['slug','name','type','description','read_role','write_role','comments_enabled','position','visible'];
  const present = cols.filter((c) => data[c] !== undefined);
  if (!present.length) return getBoard(id);
  const sets = present.map((c) => `${c} = ?`).join(', ');
  getDb().prepare(`UPDATE boards SET ${sets} WHERE id = ?`)
    .run(...present.map((c) => data[c]), id);
  return getBoard(id);
}
export function deleteBoard(id) {
  ensure();
  // 시스템 보드 보호
  const b = getBoard(id);
  if (b?.is_system) throw new Error('시스템 보드는 삭제할 수 없어요');
  return getDb().prepare('DELETE FROM boards WHERE id = ?').run(id);
}
export function moveBoard(id, dir) {
  ensure();
  const all = listBoards();
  const idx = all.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  const swap = dir === 'up' ? all[idx - 1] : all[idx + 1];
  if (!swap) return null;
  const me = all[idx];
  // 두 보드의 position 값을 교환
  getDb().prepare('UPDATE boards SET position = ? WHERE id = ?').run(swap.position, me.id);
  getDb().prepare('UPDATE boards SET position = ? WHERE id = ?').run(me.position, swap.id);
  return true;
}

/* ========== Board Writers (개별 글쓰기 권한) ========== */
export function listBoardWriters(boardId) {
  ensure();
  return toPlainArr(getDb().prepare(`
    SELECT bw.user_id, u.name, u.email
    FROM board_writers bw JOIN users u ON u.id = bw.user_id
    WHERE bw.board_id = ?
    ORDER BY u.name
  `).all(boardId));
}
export function addBoardWriter(boardId, userId) {
  ensure();
  getDb().prepare('INSERT OR IGNORE INTO board_writers (board_id, user_id) VALUES (?, ?)').run(boardId, userId);
}
export function removeBoardWriter(boardId, userId) {
  ensure();
  getDb().prepare('DELETE FROM board_writers WHERE board_id = ? AND user_id = ?').run(boardId, userId);
}
export function isBoardWriter(boardId, userId) {
  ensure();
  if (!boardId || !userId) return false;
  return !!getDb().prepare('SELECT 1 FROM board_writers WHERE board_id = ? AND user_id = ?').get(boardId, userId);
}

/* ========== Posts ========== */
export function listPosts(boardId) {
  ensure();
  return toPlainArr(getDb().prepare(`
    SELECT p.*, u.name AS author_name
    FROM posts p LEFT JOIN users u ON u.id = p.author_id
    WHERE p.board_id = ?
    ORDER BY p.pinned DESC, p.created_at DESC
  `).all(boardId));
}
export function getPost(id) {
  ensure();
  const row = getDb().prepare(`
    SELECT p.*, u.name AS author_name, b.slug AS board_slug, b.name AS board_name, b.type AS board_type, b.comments_enabled
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    LEFT JOIN boards b ON b.id = p.board_id
    WHERE p.id = ?
  `).get(id);
  return toPlain(row);
}
export function createPost(data) {
  ensure();
  const cols = ['board_id','title','body','meta','author_id','pinned'];
  const r = getDb().prepare(`INSERT INTO posts (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`)
    .run(...cols.map((c) => data[c] ?? (c === 'pinned' ? 0 : null)));
  return getPost(Number(r.lastInsertRowid));
}
export function updatePost(id, data) {
  ensure();
  const cols = ['title','body','meta','pinned'];
  const present = cols.filter((c) => data[c] !== undefined);
  if (!present.length) return getPost(id);
  const sets = present.map((c) => `${c} = ?`).join(', ');
  getDb().prepare(`UPDATE posts SET ${sets}, updated_at = datetime('now','localtime') WHERE id = ?`)
    .run(...present.map((c) => data[c]), id);
  return getPost(id);
}
export function deletePost(id) {
  ensure();
  return getDb().prepare('DELETE FROM posts WHERE id = ?').run(id);
}

/* ========== 가족 구성원 (CLAUDE.md 1-A) ========== */
export function listFamilyMembers(parentUserId) {
  ensure();
  return toPlainArr(getDb().prepare(`
    SELECT * FROM family_members WHERE parent_user_id = ?
    ORDER BY position ASC, id ASC
  `).all(parentUserId));
}
export function getFamilyMember(id) {
  ensure();
  return toPlain(getDb().prepare('SELECT * FROM family_members WHERE id = ?').get(id));
}
export function createFamilyMember(parentUserId, data) {
  ensure();
  // position은 마지막 + 1
  const max = getDb().prepare('SELECT MAX(position) AS m FROM family_members WHERE parent_user_id = ?')
    .get(parentUserId)?.m ?? -1;
  const r = getDb().prepare(
    'INSERT INTO family_members (parent_user_id, name, type, age, position) VALUES (?, ?, ?, ?, ?)'
  ).run(parentUserId, data.name, data.type || '자녀', data.age ?? null, max + 1);
  return getFamilyMember(Number(r.lastInsertRowid));
}
export function updateFamilyMember(id, data) {
  ensure();
  const cols = ['name', 'type', 'age', 'position'];
  const present = cols.filter((c) => data[c] !== undefined);
  if (!present.length) return getFamilyMember(id);
  const sets = present.map((c) => `${c} = ?`).join(', ');
  getDb().prepare(`UPDATE family_members SET ${sets} WHERE id = ?`)
    .run(...present.map((c) => data[c]), id);
  return getFamilyMember(id);
}
export function deleteFamilyMember(id) {
  ensure();
  return getDb().prepare('DELETE FROM family_members WHERE id = ?').run(id);
}

/* ========== Sessions (CLAUDE.md 1-A) ========== */
export function listSessions(eventId) {
  ensure();
  return toPlainArr(getDb().prepare(
    'SELECT * FROM event_sessions WHERE event_id = ? ORDER BY position ASC, id ASC'
  ).all(eventId));
}
export function getSession(id) {
  ensure();
  return toPlain(getDb().prepare('SELECT * FROM event_sessions WHERE id = ?').get(id));
}
export function createSession(eventId, data) {
  ensure();
  const max = getDb().prepare('SELECT MAX(position) AS m FROM event_sessions WHERE event_id = ?').get(eventId)?.m ?? -1;
  const cols = ['event_id','name','start_time','end_time','capacity','notes','position'];
  const r = getDb().prepare(`INSERT INTO event_sessions (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`)
    .run(eventId, data.name, data.start_time || null, data.end_time || null, data.capacity ?? null, data.notes || null, (max + 10));
  return getSession(Number(r.lastInsertRowid));
}
export function updateSession(id, data) {
  ensure();
  const cols = ['name','start_time','end_time','capacity','notes','position'];
  const present = cols.filter((c) => data[c] !== undefined);
  if (!present.length) return getSession(id);
  const sets = present.map((c) => `${c} = ?`).join(', ');
  getDb().prepare(`UPDATE event_sessions SET ${sets} WHERE id = ?`)
    .run(...present.map((c) => data[c]), id);
  return getSession(id);
}
export function deleteSession(id) {
  ensure();
  return getDb().prepare('DELETE FROM event_sessions WHERE id = ?').run(id);
}

/**
 * 일정에 세션이 하나도 없으면 "전체 모임" 단일 세션을 자동 생성.
 * 모든 일정을 가족×세션 그리드로 통일하기 위한 호환 헬퍼.
 */
export function ensureEventHasSession(eventId) {
  ensure();
  const db = getDb();
  const cnt = db.prepare('SELECT COUNT(*) AS n FROM event_sessions WHERE event_id = ?').get(eventId)?.n ?? 0;
  if (cnt > 0) return;
  const ev = getEvent(eventId);
  if (!ev) return;
  db.prepare(
    `INSERT INTO event_sessions (event_id, name, start_time, end_time, capacity, notes, position)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(eventId, '전체 모임', ev.start_time || null, ev.end_time || null, null, null, 10);
}

/* ========== 세션 출석 (가족×세션 매트릭스) ========== */
export function setSessionAttendance(sessionId, familyMemberId, status) {
  ensure();
  if (!status) {
    getDb().prepare('DELETE FROM session_attendances WHERE session_id = ? AND family_member_id = ?')
      .run(sessionId, familyMemberId);
    return null;
  }
  getDb().prepare(`
    INSERT INTO session_attendances (session_id, family_member_id, status, updated_at)
    VALUES (?, ?, ?, datetime('now','localtime'))
    ON CONFLICT(session_id, family_member_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
  `).run(sessionId, familyMemberId, status);
  return { sessionId, familyMemberId, status };
}

/** 한 일정에 대한 모든 회원 가족의 세션별 출석 (실시간 명단/통계용) */
export function listEventSessionAttendances(eventId) {
  ensure();
  return toPlainArr(getDb().prepare(`
    SELECT sa.session_id, sa.family_member_id, sa.status,
           fm.name AS member_name, fm.type AS member_type, fm.age,
           u.id AS parent_user_id, u.name AS parent_name
    FROM session_attendances sa
    JOIN event_sessions s ON s.id = sa.session_id
    JOIN family_members fm ON fm.id = sa.family_member_id
    JOIN users u ON u.id = fm.parent_user_id
    WHERE s.event_id = ?
  `).all(eventId));
}

/** 내 가족(부모user_id 기준)의 특정 일정 세션 출석 — 그리드 초기 상태용 */
export function myFamilySessionStatus(eventId, parentUserId) {
  ensure();
  return toPlainArr(getDb().prepare(`
    SELECT sa.session_id, sa.family_member_id, sa.status
    FROM session_attendances sa
    JOIN family_members fm ON fm.id = sa.family_member_id
    JOIN event_sessions s ON s.id = sa.session_id
    WHERE s.event_id = ? AND fm.parent_user_id = ?
  `).all(eventId, parentUserId));
}

/* ========== 활동 포트폴리오 (CLAUDE.md 2-B) ========== */
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

function ensurePortfolioSeed() {
  const db = getDb();
  const n = db.prepare('SELECT COUNT(*) AS n FROM portfolio_items').get()?.n ?? 0;
  if (n > 0) return;
  const ins = db.prepare(
    'INSERT INTO portfolio_items (category, title, body, tag, position) VALUES (?, ?, ?, ?, ?)'
  );
  for (const cat of PORTFOLIO_CATEGORIES) {
    (PORTFOLIO_SEED[cat] || []).forEach((it, i) => {
      ins.run(cat, it.title, it.body || null, it.tag || null, (i + 1) * 10);
    });
  }
}

export function listPortfolioItems({ visibleOnly = false, category } = {}) {
  ensure();
  ensurePortfolioSeed();
  const conds = [];
  const args = [];
  if (visibleOnly) conds.push('visible = 1');
  if (category) { conds.push('category = ?'); args.push(category); }
  const where = conds.length ? ` WHERE ${conds.join(' AND ')}` : '';
  return toPlainArr(getDb().prepare(
    `SELECT * FROM portfolio_items${where} ORDER BY category ASC, position ASC, id ASC`
  ).all(...args));
}
export function getPortfolioItem(id) {
  ensure();
  return toPlain(getDb().prepare('SELECT * FROM portfolio_items WHERE id = ?').get(id));
}
export function createPortfolioItem(data) {
  ensure();
  const cat = PORTFOLIO_CATEGORIES.includes(data.category) ? data.category : 'adult';
  const max = getDb().prepare(
    'SELECT MAX(position) AS m FROM portfolio_items WHERE category = ?'
  ).get(cat)?.m ?? 0;
  const r = getDb().prepare(
    `INSERT INTO portfolio_items (category, title, body, tag, image_url, position, visible)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    cat,
    data.title,
    data.body ?? null,
    data.tag ?? null,
    data.image_url ?? null,
    (max + 10),
    data.visible === 0 ? 0 : 1
  );
  return getPortfolioItem(Number(r.lastInsertRowid));
}
export function updatePortfolioItem(id, data) {
  ensure();
  const cols = ['category', 'title', 'body', 'tag', 'image_url', 'position', 'visible'];
  const present = cols.filter((c) => data[c] !== undefined);
  if (!present.length) return getPortfolioItem(id);
  const sets = present.map((c) => `${c} = ?`).join(', ');
  getDb().prepare(
    `UPDATE portfolio_items SET ${sets}, updated_at = datetime('now','localtime') WHERE id = ?`
  ).run(...present.map((c) => data[c]), id);
  return getPortfolioItem(id);
}
export function deletePortfolioItem(id) {
  ensure();
  return getDb().prepare('DELETE FROM portfolio_items WHERE id = ?').run(id);
}
export function movePortfolioItem(id, dir) {
  ensure();
  const me = getPortfolioItem(id);
  if (!me) return null;
  const sibs = toPlainArr(getDb().prepare(
    'SELECT * FROM portfolio_items WHERE category = ? ORDER BY position ASC, id ASC'
  ).all(me.category));
  const idx = sibs.findIndex((s) => s.id === id);
  const swap = dir === 'up' ? sibs[idx - 1] : sibs[idx + 1];
  if (!swap) return null;
  getDb().prepare('UPDATE portfolio_items SET position = ? WHERE id = ?').run(swap.position, me.id);
  getDb().prepare('UPDATE portfolio_items SET position = ? WHERE id = ?').run(me.position, swap.id);
  return true;
}

/* ========== Public RSVP (외부인 신청) ========== */
export function createPublicRsvp(data) {
  ensure();
  const cols = ['event_id','name','email','phone','party_size','note'];
  const r = getDb().prepare(`INSERT INTO public_rsvps (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`)
    .run(...cols.map((c) => data[c] ?? null));
  return Number(r.lastInsertRowid);
}
export function listPublicRsvps(eventId) {
  ensure();
  return toPlainArr(getDb().prepare('SELECT * FROM public_rsvps WHERE event_id = ? ORDER BY created_at DESC').all(eventId));
}
