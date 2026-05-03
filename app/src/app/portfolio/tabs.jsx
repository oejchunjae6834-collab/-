'use client';
import { useState } from 'react';

const CATEGORIES = [
  { key: 'adult', label: '🎯 어른 공부 모임' },
  { key: 'kids',  label: '🎨 아이들 활동' },
  { key: 'math',  label: '📐 수학이랑 놀자' },
  { key: 'play',  label: '🤝 공동체 놀이' },
];

export default function PortfolioTabs({ items = [] }) {
  const [tab, setTab] = useState('adult');
  const filtered = items.filter((i) => i.category === tab);

  return (
    <>
      <div className="tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`tab ${tab === c.key ? 'active' : ''}`}
            onClick={() => setTab(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="grid-3">
        {filtered.length === 0 && (
          <p className="muted" style={{ gridColumn: '1 / -1' }}>아직 이 카테고리에 등록된 활동이 없어요.</p>
        )}
        {filtered.map((it) => (
          <article className="port-item" key={it.id}>
            {it.image_url && (
              <img
                src={it.image_url}
                alt={it.title}
                style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
              />
            )}
            <h4>{it.title}</h4>
            {it.body && <p>{it.body}</p>}
            {it.tag && <small className="muted">{it.tag}</small>}
          </article>
        ))}
      </div>
    </>
  );
}
