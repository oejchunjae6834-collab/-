import { listEvents, listAttendance, listPublicRsvps, listSessions } from '@/lib/queries.js';
import EventsAdmin from './client.jsx';

export const metadata = { title: '일정 관리 — 디적디적 관리자' };

export default async function EventsAdminPage() {
  const rows = await listEvents();
  const events = await Promise.all(rows.map(async (e) => ({
    ...e,
    going_count: (await listAttendance(e.id)).filter((a) => a.status === 'going').length,
    public_count: e.is_public ? (await listPublicRsvps(e.id)).length : 0,
    sessions: await listSessions(e.id),
  })));

  return <EventsAdmin initialEvents={events} />;
}
