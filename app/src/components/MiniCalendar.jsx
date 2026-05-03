'use client';
import { useMemo, useState } from 'react';

const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n) { return String(n).padStart(2, '0'); }
function fmt(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }

function typeColor(t) {
  if (t === '정기모임') return 'var(--primary)';
  if (t === '여름캠프' || t === '겨울캠프') return 'var(--accent)';
  if (t === '운영진회의') return 'var(--warm)';
  if (t === '공개특강') return 'var(--primary-ink)';
  return 'var(--muted)';
}

/**
 * MiniCalendar — 작은 월간 달력.
 * events: [{ id, title, start_date, event_type, is_public }]
 * onSelect(event) — 날짜 클릭 시 콜백 (선택 날짜에 일정이 있으면 첫 번째)
 *
 * SSR에서 today를 결정하지 않고 props로 받게 해 hydration 불일치를 피함.
 */
export default function MiniCalendar({ events = [], initialMonth, today }) {
  const [cursor, setCursor] = useState(() => new Date(initialMonth));
  const [selected, setSelected] = useState(null);

  // 이벤트를 날짜별로 그룹핑
  const byDate = useMemo(() => {
    const m = {};
    for (const ev of events) {
      const start = ev.start_date;
      const end = ev.end_date || start;
      const s = new Date(start), e = new Date(end);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const k = fmt(d);
        m[k] ||= [];
        m[k].push(ev);
      }
    }
    return m;
  }, [events]);

  const monthStart = startOfMonth(cursor);
  const firstDow = monthStart.getDay();          // 0=일
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  }

  const todayStr = today;
  const monthLabel = `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월`;
  const selDate = selected;
  const selEvents = selDate ? (byDate[selDate] || []) : [];

  return (
    <div className="mini-cal">
      <div className="mini-cal-head">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCursor(addMonths(cursor, -1))}>‹</button>
        <strong>{monthLabel}</strong>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCursor(addMonths(cursor, 1))}>›</button>
      </div>
      <div className="mini-cal-grid">
        {KO_DAYS.map((d, i) => (
          <div key={d} className="mini-cal-dow" style={{ color: i === 0 ? 'var(--danger)' : i === 6 ? 'var(--accent)' : 'var(--ink-soft)' }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="mini-cal-empty" />;
          const k = fmt(d);
          const evs = byDate[k] || [];
          const isToday = k === todayStr;
          const isSel = k === selDate;
          const isSun = d.getDay() === 0;
          const isSat = d.getDay() === 6;
          return (
            <button
              key={k}
              type="button"
              className={`mini-cal-cell ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''}`}
              onClick={() => setSelected(isSel ? null : k)}
              style={{ color: isSun ? 'var(--danger)' : isSat ? 'var(--accent)' : undefined }}
            >
              <span className="d-num">{d.getDate()}</span>
              {evs.length > 0 && (
                <span className="d-dots">
                  {evs.slice(0, 3).map((e) => (
                    <i key={e.id} style={{ background: typeColor(e.event_type) }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selDate && (
        <div className="mini-cal-detail">
          <div className="mcd-head">
            <strong>{selDate.replace(/-/g, '.')}</strong>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
          </div>
          {selEvents.length === 0
            ? <p className="muted small" style={{ margin: 0 }}>이 날엔 등록된 일정이 없어요.</p>
            : <ul className="mcd-list">
                {selEvents.map((e) => (
                  <li key={e.id}>
                    <span className="ev-pill" style={{ background: typeColor(e.event_type), color: '#fff', borderColor: 'transparent' }}>
                      {e.event_type}
                    </span>
                    <span style={{ marginLeft: 8, fontWeight: 600 }}>{e.title}</span>
                    {e.is_public ? (
                      <a href={`/events/public/${e.id}`} className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }}>자세히</a>
                    ) : (
                      <span className="muted small" style={{ marginLeft: 'auto' }}>회원 전용</span>
                    )}
                  </li>
                ))}
              </ul>
          }
        </div>
      )}

      <div className="mini-cal-legend">
        <span><i style={{ background: 'var(--primary)' }} /> 정기모임</span>
        <span><i style={{ background: 'var(--accent)' }} /> 캠프</span>
        <span><i style={{ background: 'var(--primary-ink)' }} /> 공개특강</span>
        <span><i style={{ background: 'var(--warm)' }} /> 운영진</span>
      </div>
    </div>
  );
}
