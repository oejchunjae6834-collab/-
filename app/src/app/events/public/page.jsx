import Link from 'next/link';
import { listEvents } from '@/lib/queries.js';

export const metadata = { title: '공개 행사 — 디적디적' };

export default async function PublicEventsPage() {
  const events = await listEvents({ publicOnly: true });

  return (
    <main className="layout single">
      <div className="content">
        <section className="card">
          <div className="card-head">
            <h2>공개 행사 안내</h2>
            <span className="badge badge-soft">Public</span>
          </div>
          <p className="muted">
            비회원도 참석 가능한 행사예요. 사전 신청 후 방문해 주세요.
          </p>
          {events.length === 0 ? (
            <p className="muted small mt">예정된 공개 행사가 없어요.</p>
          ) : (
            <div className="event-list">
              {events.map((ev) => (
                <Link key={ev.id} href={`/events/public/${ev.id}`} className="ev-item" style={{ textDecoration: 'none' }}>
                  <div className="ev-date">{ev.start_date}</div>
                  <div className="ev-body">
                    <h4>{ev.title}</h4>
                    <p>{ev.description}</p>
                    <div className="ev-meta-row">
                      <span className="ev-pill type-public">{ev.event_type}</span>
                      <span className="ev-pill">📍 {ev.location}</span>
                      {ev.start_time && <span className="ev-pill">⏰ {ev.start_time}{ev.end_time ? `~${ev.end_time}`:''}</span>}
                    </div>
                  </div>
                  <span className="btn btn-outline btn-sm">신청하기 →</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
