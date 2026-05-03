'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ApprovalRow({ user, family }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function action(kind) {
    if (kind === 'reject' && !confirm(`${user.name} 님의 신청을 반려할까요?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/${kind}`, { method: 'POST' });
      if (!res.ok) { alert('처리 실패'); setBusy(false); return; }
      router.refresh();
    } catch (e) {
      alert(e.message);
      setBusy(false);
    }
  }

  return (
    <article className="arc-item" style={{ gridTemplateColumns: '1fr auto' }}>
      <div className="arc-body">
        <h4>{user.name} <span style={{ fontSize: '.78rem', color: 'var(--muted)', fontWeight: 500 }}>· {user.email}</span></h4>
        <p>
          <strong>{user.family_role}</strong>
          {family.length > 0 && <> · 가족: {family.join(', ')}</>}
        </p>
        {user.motive && <p style={{ marginTop: 4, fontStyle: 'italic' }}>“{user.motive}”</p>}
        <small className="muted">신청일: {user.created_at}</small>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-ok btn-sm" disabled={busy} onClick={() => action('approve')}>승인</button>
        <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => action('reject')}>반려</button>
      </div>
    </article>
  );
}
