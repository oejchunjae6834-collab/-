'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const TAGS = ['all', '회의록', '후기', '결정사항', '겨울캠프', '수학이랑놀자', 'AI리터러시', '공동체놀이', '아이들활동', '어른공부모임'];

export default function ArchiveClient({ initialDocs, initialTag, initialQuery }) {
  const [tag, setTag] = useState(initialTag || 'all');
  const [q, setQ] = useState(initialQuery || '');

  const docs = useMemo(() => {
    return initialDocs.filter((d) => {
      const tagOk = tag === 'all' || (Array.isArray(d.tags) && d.tags.includes(tag));
      const ql = q.trim().toLowerCase();
      const txt = (d.title + ' ' + d.summary + ' ' + (d.tags || []).join(' ')).toLowerCase();
      return tagOk && (!ql || txt.includes(ql));
    });
  }, [initialDocs, tag, q]);

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', margin: '6px 0 16px' }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="제목·요약·태그로 검색"
          style={{
            flex: 1, minWidth: 220, padding: '11px 14px',
            border: '1px solid var(--line-strong)', borderRadius: 10,
            background: 'var(--bg-soft)', font: 'inherit',
          }}
        />
        <div className="chip-row">
          {TAGS.map((t) => (
            <button
              key={t}
              type="button"
              className={`chip ${tag === t ? 'active' : ''}`}
              onClick={() => setTag(t)}
            >
              {t === 'all' ? '전체' : `#${t}`}
            </button>
          ))}
        </div>
      </div>

      <div className="archive-list">
        {docs.length === 0 ? (
          <p className="muted small">조건에 맞는 글이 없어요.</p>
        ) : docs.map((d) => (
          <Link key={d.id} href={`/archive/${d.id}`} className="arc-item" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="arc-date">{d.doc_date}</div>
            <div className="arc-body">
              <h4>{d.title}</h4>
              <p>{d.summary}</p>
            </div>
            <div className="arc-tags">
              <span className={`arc-tag tone-${d.tone}`}>{d.tone === 'formal' ? '개조식' : '친근체'}</span>
              {(d.tags || []).map((t) => (
                <span key={t} className="arc-tag">#{t}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
