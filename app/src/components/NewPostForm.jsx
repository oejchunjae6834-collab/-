'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * NewPostForm — 보드 타입별 입력.
 *  - gallery: 이미지 직접 업로드 OR URL 입력
 *  - file:    파일 직접 업로드 OR URL 입력
 *  - assignment: 마감일
 */
export default function NewPostForm({ boardSlug, boardType, backHref }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [mode, setMode] = useState('upload');  // 'upload' | 'url'
  const [form, setForm] = useState({
    title: '',
    body: '',
    image_url: '',
    file_url: '',
    file_name: '',
    due_date: '',
  });

  async function uploadOne(file) {
    if (!file) return;
    setUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', boardType === 'gallery' ? 'image' : 'file');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { alert(data.error || '업로드 실패'); return; }
      if (boardType === 'gallery') {
        setForm((s) => ({ ...s, image_url: data.url }));
      } else {
        setForm((s) => ({ ...s, file_url: data.url, file_name: file.name }));
      }
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

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const meta = {};
      if (boardType === 'gallery' && form.image_url) meta.image_url = form.image_url;
      if (boardType === 'file' && form.file_url) {
        meta.file_url = form.file_url;
        meta.file_name = form.file_name;
      }
      if (boardType === 'assignment' && form.due_date) meta.due_date = form.due_date;

      const res = await fetch(`/api/boards/${boardSlug}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, body: form.body, meta: JSON.stringify(meta) }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || '저장 실패'); return; }
      router.push(`${backHref}/${data.post.id}`);
    } finally {
      setBusy(false);
    }
  }

  const showUploader = boardType === 'gallery' || boardType === 'file';
  const isImage = boardType === 'gallery';
  const currentUrl = isImage ? form.image_url : form.file_url;

  return (
    <form onSubmit={submit} className="form-grid">
      <label className="full">
        <span>제목 <em>*</em></span>
        <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </label>

      {showUploader && (
        <div className="full">
          <div className="upload-tabs">
            <button type="button" className={`upload-tab ${mode === 'upload' ? 'active' : ''}`} onClick={() => setMode('upload')}>
              📤 직접 업로드
            </button>
            <button type="button" className={`upload-tab ${mode === 'url' ? 'active' : ''}`} onClick={() => setMode('url')}>
              🔗 URL로 추가
            </button>
          </div>

          {mode === 'upload' && (
            <div
              className={`drop-zone ${drag ? 'drag' : ''} ${currentUrl ? 'has-file' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept={isImage ? 'image/*' : '*/*'}
                style={{ display: 'none' }}
                onChange={(e) => uploadOne(e.target.files?.[0])}
              />
              {uploadBusy ? (
                <div className="muted">⏳ 업로드 중…</div>
              ) : isImage && form.image_url ? (
                <div style={{ textAlign: 'center' }}>
                  <img src={form.image_url} alt="preview" style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 10 }} />
                  <div className="muted small" style={{ marginTop: 6 }}>다른 사진으로 바꾸려면 클릭/드래그</div>
                </div>
              ) : !isImage && form.file_url ? (
                <div>
                  <div style={{ fontSize: 32 }}>📄</div>
                  <div><strong>{form.file_name || '업로드된 파일'}</strong></div>
                  <div className="muted small" style={{ marginTop: 6 }}>다른 파일로 바꾸려면 클릭/드래그</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 36, marginBottom: 6 }}>{isImage ? '🖼️' : '📎'}</div>
                  <div><strong>{isImage ? '사진을 끌어다 놓거나 클릭' : '파일을 끌어다 놓거나 클릭'}</strong></div>
                  <div className="muted small" style={{ marginTop: 4 }}>최대 5MB</div>
                </div>
              )}
            </div>
          )}

          {mode === 'url' && (
            <div style={{ display: 'grid', gap: 8 }}>
              <label>
                <span>{isImage ? '사진 URL' : '파일 URL'}</span>
                <input
                  type="url"
                  value={isImage ? form.image_url : form.file_url}
                  onChange={(e) => isImage
                    ? setForm({ ...form, image_url: e.target.value })
                    : setForm({ ...form, file_url: e.target.value })
                  }
                  placeholder={isImage ? 'https://… (이미지 직접 링크)' : 'https://drive.google.com/…'}
                />
              </label>
              {!isImage && (
                <label>
                  <span>표시할 파일명</span>
                  <input type="text" value={form.file_name} onChange={(e) => setForm({ ...form, file_name: e.target.value })} placeholder="winter_camp.docx" />
                </label>
              )}
            </div>
          )}
        </div>
      )}

      {boardType === 'assignment' && (
        <label>
          <span>마감일</span>
          <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        </label>
      )}

      <label className="full">
        <span>내용</span>
        <textarea
          rows="6"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder="자유롭게 적어주세요."
        ></textarea>
      </label>

      <div className="form-actions full">
        <button type="button" className="btn btn-ghost" onClick={() => router.push(backHref)}>취소</button>
        <button className="btn btn-primary" disabled={busy || uploadBusy || !form.title}>
          {busy ? '저장 중…' : '게시'}
        </button>
      </div>
    </form>
  );
}
