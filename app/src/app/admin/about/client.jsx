'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

const TYPE_LABEL = {
  heading: '🅷 소제목',
  paragraph: '¶ 단락',
  image: '🖼 이미지',
};

export default function AboutAdmin({ initialSections, initialCms }) {
  const router = useRouter();
  const [sections, setSections] = useState(initialSections);
  const [cms, setCms] = useState({ ...initialCms });
  const [savedKey, setSavedKey] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  // 새 블록 만들기 — 우측 +버튼들로 생성
  function newBlock(type) {
    setEditing({
      id: null,
      type,
      content: '',
      caption: '',
      visible: 1,
    });
  }

  async function saveCms(key) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/cms/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: cms[key] || '' }),
      });
      if (!res.ok) { alert('저장 실패'); return; }
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 1500);
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', 'image');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || '업로드 실패');
      return null;
    }
    return data.url;
  }

  async function saveBlock() {
    if (!editing) return;
    if (editing.type === 'image' && !editing.content) {
      alert('이미지를 업로드하거나 URL을 입력해주세요');
      return;
    }
    if (editing.type !== 'image' && !editing.content?.trim()) {
      alert('내용을 입력해주세요');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        type: editing.type,
        content: editing.content,
        caption: editing.caption || null,
        visible: editing.visible ? 1 : 0,
      };
      const method = editing.id ? 'PUT' : 'POST';
      const url = editing.id
        ? `/api/admin/about/sections/${editing.id}`
        : '/api/admin/about/sections';
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

  async function remove(s) {
    if (!confirm(`이 ${TYPE_LABEL[s.type]} 블록을 삭제할까요?`)) return;
    const res = await fetch(`/api/admin/about/sections/${s.id}`, { method: 'DELETE' });
    if (!res.ok) { alert('삭제 실패'); return; }
    router.refresh();
  }

  async function move(s, dir) {
    const res = await fetch(`/api/admin/about/sections/${s.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ move: dir }),
    });
    if (!res.ok) { alert('이동 실패'); return; }
    router.refresh();
  }

  async function toggleVisible(s) {
    const res = await fetch(`/api/admin/about/sections/${s.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: s.visible ? 0 : 1 }),
    });
    if (!res.ok) { alert('변경 실패'); return; }
    router.refresh();
  }

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>소개 페이지 관리</h2>
          <a href="/about" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">↗ 공개 페이지 보기</a>
        </div>
        <p className="muted small">
          페이지 구성: <strong>큰 제목</strong> → <strong>인트로 단락</strong> (또는 아래 블록들) → <strong>3개 요약 박스</strong>.
          각 칸의 "저장" 버튼으로 즉시 반영돼요.
        </p>

        <div className="form-grid" style={{ marginTop: 12 }}>
          <CmsField
            label="① 큰 제목 (페이지 상단)"
            keyName="about.title"
            cms={cms}
            setCms={setCms}
            onSave={saveCms}
            busy={busy}
            savedKey={savedKey}
            placeholder="예: 디적디적은 어떤 모임인가요?"
          />
          <CmsField
            label="② 인트로 단락 (블록을 안 만들었을 때 보이는 본문)"
            keyName="about.body"
            cms={cms}
            setCms={setCms}
            onSave={saveCms}
            busy={busy}
            savedKey={savedKey}
            textarea
            placeholder='예: 디적디적은 AI 시대를 함께 공부하는 가족 단위 학습 공동체예요...'
          />
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h3>3개 요약 박스</h3>
          <span className="muted small">제목과 본문을 자유롭게 바꿀 수 있어요. 이모지는 비워두면 기본값이 표시돼요.</span>
        </div>
        <div className="form-grid">
          {[1, 2, 3].map((n) => (
            <div key={n} className="full" style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12, marginBottom: 6 }}>
              <strong style={{ display: 'block', marginBottom: 8 }}>박스 {n}</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 10 }}>
                <CmsField
                  label="이모지"
                  keyName={`about.box${n}.emoji`}
                  cms={cms}
                  setCms={setCms}
                  onSave={saveCms}
                  busy={busy}
                  savedKey={savedKey}
                  placeholder={['👨‍👩‍👧', '🧩', '🗓️'][n - 1]}
                  small
                />
                <CmsField
                  label="제목"
                  keyName={`about.box${n}.title`}
                  cms={cms}
                  setCms={setCms}
                  onSave={saveCms}
                  busy={busy}
                  savedKey={savedKey}
                  placeholder={['누가 모이나요', '무엇을 하나요', '어떻게 참여하나요'][n - 1]}
                />
              </div>
              <CmsField
                label="본문"
                keyName={`about.box${n}.body`}
                cms={cms}
                setCms={setCms}
                onSave={saveCms}
                busy={busy}
                savedKey={savedKey}
                textarea
                placeholder={[
                  'AI 교육에 관심 있는 가족 단위 회원이 모여요...',
                  '수학이랑 놀자 · 공동체 놀이 · 아이들 모여라 · 어른 공부 모임을 시간대별로 운영해요.',
                  '공개 행사에 먼저 참관해 보시고, 마음에 드시면 회원 신청을 해주세요...',
                ][n - 1]}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h3>블록 ({sections.length}개)</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-outline btn-sm" onClick={() => newBlock('heading')}>+ 소제목</button>
            <button className="btn btn-outline btn-sm" onClick={() => newBlock('paragraph')}>+ 단락</button>
            <button className="btn btn-primary btn-sm" onClick={() => newBlock('image')}>+ 이미지</button>
          </div>
        </div>

        {sections.length === 0 ? (
          <p className="muted small">아직 블록이 없어요. 우측 버튼으로 첫 블록을 만들어 보세요.</p>
        ) : (
          <div className="archive-list">
            {sections.map((s, idx) => (
              <article
                key={s.id}
                className="arc-item"
                style={{ gridTemplateColumns: '70px 1fr auto', opacity: s.visible ? 1 : 0.5 }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22 }}>
                    {s.type === 'heading' && '🅷'}
                    {s.type === 'paragraph' && '¶'}
                    {s.type === 'image' && '🖼'}
                  </div>
                  <small className="muted">{TYPE_LABEL[s.type].split(' ')[1]}</small>
                </div>
                <div className="arc-body" style={{ minWidth: 0 }}>
                  {s.type === 'image' ? (
                    <div>
                      <img
                        src={s.content}
                        alt={s.caption || ''}
                        style={{ maxWidth: 280, maxHeight: 160, borderRadius: 8, display: 'block' }}
                      />
                      {s.caption && <p className="muted small" style={{ marginTop: 4 }}>📝 {s.caption}</p>}
                    </div>
                  ) : s.type === 'heading' ? (
                    <h4 style={{ margin: 0 }}>{s.content}</h4>
                  ) : (
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflow: 'hidden' }}>
                      {s.content?.length > 200 ? s.content.slice(0, 200) + '…' : s.content}
                    </p>
                  )}
                  {!s.visible && <span className="role-pill pending" style={{ marginTop: 6, display: 'inline-block' }}>숨김</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" disabled={idx === 0} onClick={() => move(s, 'up')}>↑</button>
                    <button className="btn btn-ghost btn-sm" disabled={idx === sections.length - 1} onClick={() => move(s, 'down')}>↓</button>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditing({ ...s, visible: s.visible ? 1 : 0 })}>✎ 수정</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleVisible(s)}>
                    {s.visible ? '👁 숨기기' : '👁 보이기'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(s)}>🗑 삭제</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <BlockEditor
          editing={editing}
          setEditing={setEditing}
          onSave={saveBlock}
          onCancel={() => setEditing(null)}
          busy={busy}
          uploadImage={uploadImage}
        />
      )}
    </>
  );
}

/** CMS 키 한 개를 인풋/텍스트영역으로 편집 + 즉시 저장하는 작은 헬퍼 */
function CmsField({ label, keyName, cms, setCms, onSave, busy, savedKey, placeholder, textarea = false, small = false }) {
  return (
    <label className={small ? '' : 'full'}>
      <span>{label}</span>
      {textarea ? (
        <textarea
          rows={4}
          value={cms[keyName] || ''}
          onChange={(e) => setCms({ ...cms, [keyName]: e.target.value })}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={cms[keyName] || ''}
          onChange={(e) => setCms({ ...cms, [keyName]: e.target.value })}
          placeholder={placeholder}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        {savedKey === keyName && <span className="muted small" style={{ alignSelf: 'center' }}>✅ 저장됨</span>}
        <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => onSave(keyName)}>저장</button>
      </div>
    </label>
  );
}

function BlockEditor({ editing, setEditing, onSave, onCancel, busy, uploadImage }) {
  const fileRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      if (url) setEditing({ ...editing, content: url });
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h3>{editing.id ? '블록 수정' : '새 블록'} — {TYPE_LABEL[editing.type]}</h3>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕ 닫기</button>
      </div>
      <div className="form-grid">
        {editing.type === 'heading' && (
          <label className="full">
            <span>소제목 텍스트 <em>*</em></span>
            <input
              type="text"
              value={editing.content || ''}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              placeholder="예: 무엇을 하나요?"
            />
          </label>
        )}
        {editing.type === 'paragraph' && (
          <label className="full">
            <span>단락 본문 <em>*</em></span>
            <textarea
              rows={8}
              value={editing.content || ''}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              placeholder="자유롭게 적어 주세요. 줄바꿈은 그대로 보존됩니다."
            />
          </label>
        )}
        {editing.type === 'image' && (
          <>
            <div className="full">
              <span style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>이미지 <em>*</em></span>
              <div
                className={`drop-zone ${drag ? 'drag' : ''} ${editing.content ? 'has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleUpload(f);
                }}
                onClick={() => fileRef.current?.click()}
                style={{ cursor: 'pointer' }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleUpload(e.target.files?.[0])}
                />
                {uploading ? (
                  <div className="muted">⏳ 업로드 중…</div>
                ) : editing.content ? (
                  <div style={{ textAlign: 'center' }}>
                    <img src={editing.content} alt="preview" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 10 }} />
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
              {editing.content && (
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input
                    type="url"
                    value={editing.content}
                    onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                    placeholder="또는 사진 URL 직접 입력"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...editing, content: '' })}>비우기</button>
                </div>
              )}
            </div>
            <label className="full">
              <span>캡션 (선택)</span>
              <input
                type="text"
                value={editing.caption || ''}
                onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
                placeholder="사진 아래 작은 글씨로 표시됩니다"
              />
            </label>
          </>
        )}

        <label className="full" style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row' }}>
          <input
            type="checkbox"
            checked={!!editing.visible}
            onChange={(e) => setEditing({ ...editing, visible: e.target.checked ? 1 : 0 })}
          />
          <span>비회원에게 공개 (체크 해제 시 숨김)</span>
        </label>

        <div className="form-actions full">
          <button className="btn btn-ghost" onClick={onCancel}>취소</button>
          <button className="btn btn-primary" disabled={busy || uploading} onClick={onSave}>
            {busy ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </section>
  );
}
