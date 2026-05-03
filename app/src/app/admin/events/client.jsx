'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const EMPTY = {
  id: null,
  title: '',
  event_type: '정기모임',
  start_date: '',
  end_date: '',
  start_time: '',
  end_time: '',
  location: '마하어린이도서관',
  description: '',
  is_public: 0,
  is_featured: 0,
};

export default function EventsAdmin({ initialEvents }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const method = editing.id ? 'PUT' : 'POST';
      const url = editing.id ? `/api/admin/events/${editing.id}` : '/api/admin/events';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
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

  async function remove(ev) {
    if (!confirm(`“${ev.title}” 일정을 삭제할까요? 출석/공개 신청 데이터도 함께 사라져요.`)) return;
    const res = await fetch(`/api/admin/events/${ev.id}`, { method: 'DELETE' });
    if (!res.ok) { alert('삭제 실패'); return; }
    router.refresh();
  }

  async function downloadCsv(ev) {
    window.location.href = `/api/admin/events/${ev.id}/attendances.csv`;
  }

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>일정 관리</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...EMPTY })}>+ 일정 추가</button>
        </div>

        <div className="event-list">
          {initialEvents.map((ev) => (
            <article key={ev.id} className="ev-item" style={{ gridTemplateColumns: '110px 1fr auto' }}>
              <div className="ev-date">{ev.start_date}</div>
              <div className="ev-body">
                <h4>{ev.title}</h4>
                <p>{ev.description}</p>
                <div className="ev-meta-row">
                  <span className="ev-pill">{ev.event_type}</span>
                  <span className="ev-pill">📍 {ev.location}</span>
                  {ev.is_public ? <span className="ev-pill type-public">공개</span> : null}
                  {ev.is_featured ? <span className="ev-pill" style={{ background: 'var(--warm)', color: 'var(--ink)' }}>⭐ 랜딩 노출</span> : null}
                  <span className="ev-pill">👥 회원 {ev.going_count}</span>
                  {ev.is_public ? <span className="ev-pill">🌐 외부 신청 {ev.public_count}</span> : null}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing({ ...ev })}>✎ 수정</button>
                <Link href={`/admin/events/${ev.id}/sessions`} className="btn btn-ghost btn-sm">
                  🎯 세션 ({ev.sessions?.length || 0})
                </Link>
                <button className="btn btn-ghost btn-sm" onClick={() => downloadCsv(ev)}>📥 CSV</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(ev)}>🗑 삭제</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {editing && (
        <section className="card">
          <div className="card-head">
            <h3>{editing.id ? '일정 수정' : '새 일정 추가'}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>✕ 닫기</button>
          </div>
          <div className="form-grid">
            <label className="full">
              <span>제목 <em>*</em></span>
              <input type="text" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </label>
            <label>
              <span>유형 <em>*</em></span>
              <select value={editing.event_type} onChange={(e) => setEditing({ ...editing, event_type: e.target.value })}>
                <option>정기모임</option>
                <option>여름캠프</option>
                <option>겨울캠프</option>
                <option>공개특강</option>
                <option>운영진회의</option>
              </select>
            </label>
            <label>
              <span>장소</span>
              <input type="text" value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
            </label>
            <label>
              <span>시작 날짜 <em>*</em></span>
              <input type="date" value={editing.start_date} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} />
            </label>
            <label>
              <span>종료 날짜 (다일)</span>
              <input type="date" value={editing.end_date || ''} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} />
            </label>
            <label>
              <span>시작 시간</span>
              <input type="time" value={editing.start_time || ''} onChange={(e) => setEditing({ ...editing, start_time: e.target.value })} />
            </label>
            <label>
              <span>종료 시간</span>
              <input type="time" value={editing.end_time || ''} onChange={(e) => setEditing({ ...editing, end_time: e.target.value })} />
            </label>
            <label className="full">
              <span>설명 / 안건</span>
              <textarea rows="3" value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })}></textarea>
            </label>
            <label className="full">
              <span>
                <input type="checkbox" checked={!!editing.is_public} onChange={(e) => setEditing({ ...editing, is_public: e.target.checked ? 1 : 0 })} />
                {' '}비회원에게도 공개 (공개 특강)
              </span>
            </label>
            <label className="full">
              <span>
                <input
                  type="checkbox"
                  checked={!!editing.is_featured}
                  onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked ? 1 : 0 })}
                />
                {' '}⭐ 메인 페이지 "가까운 공개 행사"에 노출
                <small className="muted" style={{ display: 'block', fontWeight: 400, marginTop: 4 }}>
                  여러 일정을 동시에 노출할 수 있어요. 이 옵션을 켠 일정이 하나도 없으면 가장 가까운 공개 행사가 자동으로 표시돼요.
                </small>
              </span>
            </label>
            <div className="form-actions full">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>취소</button>
              <button className="btn btn-primary" disabled={busy || !editing.title || !editing.start_date} onClick={save}>저장</button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
