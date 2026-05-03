'use client';
import { useState } from 'react';

export default function RsvpRow({ eventId, initial, attendance, myId }) {
  const [my, setMy] = useState(initial || null);
  const [list, setList] = useState(attendance || []);
  const [busy, setBusy] = useState(false);

  async function toggle(status) {
    setBusy(true);
    const next = my === status ? null : status;
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '오류');
      setMy(next);
      setList(data.attendance);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  const lists = { going: [], no: [], maybe: [] };
  for (const a of list) {
    if (lists[a.status]) lists[a.status].push(a.name);
  }

  function col(label, key) {
    return (
      <div className="rsvp-col" key={key}>
        <h5>{label} ({lists[key].length})</h5>
        <ul>
          {lists[key].length === 0
            ? <li className="none">아직 없어요</li>
            : lists[key].map((n) => <li key={n}>· {n}</li>)
          }
        </ul>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: '.88rem', color: 'var(--ink-soft)', marginBottom: 6 }}>
        <strong>내 가족 출석</strong>
      </div>
      <div className="rsvp-toggle">
        {['going', 'no', 'maybe'].map((s) => (
          <button
            key={s}
            type="button"
            className={`r-btn ${my === s ? 'active' : ''}`}
            data-rsvp={s}
            disabled={busy}
            onClick={() => toggle(s)}
          >
            {s === 'going' ? '참석' : s === 'no' ? '불참' : '미정'}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 10 }} className="rsvp-lists">
        {col('참석', 'going')}
        {col('불참', 'no')}
        {col('미정', 'maybe')}
      </div>
    </div>
  );
}
