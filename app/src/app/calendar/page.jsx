import Link from 'next/link';
import { getCurrentUser, ROLES } from '@/lib/auth.js';
import {
  listEvents,
  listSessions, listFamilyMembers, listEventSessionAttendances, myFamilySessionStatus,
  ensureEventHasSession,
} from '@/lib/queries.js';
import FamilySessionGrid from '@/components/FamilySessionGrid.jsx';
import MiniCalendar from '@/components/MiniCalendar.jsx';

export const metadata = { title: '일정 — 디적디적' };

function typeClass(t) {
  if (t === '정기모임') return 'type-meet';
  if (t === '여름캠프' || t === '겨울캠프') return 'type-camp';
  if (t === '운영진회의') return 'type-board';
  if (t === '특강') return 'type-public';
  return '';
}

export default async function CalendarPage() {
  const me = await getCurrentUser();
  const isMember = me && me.role_level >= ROLES.MEMBER;

  // 비회원: 공개 일정만, 회원: 모두
  const events = isMember ? await listEvents() : await listEvents({ publicOnly: true });
  const myFamily = isMember ? await listFamilyMembers(me.id) : [];

  // 회원 페이지에서는 모든 일정에 최소 1개 세션을 보장 (없으면 "전체 모임" 자동 생성)
  if (isMember) {
    for (const ev of events) await ensureEventHasSession(ev.id);
  }

  // 각 일정별 세션·출석을 미리 한 번에 조회 (map 콜백은 동기여야 함)
  const eventData = await Promise.all(events.map(async (ev) => {
    const sessions = await listSessions(ev.id);
    let totalsBySession = {};
    let myStatus = [];
    let allAttendances = [];
    if (isMember && sessions.length > 0) {
      allAttendances = await listEventSessionAttendances(ev.id);
      for (const r of allAttendances) {
        totalsBySession[r.session_id] ||= { going: 0, maybe: 0, no: 0 };
        totalsBySession[r.session_id][r.status] = (totalsBySession[r.session_id][r.status] || 0) + 1;
      }
      myStatus = await myFamilySessionStatus(ev.id, me.id);
    }
    let goingCount = 0;
    for (const t of Object.values(totalsBySession)) goingCount = Math.max(goingCount, t.going || 0);
    return { ev, sessions, totalsBySession, myStatus, allAttendances, goingCount };
  }));

  return (
    <main className="layout single">
      <div className="content">
        <section className="card">
          <div className="card-head">
            <h2>{isMember ? '전체 일정 + 출석 체크' : '디적디적 일정'}</h2>
            <span className={`badge ${isMember ? 'badge-warm' : 'badge-soft'}`}>
              {isMember ? 'Members' : 'Public'}
            </span>
          </div>
          {!isMember && (
            <div className="banner-info">
              💡 비회원에게는 회원이 만든 일정 중 공개로 표시된 것만 보여요. 회원으로 로그인하시면 모든 일정과 가족별 세션 출석 체크가 보여요.
              <br />
              <Link href="/login" className="btn btn-primary btn-sm" style={{ marginTop: 8, marginRight: 6 }}>로그인</Link>
              <Link href="/signup" className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>회원가입</Link>
            </div>
          )}
          {isMember && myFamily.length === 0 && (
            <div className="banner-warn" style={{ marginBottom: 12 }}>
              ⚠️ 가족 구성원이 등록되지 않아 세션 체크가 비어 있어요.
              <Link href="/admin/members" style={{ color: 'var(--primary-ink)', fontWeight: 600, marginLeft: 6 }}>회원 정보 관리</Link>에서
              가족을 추가해 주세요. (관리자 권한이 필요한 페이지지만, 본인 정보 수정 시 본인 행에서 가족을 추가할 수 있어요.)
            </div>
          )}
          {isMember && myFamily.length > 0 && (
            <p className="muted small">
              가족 구성원과 세션별로 참석 여부를 체크해 주세요. 체크하면 다른 가족이 누가 참석하는지 함께 보여요.
            </p>
          )}

          <div className="two-col">
            <div className="event-list">
              {events.length === 0 ? (
                <p className="muted small">표시할 일정이 없어요.</p>
              ) : eventData.map(({ ev, sessions, totalsBySession, myStatus, allAttendances, goingCount }) => {
                return (
                  <article key={ev.id} className="ev-item" style={{ display: 'block' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 14, alignItems: 'flex-start' }}>
                      <div className="ev-date">{ev.start_date}{ev.end_date ? ` ~ ${ev.end_date}`:''}</div>
                      <div className="ev-body">
                        <h4>{ev.title}</h4>
                        <p>{ev.description}</p>
                        <div className="ev-meta-row">
                          <span className={`ev-pill ${typeClass(ev.event_type)}`}>{ev.event_type}</span>
                          <span className="ev-pill">📍 {ev.location}</span>
                          {ev.start_time && <span className="ev-pill">⏰ {ev.start_time}{ev.end_time ? `~${ev.end_time}`:''}</span>}
                          {ev.is_public ? <span className="ev-pill type-public">공개</span> : <span className="ev-pill">🔒 회원 전용</span>}
                          {sessions.length > 1 && <span className="ev-pill">🎯 세션 {sessions.length}개</span>}
                          {isMember && <span className="ev-pill">👥 참석 {goingCount}명</span>}
                        </div>
                      </div>
                    </div>

                    {isMember && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
                        <FamilySessionGrid
                          sessions={sessions}
                          familyMembers={myFamily}
                          initialMyStatus={myStatus}
                          sessionTotals={totalsBySession}
                          allAttendances={allAttendances}
                          myUserId={me.id}
                          eventId={ev.id}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <div>
              <MiniCalendar
                events={events}
                initialMonth="2026-05-01"
                today="2026-05-03"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
