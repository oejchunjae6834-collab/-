'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ALL_PERMS = [
  { key: 'write_archive',     label: '글쓰기 (아카이브)',  hint: '회의록·후기 글을 직접 작성/수정/삭제할 수 있어요' },
  { key: 'write_events',      label: '일정 추가',          hint: '일정을 추가하고 수정할 수 있어요' },
  { key: 'moderate_comments', label: '댓글 관리',          hint: '다른 회원의 댓글을 삭제할 수 있어요' },
];

const ROLE_LABEL = { 0: '게스트', 1: '승인 대기', 2: '회원', 3: '관리자' };

const SCHOOL_OPTIONS = [
  '유치원',
  '초1','초2','초3','초4','초5','초6',
  '중1','중2','중3',
  '고1','고2','고3',
];

function roleColor(level) {
  if (level >= 3) return 'var(--primary)';
  if (level === 2) return 'var(--accent)';
  if (level === 1) return 'var(--warm)';
  return 'var(--muted)';
}

export default function MembersAdmin({ initialUsers }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  // 새 가족 입력 상태
  const [newFam, setNewFam] = useState({ name: '', type: '자녀', school: '' });

  function open(u) {
    setEditing({
      id: u.id,
      name: u.name,
      email: u.email,
      family_role: u.family_role || '',
      role_level: u.role_level,
      is_approved: u.is_approved,
      permissions: u.permissions_arr || [],
      family_rows: u.family_rows || [],
    });
    setNewFam({ name: '', type: '자녀', school: '' });
  }

  function togglePerm(p) {
    setEditing((s) => ({
      ...s,
      permissions: s.permissions.includes(p)
        ? s.permissions.filter((x) => x !== p)
        : [...s.permissions, p],
    }));
  }

  async function save() {
    setBusy(true);
    try {
      const payload = {
        name: editing.name,
        email: editing.email,
        family_role: editing.family_role,
        role_level: editing.role_level,
        is_approved: editing.role_level >= 2 ? 1 : editing.is_approved,
        permissions: JSON.stringify(editing.permissions),
      };
      const res = await fetch(`/api/admin/users/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || '저장 실패');
        return;
      }
      setEditing(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(u) {
    if (u.role_level >= 3) { alert('관리자는 직접 삭제할 수 없어요. 먼저 권한을 회원으로 낮춰주세요.'); return; }
    if (!confirm(`${u.name} 님을 삭제할까요? 출석/댓글/가족 기록도 함께 사라져요.`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
    if (!res.ok) { alert('삭제 실패'); return; }
    router.refresh();
  }

  /* ---- 가족 구성원 관리 ---- */
  async function addFamily() {
    if (!newFam.name.trim()) return;
    const res = await fetch('/api/family-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parent_user_id: editing.id,
        name: newFam.name.trim(),
        type: newFam.type,
        school: newFam.type === '자녀' ? (newFam.school || null) : null,
      }),
    });
    if (!res.ok) { alert('추가 실패'); return; }
    const data = await res.json();
    setEditing((s) => ({ ...s, family_rows: [...s.family_rows, data.member] }));
    setNewFam({ name: '', type: '자녀', school: '' });
  }
  async function removeFamily(id) {
    if (!confirm('이 가족 구성원을 삭제할까요? 출석 기록도 함께 사라져요.')) return;
    const res = await fetch(`/api/family-members/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('삭제 실패'); return; }
    setEditing((s) => ({ ...s, family_rows: s.family_rows.filter((f) => f.id !== id) }));
  }

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>회원 정보 · 권한 관리</h2>
          <span className="badge badge-warm">{initialUsers.length}명</span>
        </div>
        <p className="muted small">
          이름·이메일·가족 정보·가족 구성원·권한·등급 모두 관리할 수 있어요. 가족 구성원이 등록돼야 일정의 세션별 출석 체크가 가능해요.
        </p>

        <div className="archive-list">
          {initialUsers.map((u) => (
            <article key={u.id} className="arc-item" style={{ gridTemplateColumns: '1fr auto' }}>
              <div className="arc-body">
                <h4>
                  {u.name}{' '}
                  <span style={{
                    fontSize: '.72rem', padding: '2px 8px', borderRadius: 999,
                    background: roleColor(u.role_level), color: '#fff',
                    fontWeight: 700, letterSpacing: '.04em', verticalAlign: 2,
                  }}>{ROLE_LABEL[u.role_level]}</span>
                  {!u.is_approved && u.role_level >= 1 && (
                    <span style={{ marginLeft: 4, fontSize: '.78rem', color: 'var(--warm)', fontWeight: 600 }}>· 미승인</span>
                  )}
                </h4>
                <p>
                  {u.email} · <strong>{u.family_role || '미지정'}</strong>
                  {u.family_rows?.length > 0 && (
                    <> · 가족 {u.family_rows.length}명: {u.family_rows.map((f) => f.name).join(', ')}</>
                  )}
                </p>
                {u.permissions_arr?.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {u.permissions_arr.map((p) => (
                      <span key={p} className="arc-tag tone-friendly">🔑 {ALL_PERMS.find((x) => x.key === p)?.label || p}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button className="btn btn-outline btn-sm" onClick={() => open(u)}>✎ 수정</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(u)}>🗑 삭제</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {editing && (
        <section className="card">
          <div className="card-head">
            <h3>회원 정보 수정 — {editing.name}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>✕ 닫기</button>
          </div>
          <div className="form-grid">
            <label>
              <span>이름 <em>*</em></span>
              <input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label>
              <span>이메일 <em>*</em></span>
              <input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            </label>
            <label>
              <span>가족 형태</span>
              <select value={editing.family_role || ''} onChange={(e) => setEditing({ ...editing, family_role: e.target.value })}>
                <option value="">선택</option>
                <option>학부모</option>
                <option>아이</option>
                <option>운영진</option>
                <option>외부 강사</option>
              </select>
            </label>
            <label>
              <span>등급</span>
              <select value={editing.role_level} onChange={(e) => setEditing({ ...editing, role_level: parseInt(e.target.value, 10) })}>
                <option value="1">승인 대기</option>
                <option value="2">회원</option>
                <option value="3">관리자</option>
              </select>
            </label>
          </div>

          {/* ---- 가족 구성원 ---- */}
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
            <h4>👨‍👩‍👧 가족 구성원 ({editing.family_rows?.length || 0}명)</h4>
            <p className="muted small">세션 출석 체크는 여기 등록된 가족 단위로 이뤄져요.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {(editing.family_rows || []).map((f) => (
                <div key={f.id} style={{
                  display: 'grid', gridTemplateColumns: '24px 1fr 80px 60px 30px',
                  gap: 8, alignItems: 'center',
                  padding: 8, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--line)',
                }}>
                  <span>{f.type === '부모' ? '👤' : '🧒'}</span>
                  <strong>{f.name}</strong>
                  <span className="muted small">{f.type}</span>
                  <span className="muted small">{f.school || ''}</span>
                  <button type="button" className="icon-btn icon-danger" title="삭제" onClick={() => removeFamily(f.id)}>×</button>
                </div>
              ))}
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px',
              gap: 8, alignItems: 'center', marginTop: 10,
            }}>
              <input type="text" placeholder="이름" value={newFam.name} onChange={(e) => setNewFam({ ...newFam, name: e.target.value })}
                style={{ padding: 8, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--bg-soft)' }}
              />
              <select value={newFam.type} onChange={(e) => setNewFam({ ...newFam, type: e.target.value, school: e.target.value === '부모' ? '' : newFam.school })}
                style={{ padding: 8, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--bg-soft)' }}
              >
                <option>자녀</option>
                <option>부모</option>
              </select>
              <select value={newFam.school} onChange={(e) => setNewFam({ ...newFam, school: e.target.value })}
                disabled={newFam.type !== '자녀'}
                style={{ padding: 8, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--bg-soft)' }}
              >
                <option value="">{newFam.type === '자녀' ? '학교·학년' : '—'}</option>
                {SCHOOL_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="button" className="btn btn-primary btn-sm" onClick={addFamily} disabled={!newFam.name.trim()}>+ 추가</button>
            </div>
          </div>

          {/* ---- 권한 ---- */}
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
            <h4>🔑 추가 권한 부여</h4>
            <p className="muted small">관리자는 자동으로 모든 권한 보유. 회원에게 글쓰기 등 일부 권한만 위임할 때 사용.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {ALL_PERMS.map((p) => {
                const checked = editing.permissions.includes(p.key);
                const isAdmin = editing.role_level >= 3;
                return (
                  <label key={p.key} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: 12, border: '1px solid var(--line)', borderRadius: 10,
                    background: 'var(--bg)', cursor: isAdmin ? 'not-allowed' : 'pointer',
                    opacity: isAdmin ? .55 : 1,
                  }}>
                    <input type="checkbox" checked={isAdmin || checked} disabled={isAdmin} onChange={() => togglePerm(p.key)} style={{ marginTop: 3 }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>🔑 {p.label}</div>
                      <small className="muted" style={{ fontWeight: 400 }}>{p.hint}</small>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>닫기</button>
            <button className="btn btn-primary" disabled={busy} onClick={save}>저장</button>
          </div>
        </section>
      )}
    </>
  );
}
