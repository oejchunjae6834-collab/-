'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const FIELDS = [
  { key: 'notice',       label: '상단 공지 띠 (비우면 숨김)', textarea: false },
  { key: 'hero.kicker',  label: '히어로 — 작은 라벨', textarea: false },
  { key: 'hero.title',   label: '히어로 — 큰 타이틀 (개행은 \\n으로)', textarea: true },
  { key: 'hero.lede',    label: '히어로 — 본문', textarea: true },
  { key: 'about.title',  label: '소개 — 제목', textarea: false },
  { key: 'about.body',   label: '소개 — 본문', textarea: true },
];

export default function CmsAdmin({ initial }) {
  const router = useRouter();
  const [vals, setVals] = useState({ ...initial });
  const [busy, setBusy] = useState(false);
  const [savedKey, setSavedKey] = useState(null);

  async function saveOne(key) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/cms/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: vals[key] || '' }),
      });
      if (!res.ok) { alert('저장 실패'); return; }
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 1500);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>CMS — 비회원 페이지 텍스트 관리</h2>
        <span className="badge badge-soft">실시간 반영</span>
      </div>
      <p className="muted small">
        랜딩 페이지(/)와 소개 페이지(/about)에 노출되는 문구입니다. 저장 즉시 반영돼요.
      </p>

      <div className="form-grid">
        {FIELDS.map((f) => (
          <label key={f.key} className="full">
            <span>{f.label}</span>
            {f.textarea ? (
              <textarea
                rows={f.key === 'hero.title' ? 3 : 5}
                value={vals[f.key] || ''}
                onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
              />
            ) : (
              <input
                type="text"
                value={vals[f.key] || ''}
                onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
              />
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              {savedKey === f.key && <span className="muted small" style={{ alignSelf: 'center' }}>✅ 저장됨</span>}
              <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => saveOne(f.key)}>저장</button>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}
