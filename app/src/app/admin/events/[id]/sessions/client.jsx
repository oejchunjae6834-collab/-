'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const STANDARD = [
  { name: '수학이랑 놀자', start_time: '13:30', end_time: '15:00' },
  { name: '공동체 놀이',   start_time: '15:10', end_time: '15:50' },
  { name: '아이들 모여라', start_time: '15:50', end_time: '17:30' },
  { name: '마하정식 저녁식사', start_time: '17:30', end_time: '18:30', capacity: 30, notes: '준비 인원 파악용' },
  { name: '어른 공부 모임', start_time: '18:40', end_time: '20:10' },
];

const EMPTY = { id: null, name: '', start_time: '', end_time: '', capacity: '', notes: '' };

export default function SessionsAdmin({ eventId, initialSessions }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const payload = {
        name: editing.name.trim(),
        start_time: editing.start_time || null,
        end_time: editing.end_time || null,
        capacity: editing.capacity ? parseInt(editing.capacity, 10) : null,
        notes: editing.notes || null,
      };
      const url = editing.id ? `/api/admin/sessions/${editing.id}` : `/api/admin/events/${eventId}/sessions`;
      const method = editing.id ? 'PUT' : 'POST';
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

  async function remove(s) {
    if (!confirm(`"${s.name}" 세션을 삭제할까요? 출석 데이터도 함께 사라져요.`)) return;
    const res = await fetch(`/api/admin/sessions/${s.id}`, { method: 'DELETE' });
    if (!res.ok) { alert('삭제 실패'); return; }
    router.refresh();
  }

  async function addStandard() {
    if (initialSessions.length > 0) {
      if (!confirm('이미 세션이 있어요. 표준 5세션을 추가로 더 등록할까요?')) return;
    }
    setBusy(true);
    try {
      for (const s of STANDARD) {
        // eslint-disable-next-line no-await-in-loop
        await fetch(`/api/admin/events/${eventId}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(s),
        });
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...EMPTY })}>+ 세션 추가</button>
        <button className="btn btn-outline btn-sm" disabled={busy} onClick={addStandard}>
          🪄 표준 5세션 한번에 등록
        </button>
        <span className="muted small" style={{ alignSelf: 'center' }}>
          (수학이랑 놀자 / 공동체 놀이 / 아이들 모여라 / 마하정식 저녁식사 / 어른 공부 모임)
        </span>
      </div>

      <div className="event-list">
        {initialSessions.length === 0 ? (
          <p className="muted small">등록된 세션이 없어요. + 세션 추가 또는 🪄 표준 5세션 등록을 눌러주세요.</p>
        ) : initialSessions.map((s) => {
          const t = s.totals || {};
          const overCap = s.capacity && (t.going || 0) > s.capacity;
          return (
            <article key={s.id} className="ev-item" style={{ gridTemplateColumns: '120px 1fr auto' }}>
              <div className="ev-date" style={{ fontSize: '.88rem' }}>
                {s.start_time && s.end_time ? `${s.start_time} ~ ${s.end_time}` : '시간 미정'}
              </div>
              <div className="ev-body">
                <h4>{s.name}</h4>
                {s.notes && <p style={{ fontSize: '.86rem' }}>{s.notes}</p>}
                <div className="ev-meta-row">
                  {s.capacity ? (
                    <span className={`ev-pill ${overCap ? '' : ''}`} style={overCap ? { background: 'var(--danger)', color: '#fff' } : null}>
                      👥 {t.going || 0} / 정원 {s.capacity}
                    </span>
                  ) : (
                    <span className="ev-pill">👥 참석 {t.going || 0}</span>
                  )}
                  {(t.maybe || 0) > 0 && <span className="ev-pill">미정 {t.maybe}</span>}
                  {(t.no || 0) > 0 && <span className="ev-pill">불참 {t.no}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing({
                  id: s.id,
                  name: s.name,
                  start_time: s.start_time || '',
                  end_time: s.end_time || '',
                  capacity: s.capacity || '',
                  notes: s.notes || '',
                })}>✎ 수정</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(s)}>🗑 삭제</button>
              </div>
            </article>
          );
        })}
      </div>

      {editing && (
        <section className="card" style={{ marginTop: 14 }}>
          <div className="card-head">
            <h3>{editing.id ? '세션 수정' : '새 세션 추가'}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>✕</button>
          </div>
          <div className="form-grid">
            <label className="full">
              <span>세션 이름 <em>*</em></span>
              <input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="예: 수학이랑 놀자" />
            </label>
            <label>
              <span>시작 시간</span>
              <input type="time" value={editing.start_time} onChange={(e) => setEditing({ ...editing, start_time: e.target.value })} />
            </label>
            <label>
              <span>종료 시간</span>
              <input type="time" value={editing.end_time} onChange={(e) => setEditing({ ...editing, end_time: e.target.value })} />
            </label>
            <label>
              <span>정원 (선택)</span>
              <input type="number" min="0" value={editing.capacity} onChange={(e) => setEditing({ ...editing, capacity: e.target.value })} placeholder="예: 30 (저녁식사)" />
            </label>
            <label className="full">
              <span>비고</span>
              <input type="text" value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="회원에게 보일 안내" />
            </label>
            <div className="form-actions full">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>취소</button>
              <button className="btn btn-primary" disabled={busy || !editing.name} onClick={save}>저장</button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
