import { listEvents, listAttendance, listPublicRsvps, listSessions } from '@/lib/queries.js';
import EventsAdmin from './client.jsx';

export const metadata = { title: '일정 관리 — 디적디적 관리자' };

export default function EventsAdminPage() {
  const events = listEvents().map((e) => ({
    ...e,
    going_count: listAttendance(e.id).filter((a) => a.status === 'going').length,
    public_count: e.is_public ? listPublicRsvps(e.id).length : 0,
    sessions: listSessions(e.id),
  }));

  return <EventsAdmin initialEvents={events} />;
}
