import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/auth.js';
import { listUsers } from '@/lib/queries.js';

export const metadata = { title: '회원 명부 — 디적디적' };

export default async function MembersPage() {
  const me = await requireMember();
  if (!me) redirect('/login');

  const all = await listUsers();
  const members = all.filter((u) => u.role_level >= 2);

  return (
    <main className="layout single">
      <div className="content">
        <section className="card">
          <div className="card-head">
            <h2>회원 명부</h2>
            <span className="badge badge-warm">Members</span>
          </div>
          <p className="muted small">
            가족 단위 회원 정보입니다. 운영진과 회원이 서로의 가족 구성원을 보고 안부를 나눠요.
          </p>

          <div className="member-list">
            {members.map((u) => {
              let family = [];
              try { family = JSON.parse(u.family_members || '[]'); } catch {}
              return (
                <article key={u.id} className="member-card-info">
                  <div className="nm">
                    {u.name}
                    {u.role_level === 3 && <span className="role-pill" style={{ marginLeft: 6 }}>관리자</span>}
                  </div>
                  <div className="ro">{u.family_role}</div>
                  {family.length > 0 && (
                    <div className="fa">👨‍👩‍👧 {family.join(' · ')}</div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
