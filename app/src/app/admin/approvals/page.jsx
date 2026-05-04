import { listUsers } from '@/lib/queries.js';
import ApprovalRow from './row.jsx';

export const metadata = { title: '가입 승인 — 디적디적 관리자' };

export default async function ApprovalsPage() {
  const pending = await listUsers({ pendingOnly: true });

  return (
    <section className="card">
      <div className="card-head">
        <h2>가입 승인 대기</h2>
        <span className="badge badge-warm">{pending.length}명 대기</span>
      </div>
      <p className="muted small">
        가입 신청자를 확인하고 정회원 권한을 부여하거나 반려해 주세요.
      </p>

      {pending.length === 0 ? (
        <p className="muted small mt">대기 중인 신청이 없어요.</p>
      ) : (
        <div className="archive-list">
          {pending.map((u) => {
            let family = [];
            try { family = JSON.parse(u.family_members || '[]'); } catch {}
            return (
              <ApprovalRow key={u.id} user={u} family={family} />
            );
          })}
        </div>
      )}
    </section>
  );
}
