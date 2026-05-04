import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getEvent, listSessions, listEventSessionAttendances } from '@/lib/queries.js';
import SessionsAdmin from './client.jsx';

export const metadata = { title: '세션 관리 — 디적디적 관리자' };

export default async function SessionsAdminPage({ params }) {
  const eventId = parseInt(params.id, 10);
  const event = await getEvent(eventId);
  if (!event) redirect('/admin/events');

  const sessions = await listSessions(eventId);
  const all = await listEventSessionAttendances(eventId);
  // 세션별 합계
  const totals = {};
  for (const s of sessions) totals[s.id] = { going: 0, no: 0, maybe: 0 };
  for (const r of all) {
    totals[r.session_id] ||= { going: 0, no: 0, maybe: 0 };
    totals[r.session_id][r.status] = (totals[r.session_id][r.status] || 0) + 1;
  }

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>🎯 세션 관리</h2>
          <Link href="/admin/events" className="btn btn-ghost btn-sm">← 일정 목록</Link>
        </div>
        <p className="muted small">
          <strong>{event.title}</strong> ({event.start_date}{event.end_date ? ` ~ ${event.end_date}` : ''}) ·
          {event.location}
        </p>
        <SessionsAdmin eventId={eventId} initialSessions={sessions.map((s) => ({ ...s, totals: totals[s.id] }))} />
      </section>
    </>
  );
}
