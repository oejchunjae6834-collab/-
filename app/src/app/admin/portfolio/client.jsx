'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

const CATEGORIES = [
  { key: 'adult', label: '🎯 어른 공부 모임' },
  { key: 'kids',  label: '🎨 아이들 활동' },
  { key: 'math',  label: '📐 수학이랑 놀자' },
  { key: 'play',  label: '🤝 공동체 놀이' },
];

const EMPTY = {
  id: null,
  category: 'adult',
  title: '',
  body: '',
  tag: '',
  image_url: '',
  visible: 1,
};

export default function PortfolioAdmin({ initialItems }) {
  const router = useRouter();
  const [tab, setTab] = useState('adult');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  const items = initialItems.filter((i) => i.category === tab);

  function openNew() {
    setEditing({ ...EMPTY, category: tab });
  }

  async function uploadOne(file) {
    if (!file) return;
    setUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'image');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { alert(data.error || '업로드 실패'); return; }
      setEditing((s) => ({ ...s, image_url: data.url }));
    } finally {
      setUploadBusy(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) uploadOne(f);
  }

  async function save() {
    if (!editing.title.trim()) { alert('제목을 입력해주세요'); return; }
    setBusy(true);
    try {
      const payload = {
        category: editing.category,
        title: editing.title,
        body: editing.body || null,
        tag: editing.tag || null,
        image_url: editing.image_url || null,
        visible: editing.visible ? 1 : 0,
      };
      const method = editing.id ? 'PUT' : 'POST';
      const url = editing.id ? `/api/admin/portfolio/${editing.id}` : '/api/admin/portfolio';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || '저장 실패');
        return;
      }
      setEditing(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(it) {
    if (!confirm(`"${it.title}" 항목을 삭제할까요?`)) return;
    const res = await fetch(`/api/admin/portfolio/${it.id}`, { method: 'DELETE' });
    if (!res.ok) { alert('삭제 실패'); return; }
    router.refresh();
  }

  async function move(it, dir) {
    const res = await fetch(`/api/admin/portfolio/${it.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ move: dir }),
    });
    if (!res.ok) { alert('이동 실패'); return; }
    router.refresh();
  }

  async function toggleVisible(it) {
    const res = await fetch(`/api/admin/portfolio/${it.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: it.visible ? 0 : 1 }),
    });
    if (!res.ok) { alert('변경 실패'); return; }
    router.refresh();
  }

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>활동 포트폴리오 관리</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/portfolio" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">↗ 공개 페이지 보기</a>
            <button className="btn btn-primary btn-sm" onClick={openNew}>+ 새 활동 추가</button>
          </div>
        </div>
        <p className="muted small">
          비회원에게 노출되는 <strong>/portfolio</strong> 페이지의 카드를 직접 만들고 정렬할 수 있어요. 사진을 첨부하면 카드 위쪽에 표시됩니다.
        </p>

        <div className="tabs" style={{ marginTop: 8 }}>
          {CATEGORIES.map((c) => {
            const n = initialItems.filter((i) => i.category === c.key).length;
            return (
              <button
                key={c.key}
                className={`tab ${tab === c.key ? 'active' : ''}`}
                onClick={() => setTab(c.key)}
              >
                {c.label} <span className="muted">({n})</span>
              </button>
            );
          })}
        </div>

        <div className="archive-list" style={{ marginTop: 12 }}>
          {items.length === 0 && (
            <p className="muted">이 카테고리에는 아직 활동이 없어요. 우측 상단의 "+ 새 활동 추가" 버튼을 눌러 시작해보세요.</p>
          )}
          {items.map((it, idx) => (
            <article
              key={it.id}
              className="arc-item"
              style={{ gridTemplateColumns: '80px 1fr auto', opacity: it.visible ? 1 : 0.5 }}
            >
              <div>
                {it.image_url
                  ? <img src={it.image_url} alt="" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 8 }} />
                  : <div style={{ width: 70, height: 70, borderRadius: 8, background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🖼️</div>
                }
              </div>
              <div className="arc-body">
                <h4>
                  {it.title}
                  {!it.visible && <span className="role-pill pending" style={{ marginLeft: 6 }}>숨김</span>}
                </h4>
                <p>{it.body}</p>
                {it.tag && <small className="muted">#{it.tag}</small>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" disabled={idx === 0} onClick={() => move(it, 'up')}>↑</button>
                  <button className="btn btn-ghost btn-sm" disabled={idx === items.length - 1} onClick={() => move(it, 'down')}>↓</button>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing({ ...it, visible: it.visible ? 1 : 0 })}>✎ 수정</button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleVisible(it)}>
                  {it.visible ? '👁 숨기기' : '👁 보이기'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(it)}>🗑 삭제</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {editing && (
        <section className="card">
          <div className="card-head">
            <h3>{editing.id ? '활동 수정' : '새 활동 추가'}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>✕ 닫기</button>
          </div>
          <div className="form-grid">
            <label>
              <span>카테고리 <em>*</em></span>
              <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </label>
            <label>
              <span>태그 (예: 4월, 수시)</span>
              <input
                type="text"
                value={editing.tag || ''}
                onChange={(e) => setEditing({ ...editing, tag: e.target.value })}
                placeholder="2026 진행중 / 4월 / 신입 환영 등"
              />
            </label>
            <label className="full">
              <span>제목 <em>*</em></span>
              <input
                type="text"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </label>
            <label className="full">
              <span>활동 내용</span>
              <textarea
                rows="4"
                value={editing.body || ''}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                placeholder="어떤 활동이었는지 한두 문장으로 설명해주세요."
              ></textarea>
            </label>

            <div className="full">
              <span style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>대표 사진 (선택)</span>
              <div
                className={`drop-zone ${drag ? 'drag' : ''} ${editing.image_url ? 'has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{ cursor: 'pointer' }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => uploadOne(e.target.files?.[0])}
                />
                {uploadBusy ? (
                  <div className="muted">⏳ 업로드 중…</div>
                ) : editing.image_url ? (
                  <div style={{ textAlign: 'center' }}>
                    <img src={editing.image_url} alt="preview" style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 10 }} />
                    <div className="muted small" style={{ marginTop: 6 }}>다른 사진으로 바꾸려면 클릭/드래그</div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 6 }}>🖼️</div>
                    <div><strong>사진을 끌어다 놓거나 클릭</strong></div>
                    <div className="muted small" style={{ marginTop: 4 }}>최대 5MB · jpg/png/webp/gif</div>
                  </div>
                )}
              </div>
              {editing.image_url && (
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input
                    type="url"
                    value={editing.image_url}
                    onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                    placeholder="또는 사진 URL 직접 입력"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...editing, image_url: '' })}>비우기</button>
                </div>
              )}
            </div>

            <label className="full" style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row' }}>
              <input
                type="checkbox"
                checked={!!editing.visible}
                onChange={(e) => setEditing({ ...editing, visible: e.target.checked ? 1 : 0 })}
              />
              <span>비회원에게 공개 (체크 해제 시 숨김)</span>
            </label>

            <div className="form-actions full">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>취소</button>
              <button
                className="btn btn-primary"
                disabled={busy || uploadBusy || !editing.title.trim()}
                onClick={save}
              >
                {busy ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
