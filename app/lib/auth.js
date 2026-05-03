/**
 * 매직링크 기반 세션 인증 라이브러리.
 * - 비밀번호 없음. 이메일 → 1회용 토큰 → 세션 쿠키.
 * - Phase 1에서 메일 발송은 콘솔 출력 (실제 SMTP 미사용).
 * - RBAC 헬퍼 포함: requireMember / requireAdmin
 */
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb, migrate } from './db.js';

const SESSION_COOKIE = 'dd_sid';
const SESSION_TTL_DAYS = 30;
const MAGIC_TTL_MIN = 15;

export const ROLES = { GUEST: 0, PENDING: 1, MEMBER: 2, ADMIN: 3 };

let _migrated = false;
function ensureMigrated() {
  if (_migrated) return;
  migrate();
  _migrated = true;
}

function rand(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function nowISO() { return new Date().toISOString(); }
function plusMinutes(min) { return new Date(Date.now() + min * 60 * 1000).toISOString(); }
function plusDays(d) { return new Date(Date.now() + d * 86400 * 1000).toISOString(); }

/**
 * 매직링크 생성. 가입(name 등 추가) 또는 로그인 모두 동일 흐름.
 * 반환되는 url을 콘솔에 찍어 개발 시 클릭으로 인증.
 */
export function createMagicLink(email) {
  ensureMigrated();
  const db = getDb();
  const token = rand(24);
  db.prepare(
    'INSERT INTO magic_links (email, token, expires_at) VALUES (?, ?, ?)'
  ).run(email.toLowerCase().trim(), token, plusMinutes(MAGIC_TTL_MIN));
  return token;
}

/**
 * 매직링크 검증 → 세션 발행 → 쿠키 셋업
 * 가입 폼에서 넘어온 경우 user 정보로 신규 행 생성 (pending 상태).
 */
export function consumeMagicLink({ token, signupData }) {
  ensureMigrated();
  const db = getDb();

  const row = db.prepare(
    'SELECT * FROM magic_links WHERE token = ?'
  ).get(token);
  if (!row) return { ok: false, reason: 'invalid' };
  if (row.used_at) return { ok: false, reason: 'used' };
  if (new Date(row.expires_at) < new Date()) return { ok: false, reason: 'expired' };

  const email = row.email;
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user) {
    if (!signupData) return { ok: false, reason: 'no_user' };
    // family_members 폼 입력 — 신구 호환:
    //   신: [{ name, type, age }]   ← 새 회원가입 폼
    //   구: ['엄마','아빠']          ← 옛 폼 (테이블이 없을 때 사용된 JSON 배열)
    const fams = Array.isArray(signupData.family_members) ? signupData.family_members : [];
    const isStructured = fams.length && typeof fams[0] === 'object';
    // users.family_members JSON은 옛 호환용으로 이름만 남김
    const familyNamesJson = JSON.stringify(
      isStructured ? fams.map((f) => f.name) : fams
    );
    db.prepare(`
      INSERT INTO users (email, name, family_role, family_members, motive, is_approved, role_level)
      VALUES (?, ?, ?, ?, ?, 0, 1)
    `).run(
      email,
      signupData.name,
      signupData.family_role,
      familyNamesJson,
      signupData.motive || null
    );
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    // 정식 family_members 테이블에도 행 생성
    if (isStructured) {
      const ins = db.prepare(
        'INSERT INTO family_members (parent_user_id, name, type, age, position) VALUES (?, ?, ?, ?, ?)'
      );
      fams.forEach((f, i) => {
        ins.run(
          user.id,
          (f.name || '').trim() || `구성원 ${i + 1}`,
          ['부모', '자녀'].includes(f.type) ? f.type : '자녀',
          f.age != null ? Number(f.age) : null,
          i
        );
      });
    }
  }

  db.prepare('UPDATE magic_links SET used_at = ? WHERE id = ?').run(nowISO(), row.id);

  // 세션 발행
  const sid = rand(32);
  db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).run(sid, user.id, plusDays(SESSION_TTL_DAYS));

  cookies().set(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 86400,
    secure: process.env.NODE_ENV === 'production',
  });

  return { ok: true, user };
}

export function getCurrentUser() {
  ensureMigrated();
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const db = getDb();
  const sess = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sid);
  if (!sess) return null;
  if (new Date(sess.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sid);
    return null;
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(sess.user_id);
  return user || null;
}

export function logout() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (sid) {
    getDb().prepare('DELETE FROM sessions WHERE id = ?').run(sid);
  }
  cookies().delete(SESSION_COOKIE);
}

export function requireMember() {
  const u = getCurrentUser();
  if (!u || u.role_level < ROLES.MEMBER) return null;
  return u;
}
export function requireAdmin() {
  const u = getCurrentUser();
  if (!u || u.role_level < ROLES.ADMIN) return null;
  return u;
}

/**
 * 권한 검사 — 관리자는 모든 권한을 자동 보유.
 * 회원의 permissions JSON 배열에 perm 문자열이 있으면 통과.
 */
export function userPermissions(user) {
  if (!user) return [];
  if (user.role_level >= ROLES.ADMIN) return ['*'];
  try {
    const arr = JSON.parse(user.permissions || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
export function hasPermission(user, perm) {
  const list = userPermissions(user);
  return list.includes('*') || list.includes(perm);
}
/** 회원이고 perm을 가진 사람만 통과. 그 외엔 null 반환 */
export function requirePermission(perm) {
  const u = getCurrentUser();
  if (!u || u.role_level < ROLES.MEMBER) return null;
  if (!hasPermission(u, perm)) return null;
  return u;
}

/**
 * 보드 권한 체크 — board는 read_role / write_role / comments_enabled를 가짐.
 * isBoardWriterFn: (boardId, userId) => bool — DB 쿼리 주입.
 */
export function canReadBoard(board, user) {
  if (!board) return false;
  const role = user?.role_level ?? ROLES.GUEST;
  return role >= board.read_role;
}
export function canWriteBoard(board, user, isBoardWriterFn) {
  if (!board || !user) return false;
  if (user.role_level >= ROLES.ADMIN) return true;            // 관리자는 어디든
  if (user.role_level >= board.write_role) return true;       // 등급으로 충분
  if (isBoardWriterFn && isBoardWriterFn(board.id, user.id)) return true; // 개별 부여
  return false;
}

/** 매직링크 URL — Route Handler가 토큰 소비 + 리다이렉트 처리 */
export function buildMagicUrl(token) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${base}/api/auth/verify?token=${token}`;
}
