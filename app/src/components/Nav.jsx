import Link from 'next/link';
import { getCurrentUser, ROLES } from '@/lib/auth.js';
import { listBoards } from '@/lib/queries.js';

const SLUG_HREF = {
  about:       '/about',
  portfolio:   '/portfolio',
  calendar:    '/calendar',
  archive:     '/archive',
  members:     '/members',
  ai:          '/ai',
  photos:      '/photos',
  resources:   '/resources',
  assignments: '/assignments',
};

function hrefFor(b) {
  return SLUG_HREF[b.slug] || `/board/${b.slug}`;
}

export default function Nav() {
  const user = getCurrentUser();
  const isMember = user && user.role_level >= ROLES.MEMBER;
  const isAdmin = user && user.role_level >= ROLES.ADMIN;
  const isPending = user && user.role_level === ROLES.PENDING;
  const role = user?.role_level ?? ROLES.GUEST;

  const boards = listBoards({ visibleOnly: true })
    .filter((b) => b.read_role <= role);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">📚</span>
          <span className="brand-text">
            <strong>디적디적</strong>
            <small>Dijeok-Dijeok</small>
          </span>
        </Link>

        <nav className="topnav">
          {boards.map((b) => (
            <Link key={b.id} href={hrefFor(b)}>{b.name}</Link>
          ))}
          {isAdmin && <Link href="/admin" style={{ color: 'var(--primary-ink)', fontWeight: 700 }}>관리자</Link>}
        </nav>

        <div className="auth-area">
          {user ? (
            <>
              <span className="hello">
                안녕하세요, <strong>{user.name}</strong> 님
                {isAdmin && <span className="role-pill">관리자</span>}
                {!isAdmin && isMember && <span className="role-pill member">회원</span>}
                {isPending && <span className="role-pill pending">승인 대기</span>}
              </span>
              <form action="/api/auth/logout" method="post" style={{ display: 'inline' }}>
                <button type="submit" className="btn btn-ghost">로그아웃</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/signup" className="btn btn-outline">회원가입</Link>
              <Link href="/login" className="btn btn-primary">로그인</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
