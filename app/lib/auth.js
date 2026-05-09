/**
 * 아이디·비밀번호 기반 세션 인증 (Postgres).
 *
 * - users.username + users.password_hash 로 로그인.
 * - scrypt 해시(lib/password.js).
 * - 세션은 sessions 테이블 + 'dd_sid' httpOnly 쿠키.
 */
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { queryOne, execute } from './db.js';
import { hashPassword, verifyPassword } from './password.js';

const SESSION_COOKIE = 'dd_sid';
const SESSION_TTL_DAYS = 30;

export const ROLES = { GUEST: 0, PENDING: 1, MEMBER: 2, ADMIN: 3 };

export const SCHOOL_OPTIONS = [
  '유치원',
  '초1','초2','초3','초4','초5','초6',
  '중1','중2','중3',
  '고1','고2','고3',
];

function rand(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
function plusDays(d) { return new Date(Date.now() + d * 86400 * 1000).toISOString(); }

function normalizeSchool(value) {
  if (!value) return null;
  return SCHOOL_OPTIONS.includes(value) ? value : null;
}

async function issueSession(userId) {
  const sid = rand(32);
  await execute(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
    [sid, userId, plusDays(SESSION_TTL_DAYS)]
  );
  const isProduction = process.env.NODE_ENV === 'production';
  cookies().set(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 86400,
    secure: isProduction,
  });
  return sid;
}

/** 아이디·비밀번호 로그인. username 또는 email 입력 모두 허용. */
export async function loginWithPassword({ username, password }) {
  const id = (username || '').trim();
  if (!id || !password) return { ok: false, reason: 'missing' };
  const lookup = id.toLowerCase();
  const user = await queryOne(
    'SELECT * FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $1',
    [lookup]
  );
  if (!user || !user.password_hash) return { ok: false, reason: 'invalid' };
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return { ok: false, reason: 'invalid' };
  await issueSession(user.id);
  return { ok: true, user };
}

/**
 * 신규 회원가입: users 행 + family_members 일괄 생성, 즉시 세션 발행.
 * 가입 직후 role_level=1 (승인 대기). 관리자가 승인 후 정회원으로 전환.
 */
export async function signupWithPassword(data) {
  const email = (data.email || '').toLowerCase().trim();
  const username = (data.username || '').trim();
  const password = data.password || '';
  const name = (data.name || '').trim();
  const familyRole = (data.family_role || '').trim();

  if (!email.includes('@')) return { ok: false, reason: '유효한 이메일을 입력해 주세요' };
  if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(username)) {
    return { ok: false, reason: '아이디는 영문/숫자/._- 조합 3~20자' };
  }
  if (password.length < 6) return { ok: false, reason: '비밀번호는 6자 이상이어야 해요' };
  if (!name || !familyRole) return { ok: false, reason: '이름과 가족 형태는 필수예요' };

  const dupEmail = await queryOne('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
  if (dupEmail) return { ok: false, reason: '이미 가입된 이메일이에요' };
  const dupName = await queryOne('SELECT id FROM users WHERE LOWER(username) = $1', [username.toLowerCase()]);
  if (dupName) return { ok: false, reason: '이미 사용 중인 아이디예요' };

  const password_hash = await hashPassword(password);
  const fams = Array.isArray(data.family_members) ? data.family_members : [];
  const familyNamesJson = JSON.stringify(fams.map((f) => f.name).filter(Boolean));

  const inserted = await queryOne(
    `INSERT INTO users (email, username, password_hash, name, family_role, family_members, motive, is_approved, role_level)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 1)
     RETURNING *`,
    [email, username, password_hash, name, familyRole, familyNamesJson, data.motive || null]
  );
  const user = inserted;

  for (let i = 0; i < fams.length; i++) {
    const f = fams[i];
    const memberName = (f.name || '').trim();
    if (!memberName) continue;
    const type = ['부모', '자녀'].includes(f.type) ? f.type : '자녀';
    const school = type === '자녀' ? normalizeSchool(f.school) : null;
    await execute(
      'INSERT INTO family_members (parent_user_id, name, type, school, position) VALUES ($1, $2, $3, $4, $5)',
      [user.id, memberName, type, school, i]
    );
  }

  await issueSession(user.id);
  return { ok: true, user };
}

export async function getCurrentUser() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const sess = await queryOne('SELECT * FROM sessions WHERE id = $1', [sid]);
  if (!sess) return null;
  if (new Date(sess.expires_at) < new Date()) {
    await execute('DELETE FROM sessions WHERE id = $1', [sid]);
    return null;
  }
  return queryOne('SELECT * FROM users WHERE id = $1', [sess.user_id]);
}

export async function logout() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (sid) {
    await execute('DELETE FROM sessions WHERE id = $1', [sid]);
  }
  cookies().delete(SESSION_COOKIE);
}

export async function requireMember() {
  const u = await getCurrentUser();
  if (!u || u.role_level < ROLES.MEMBER) return null;
  return u;
}
export async function requireAdmin() {
  const u = await getCurrentUser();
  if (!u || u.role_level < ROLES.ADMIN) return null;
  return u;
}

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
export async function requirePermission(perm) {
  const u = await getCurrentUser();
  if (!u || u.role_level < ROLES.MEMBER) return null;
  if (!hasPermission(u, perm)) return null;
  return u;
}

export function canReadBoard(board, user) {
  if (!board) return false;
  const role = user?.role_level ?? ROLES.GUEST;
  return role >= board.read_role;
}
export function canWriteBoard(board, user, isWriterByGrant = false) {
  if (!board || !user) return false;
  if (user.role_level >= ROLES.ADMIN) return true;
  if (user.role_level >= board.write_role) return true;
  if (isWriterByGrant) return true;
  return false;
}
