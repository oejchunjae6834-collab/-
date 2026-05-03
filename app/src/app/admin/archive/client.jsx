'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const EMPTY = {
  id: null,
  title: '',
  doc_date: new Date().toISOString().slice(0, 10),
  tone: 'formal',
  tagsArr: [],
  summary: '',
  body: '',
};

export default function ArchiveAdmin({ initialDocs }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const payload = {
        title: editing.title,
        doc_date: editing.doc_date,
        tone: editing.tone,
        tags: JSON.stringify(editing.tagsArr || []),
        summary: editing.summary,
        body: editing.body,
        source: 'manual',
      };
      const method = editing.id ? 'PUT' : 'POST';
      const url = editing.id ? `/api/admin/archive/${editing.id}` : '/api/admin/archive';
      const res = await fetch(url, {
        method,
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

  async function remove(d) {
    if (!confirm(`“${d.title}” 글을 삭제할까요?`)) return;
    const res = await fetch(`/api/admin/archive/${d.id}`, { method: 'DELETE' });
    if (!res.ok) { alert('삭제 실패'); return; }
    router.refresh();
  }

  function tagsString(arr) { return (arr || []).join(', '); }
  function parseTags(s) { return s.split(',').map((x) => x.trim().replace(/^#/, '')).filter(Boolean); }

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>아카이브 관리</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...EMPTY })}>+ 새 글 작성</button>
        </div>

        <div className="archive-list">
          {initialDocs.map((d) => (
            <article key={d.id} className="arc-item" style={{ gridTemplateColumns: '90px 1fr auto' }}>
              <div className="arc-date">{d.doc_date}</div>
              <div className="arc-body">
                <h4>{d.title}</h4>
                <p>{d.summary}</p>
                <div className="arc-tags" style={{ justifyContent: 'flex-start', marginTop: 6 }}>
                  <span className={`arc-tag tone-${d.tone}`}>{d.tone === 'formal' ? '개조식' : '친근체'}</span>
                  {(d.tagsArr || []).map((t) => <span key={t} className="arc-tag">#{t}</span>)}
                  {d.source === 'drive' && <span className="arc-tag" style={{ background: 'var(--warm-soft)' }}>📁 Drive</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing({ ...d })}>✎ 수정</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(d)}>🗑 삭제</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {editing && (
        <section className="card">
          <div className="card-head">
            <h3>{editing.id ? '글 수정' : '새 글 작성'}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>✕ 닫기</button>
          </div>
          <div className="form-grid">
            <label className="full">
              <span>제목 <em>*</em></span>
              <input type="text" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </label>
            <label>
              <span>날짜 <em>*</em></span>
              <input type="date" value={editing.doc_date} onChange={(e) => setEditing({ ...editing, doc_date: e.target.value })} />
            </label>
            <label>
              <span>문체 <em>*</em></span>
              <select value={editing.tone} onChange={(e) => setEditing({ ...editing, tone: e.target.value })}>
                <option value="formal">개조식 (회의록)</option>
                <option value="friendly">친근체 (밴드글)</option>
              </select>
            </label>
            <label className="full">
              <span>태그 (쉼표로 구분)</span>
              <input
                type="text"
                value={tagsString(editing.tagsArr)}
                onChange={(e) => setEditing({ ...editing, tagsArr: parseTags(e.target.value) })}
                placeholder="예: 회의록, 결정사항, 겨울캠프"
              />
              <small className="muted">자주 쓰는 태그: #회의록 #후기 #결정사항 #겨울캠프 #수학이랑놀자 #AI리터러시 #공동체놀이 #아이들활동 #어른공부모임</small>
            </label>
            <label className="full">
              <span>요약 <em>*</em></span>
              <textarea rows="3" value={editing.summary || ''} onChange={(e) => setEditing({ ...editing, summary: e.target.value })}></textarea>
            </label>
            <label className="full">
              <span>본문 (선택)</span>
              <textarea rows="6" value={editing.body || ''} onChange={(e) => setEditing({ ...editing, body: e.target.value })} placeholder="회의록이면 결정사항 위주로, 밴드글이면 분위기를 살려 적어주세요."></textarea>
            </label>
            <div className="form-actions full">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>취소</button>
              <button className="btn btn-primary" disabled={busy || !editing.title || !editing.summary} onClick={save}>저장</button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
