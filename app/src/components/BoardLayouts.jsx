'use client';
import Link from 'next/link';

/* ---------- 사진첩 (Gallery) ---------- */
export function GalleryGrid({ posts }) {
  if (!posts.length) return <p className="muted small">아직 올라온 사진이 없어요. 첫 사진을 올려보세요!</p>;
  return (
    <div className="gallery-grid">
      {posts.map((p) => {
        const meta = parseMeta(p.meta);
        return (
          <Link key={p.id} href={`/photos/${p.id}`} className="gallery-card">
            {meta.image_url ? (
              <div className="gallery-img" style={{ backgroundImage: `url(${meta.image_url})` }} />
            ) : (
              <div className="gallery-img gallery-img-empty">📷</div>
            )}
            <div className="gallery-meta">
              <strong>{p.title}</strong>
              <small className="muted">{p.author_name || '익명'} · {formatDate(p.created_at)}</small>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ---------- 자료실 (Files) ---------- */
export function FileList({ posts }) {
  if (!posts.length) return <p className="muted small">아직 등록된 자료가 없어요.</p>;
  return (
    <div className="file-list">
      {posts.map((p) => {
        const meta = parseMeta(p.meta);
        return (
          <Link key={p.id} href={`/resources/${p.id}`} className="file-row">
            <div className="file-icon">📎</div>
            <div className="file-body">
              <h4>
                {p.pinned ? <span className="pin-tag">📌 고정</span> : null}
                {p.title}
              </h4>
              <p>{p.body}</p>
              <small className="muted">
                {p.author_name || '익명'} · {formatDate(p.created_at)}
                {meta.file_name && <> · 📁 {meta.file_name}</>}
              </small>
            </div>
            <span className="btn btn-outline btn-sm">자세히 →</span>
          </Link>
        );
      })}
    </div>
  );
}

/* ---------- 과제방 (Assignments) ---------- */
export function AssignmentList({ posts, today = '2026-05-03' }) {
  if (!posts.length) return <p className="muted small">현재 등록된 과제가 없어요.</p>;
  return (
    <div className="assn-list">
      {posts.map((p) => {
        const meta = parseMeta(p.meta);
        const due = meta.due_date;
        const overdue = due && due < today;
        const upcoming = due && due >= today;
        return (
          <Link key={p.id} href={`/assignments/${p.id}`} className="assn-card">
            <div className="assn-status">
              {overdue
                ? <span className="ev-pill" style={{ background: 'var(--danger)', color: '#fff' }}>마감 지남</span>
                : upcoming
                  ? <span className="ev-pill" style={{ background: 'var(--ok)', color: '#fff' }}>진행 중</span>
                  : <span className="ev-pill">기한 미정</span>
              }
              {p.pinned ? <span className="pin-tag" style={{ marginLeft: 6 }}>📌</span> : null}
            </div>
            <h4>{p.title}</h4>
            <p>{p.body}</p>
            <div className="assn-meta">
              {due && <span>⏰ 마감: <strong>{due}</strong></span>}
              <span className="muted">출제: {p.author_name || '익명'}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function formatDate(value) {
  if (!value && value !== 0) return '날짜 없음';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const asString = String(value);
  return asString.slice(0, 10);
}

function parseMeta(s) {
  try { return JSON.parse(s || '{}') || {}; } catch { return {}; }
}
