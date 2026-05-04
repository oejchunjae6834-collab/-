/**
 * 매직링크 기반 세션 인증 (Postgres).
 *
 * - 비밀번호 없음. 이메일 → 1회용 토큰 → 세션 쿠키.
 * - SMTP 미설정 시 콘솔 출력 (lib/email.js의 RESEND 폴백).
 * - 모든 함수 async.
 */
import crypto from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { query, queryOne, execute } from './db.js';

const SESSION_COOKIE = 'dd_sid';
const SESSION_TTL_DAYS = 30;
const MAGIC_TTL_MIN = 15;

export const ROLES = { GUEST: 0, PENDING: 1, MEMBER: 2, ADMIN: 3 };

function rand(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function nowISO() { return new Date().toISOString(); }
function plusMinutes(min) { return new Date(Date.now() + min * 60 * 1000).toISOString(); }
function plusDays(d) { return new Date(Date.now() + d * 86400 * 1000).toISOString(); }

/**
 * 매직링크 생성. 가입(name 등 추가) 또는 로그인 모두 동일 흐름.
 * 반환되는 토큰을 url에 담아 lib/email.js로 발송.
 */
export async function createMagicLink(email) {
  const token = rand(24);
  await execute(
    'INSERT INTO magic_links (email, token, expires_at) VALUES ($1, $2, $3)',
    [email.toLowerCase().trim(), token, plusMinutes(MAGIC_TTL_MIN)]
  );
  return token;
}

/**
 * 매직링크 검증 → 세션 발행 → 쿠키 셋업
 * 가입 폼에서 넘어온 경우 user 정보로 신규 행 생성 (pending 상태).
 */
export async function consumeMagicLink({ token, signupData }) {
  const row = await queryOne('SELECT * FROM magic_links WHERE token = $1', [token]);
  if (!row) return { ok: false, reason: 'invalid' };
  if (row.used_at) return { ok: false, reason: 'used' };
  if (new Date(row.expires_at) < new Date()) return { ok: false, reason: 'expired' };

  const email = row.email;
  let user = await queryOne('SELECT * FROM users WHERE email = $1', [email]);

  if (!user) {
    if (!signupData) return { ok: false, reason: 'no_user' };

    // family_members 폼 입력 호환 (신: [{name,type,age}], 구: ['엄마','아빠'])
    const fams = Array.isArray(signupData.family_members) ? signupData.family_members : [];
    const isStructured = fams.length && typeof fams[0] === 'object';
    const familyNamesJson = JSON.stringify(
      isStructured ? fams.map((f) => f.name) : fams
    );

    await execute(
      `INSERT INTO users (email, name, family_role, family_members, motive, is_approved, role_level)
       VALUES ($1, $2, $3, $4, $5, 0, 1)`,
      [
        email,
        signupData.name,
        signupData.family_role,
        familyNamesJson,
        signupData.motive || null,
      ]
    );
    user = await queryOne('SELECT * FROM users WHERE email = $1', [email]);

    if (isStructured) {
      for (let i = 0; i < fams.length; i++) {
        const f = fams[i];
        await execute(
          'INSERT INTO family_members (parent_user_id, name, type, age, position) VALUES ($1, $2, $3, $4, $5)',
          [
            user.id,
            (f.name || '').trim() || `구성원 ${i + 1}`,
            ['부모', '자녀'].includes(f.type) ? f.type : '자녀',
            f.age != null ? Number(f.age) : null,
            i,
          ]
        );
      }
    }
  }

  await execute('UPDATE magic_links SET used_at = $1 WHERE id = $2', [nowISO(), row.id]);

  // 세션 발행
  const sid = rand(32);
  await execute(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
    [sid, user.id, plusDays(SESSION_TTL_DAYS)]
  );

  // 세션 쿠키 설정: 프로덕션(HTTPS) 또는 개발(localhost)에서 작동하도록 구성
  const isProduction = process.env.NODE_ENV === 'production';
  cookies().set(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 86400,
    secure: isProduction, // HTTPS 환경에서만 secure=true
  });
  console.log(`[auth] 세션 쿠키 설정: ${SESSION_COOKIE} (secure=${isProduction}, maxAge=${SESSION_TTL_DAYS * 86400}s)`);

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

/**
 * 권한 검사 — 관리자는 모든 권한 자동 보유.
 * 회원의 permissions JSON 배열에 perm 문자열이 있으면 통과.
 * (동기 함수 — user 객체만 다룸)
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
export async function requirePermission(perm) {
  const u = await getCurrentUser();
  if (!u || u.role_level < ROLES.MEMBER) return null;
  if (!hasPermission(u, perm)) return null;
  return u;
}

/**
 * 보드 권한 체크. (동기 — board/user 객체만 다룸)
 */
export function canReadBoard(board, user) {
  if (!board) return false;
  const role = user?.role_level ?? ROLES.GUEST;
  return role >= board.read_role;
}
/**
 * 보드 글쓰기 권한 체크 (동기).
 * @param isWriterByGrant - 미리 계산한 board_writers 부여 여부 (await isBoardWriter(...) 결과)
 */
export function canWriteBoard(board, user, isWriterByGrant = false) {
  if (!board || !user) return false;
  if (user.role_level >= ROLES.ADMIN) return true;
  if (user.role_level >= board.write_role) return true;
  if (isWriterByGrant) return true;
  return false;
}

/**
 * 사이트의 외부 접근 URL을 반환.
 * 우선순위: NEXT_PUBLIC_BASE_URL > 현재 요청 헤더(x-forwarded-host/host) > 개발 환경 localhost
 * Render·Vercel 등 프록시 환경에서도 자동 동작.
 */
function cleanBaseUrl(value) {
  return value?.replace(/\/$/, '');
}

function isLocalBaseUrl(value) {
  if (!value) return false;
  try {
    const { hostname } = new URL(value);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return value.includes('localhost') || value.includes('127.0.0.1');
  }
}

function getHeaderValue(source, name) {
  if (!source) return null;
  if (typeof source.get === 'function') return source.get(name);
  return source[name] || null;
}

function getBaseFromHeaders(source) {
  const host = getHeaderValue(source, 'x-forwarded-host') || getHeaderValue(source, 'host');
  if (!host) return null;

  const proto = getHeaderValue(source, 'x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export function getSiteBase(requestOrHeaders) {
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  const requestHeaders = requestOrHeaders?.headers || requestOrHeaders;
  const baseFromRequest = getBaseFromHeaders(requestHeaders);

  if (env) {
    const url = cleanBaseUrl(env);
    if (isLocalBaseUrl(url) && baseFromRequest && !isLocalBaseUrl(baseFromRequest)) {
      console.warn('[auth] getSiteBase: ignoring localhost NEXT_PUBLIC_BASE_URL because request host is public');
      return baseFromRequest;
    }
    if (process.env.NODE_ENV !== 'development' && isLocalBaseUrl(url)) {
      throw new Error('NEXT_PUBLIC_BASE_URL points to localhost outside development.');
    }
    console.log('[auth] getSiteBase: NEXT_PUBLIC_BASE_URL =', url);
    return url;
  }

  if (baseFromRequest) {
    console.log('[auth] getSiteBase: request headers =', baseFromRequest);
    return baseFromRequest;
  }
  try {
    const h = headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    if (host) {
      const proto = h.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      const url = `${proto}://${host}`;
      console.log('[auth] getSiteBase: 요청 헤더에서 =', url);
      return url;
    }
  } catch (e) {
    console.log('[auth] getSiteBase: headers() 호출 불가 (request 컨텍스트 외부?):', e.message);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Unable to determine public site URL. Set NEXT_PUBLIC_BASE_URL or call getSiteBase with a request.');
  }

  console.log('[auth] getSiteBase: localhost로 폴백');
  return 'http://localhost:3000';
}

/** 매직링크 URL — Route Handler가 토큰 소비 + 리다이렉트 처리 */
export function buildMagicUrl(token, requestOrHeaders) {
  const url = new URL('/api/auth/verify', getSiteBase(requestOrHeaders));
  url.searchParams.set('token', token);
  return url.toString();
}
