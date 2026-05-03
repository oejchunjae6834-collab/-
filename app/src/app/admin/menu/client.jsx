'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const TYPE_OPTIONS = [
  { value: 'article',    label: '게시판 (글)' },
  { value: 'gallery',    label: '사진첩' },
  { value: 'file',       label: '자료실' },
  { value: 'assignment', label: '과제방' },
  { value: 'custom',     label: '기타' },
];
const ROLE_OPTIONS = [
  { value: 0, label: '게스트(누구나)' },
  { value: 2, label: '회원만' },
  { value: 3, label: '관리자만' },
];

const EMPTY = {
  slug: '', name: '', type: 'article', description: '',
  read_role: 2, write_role: 3, comments_enabled: 1, visible: 1,
  position: 100,
};

export default function MenuAdmin({ initialBoards, allMembers }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  async function call(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || '오류');
      return null;
    }
    return res.json();
  }

  async function save() {
    setBusy(true);
    try {
      const payload = {
        slug: editing.slug, name: editing.name, type: editing.type, description: editing.description,
        read_role: editing.read_role, write_role: editing.write_role,
        comments_enabled: editing.comments_enabled ? 1 : 0,
        visible: editing.visible ? 1 : 0,
      };
      const ok = editing.id
        ? await call('PUT', `/api/admin/boards/${editing.id}`, payload)
        : await call('POST', `/api/admin/boards`, payload);
      if (ok) { setEditing(null); router.refresh(); }
    } finally { setBusy(false); }
  }

  async function move(id, dir) {
    await call('POST', `/api/admin/boards/${id}/move`, { dir });
    router.refresh();
  }
  async function toggleVisible(b) {
    await call('PUT', `/api/admin/boards/${b.id}`, { visible: b.visible ? 0 : 1 });
    router.refresh();
  }
  async function toggleComments(b) {
    await call('PUT', `/api/admin/boards/${b.id}`, { comments_enabled: b.comments_enabled ? 0 : 1 });
    router.refresh();
  }
  async function remove(b) {
    if (b.is_system) { alert('시스템 보드는 삭제할 수 없어요'); return; }
    if (!confirm(`${b.name} 메뉴와 그 안의 모든 게시물을 삭제할까요?`)) return;
    await call('DELETE', `/api/admin/boards/${b.id}`);
    router.refresh();
  }
  async function addWriter(b, userId) {
    await call('POST', `/api/admin/boards/${b.id}/writers`, { user_id: userId });
    router.refresh();
  }
  async function removeWriter(b, userId) {
    await call('DELETE', `/api/admin/boards/${b.id}/writers/${userId}`);
    router.refresh();
  }

  const sysCount = initialBoards.filter((b) => b.is_system).length;

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>🧭 메뉴 (보드) 관리</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...EMPTY })}>+ 메뉴 추가</button>
        </div>
        <p className="muted small">
          상단 네비게이션에 노출될 메뉴를 직접 관리해요. ↑↓ 로 순서 변경, 👁로 노출/숨김,
          💬로 댓글 기능 토글. 시스템 보드(소개·일정 등 {sysCount}개)는 삭제할 수 없어요.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {initialBoards.map((b, i) => (
            <article key={b.id} className={`menu-row ${!b.visible ? 'disabled' : ''}`}>
              <div className="menu-position">{i + 1}</div>
              <div>
                <div className="menu-name">
                  {b.name}
                  <small style={{ marginLeft: 6, color: 'var(--muted)', fontWeight: 500 }}>/{b.slug}</small>
                  {b.is_system ? <span className="ev-pill" style={{ marginLeft: 6, background: 'var(--accent-soft)' }}>시스템</span> : null}
                </div>
                <div className="menu-meta">
                  유형: <strong>{TYPE_OPTIONS.find((o) => o.value === b.type)?.label || b.type}</strong>
                  {' '}· 읽기: <strong>{ROLE_OPTIONS.find((o) => o.value === b.read_role)?.label}</strong>
                  {' '}· 쓰기: <strong>{ROLE_OPTIONS.find((o) => o.value === b.write_role)?.label}</strong>
                  {' '}· 댓글: <strong>{b.comments_enabled ? '켜짐' : '꺼짐'}</strong>
                  {b.writers?.length > 0 && (
                    <> {' '}· 글쓰기 위임: <strong>{b.writers.map((w) => w.name).join(', ')}</strong></>
                  )}
                </div>
              </div>
              <div className="menu-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => move(b.id, 'up')} disabled={i === 0}>↑</button>
                <button className="btn btn-ghost btn-sm" onClick={() => move(b.id, 'down')} disabled={i === initialBoards.length - 1}>↓</button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleVisible(b)} title="노출 토글">{b.visible ? '👁' : '🙈'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleComments(b)} title="댓글 토글">{b.comments_enabled ? '💬' : '🚫'}</button>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing({ ...b })}>✎</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(b)} disabled={!!b.is_system}>🗑</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {editing && (
        <section className="card">
          <div className="card-head">
            <h3>{editing.id ? `메뉴 수정 — ${editing.name}` : '새 메뉴 만들기'}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>✕</button>
          </div>
          <div className="form-grid">
            <label>
              <span>표시 이름 <em>*</em></span>
              <input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="예: 우리 사진" />
            </label>
            <label>
              <span>경로 슬러그 <em>*</em></span>
              <input
                type="text"
                value={editing.slug}
                disabled={!!editing.is_system}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value.replace(/[^a-z0-9_-]/g, '') })}
                placeholder="photos"
              />
              <small className="muted">URL에 쓰여요. 영문 소문자/숫자/-만 가능</small>
            </label>
            <label>
              <span>유형 <em>*</em></span>
              <select
                value={editing.type}
                disabled={!!editing.is_system}
                onChange={(e) => setEditing({ ...editing, type: e.target.value })}
              >
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label>
              <span>읽기 권한</span>
              <select value={editing.read_role} onChange={(e) => setEditing({ ...editing, read_role: parseInt(e.target.value, 10) })}>
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label>
              <span>글쓰기 권한 (기본)</span>
              <select value={editing.write_role} onChange={(e) => setEditing({ ...editing, write_role: parseInt(e.target.value, 10) })}>
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="full">
              <span>설명</span>
              <input type="text" value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </label>
            <label>
              <span>
                <input type="checkbox" checked={!!editing.comments_enabled} onChange={(e) => setEditing({ ...editing, comments_enabled: e.target.checked ? 1 : 0 })} />
                {' '}💬 댓글 허용
              </span>
            </label>
            <label>
              <span>
                <input type="checkbox" checked={!!editing.visible} onChange={(e) => setEditing({ ...editing, visible: e.target.checked ? 1 : 0 })} />
                {' '}👁 메뉴에 노출
              </span>
            </label>
            <div className="form-actions full">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>취소</button>
              <button className="btn btn-primary" disabled={busy || !editing.name || !editing.slug} onClick={save}>저장</button>
            </div>
          </div>

          {editing.id && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
              <h4>👤 글쓰기 권한 위임</h4>
              <p className="muted small">
                기본 글쓰기 권한이 충분하지 않은 회원에게도 이 보드에 글을 쓸 수 있도록 개별 부여할 수 있어요.
              </p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {(editing.writers || []).map((w) => (
                  <span key={w.user_id} className="cloud-item lg">
                    {w.name}{' '}
                    <button
                      type="button"
                      style={{ marginLeft: 4, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--danger)' }}
                      onClick={() => removeWriter(editing, w.user_id)}
                    >×</button>
                  </span>
                ))}
                {(editing.writers || []).length === 0 && <span className="muted small">없음</span>}
              </div>
              <select
                onChange={(e) => {
                  const id = parseInt(e.target.value, 10);
                  if (id) addWriter(editing, id);
                  e.target.value = '';
                }}
                defaultValue=""
                style={{ padding: 8, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--bg-soft)' }}
              >
                <option value="" disabled>+ 회원 추가…</option>
                {allMembers.filter((m) => !(editing.writers || []).some((w) => w.user_id === m.id)).map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                ))}
              </select>
            </div>
          )}
        </section>
      )}
    </>
  );
}
