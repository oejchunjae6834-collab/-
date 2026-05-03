import Link from 'next/link';
import { listUsers, listEvents, listArchive } from '@/lib/queries.js';

export default function AdminDashboard() {
  const users = listUsers();
  const pending = users.filter((u) => u.is_approved === 0);
  const members = users.filter((u) => u.role_level >= 2);
  const events = listEvents();
  const upcomingCount = events.filter((e) => new Date(e.start_date) >= new Date()).length;
  const docs = listArchive();

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>대시보드</h2>
          <span className="badge badge-warm">Admin</span>
        </div>
        <div className="three-col">
          <div className="mini">
            <div className="mini-emoji">👤</div>
            <h4>가입 승인 대기</h4>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-ink)', margin: '4px 0' }}>{pending.length}</p>
            <Link href="/admin/approvals" className="btn btn-outline btn-sm">처리하러 가기 →</Link>
          </div>
          <div className="mini">
            <div className="mini-emoji">📅</div>
            <h4>예정된 일정</h4>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent)', margin: '4px 0' }}>{upcomingCount}</p>
            <Link href="/admin/events" className="btn btn-outline btn-sm">일정 관리 →</Link>
          </div>
          <div className="mini">
            <div className="mini-emoji">📚</div>
            <h4>아카이브 글</h4>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--ink)', margin: '4px 0' }}>{docs.length}</p>
            <Link href="/admin/archive" className="btn btn-outline btn-sm">관리하러 가기 →</Link>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h3>현재 회원 ({members.length}명)</h3>
        </div>
        <div className="member-list">
          {members.map((u) => (
            <article key={u.id} className="member-card-info">
              <div className="nm">
                {u.name}
                {u.role_level === 3 && <span className="role-pill" style={{ marginLeft: 6 }}>관리자</span>}
              </div>
              <div className="ro">{u.family_role} · {u.email}</div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
