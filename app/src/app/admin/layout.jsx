import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth.js';

export default async function AdminLayout({ children }) {
  const me = await requireAdmin();
  if (!me) redirect('/login');

  return (
    <main className="layout">
      <div className="content">{children}</div>
      <aside className="sidebar">
        <section className="card sticky">
          <div className="card-head"><h3>관리자 메뉴</h3></div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Link href="/admin" className="chip" style={{ textAlign: 'left' }}>📊 대시보드</Link>
            <Link href="/admin/menu" className="chip" style={{ textAlign: 'left' }}>🧭 메뉴(보드) 관리</Link>
            <Link href="/admin/approvals" className="chip" style={{ textAlign: 'left' }}>👤 가입 승인</Link>
            <Link href="/admin/members" className="chip" style={{ textAlign: 'left' }}>👥 회원 정보 · 권한</Link>
            <Link href="/admin/events" className="chip" style={{ textAlign: 'left' }}>📅 일정 관리</Link>
            <Link href="/admin/archive" className="chip" style={{ textAlign: 'left' }}>📚 아카이브 관리</Link>
            <Link href="/admin/portfolio" className="chip" style={{ textAlign: 'left' }}>🎨 활동 포트폴리오</Link>
            <Link href="/admin/cms" className="chip" style={{ textAlign: 'left' }}>✏️ CMS (랜딩 텍스트)</Link>
          </nav>
        </section>
      </aside>
    </main>
  );
}
