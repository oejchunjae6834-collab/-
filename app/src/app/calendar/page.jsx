import Link from 'next/link';
import { getCurrentUser, ROLES } from '@/lib/auth.js';
import {
  listEvents, listAttendance, myAttendance,
  listSessions, listFamilyMembers, listEventSessionAttendances, myFamilySessionStatus,
} from '@/lib/queries.js';
import RsvpRow from './rsvp-row.jsx';
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

export default function CalendarPage() {
  const me = getCurrentUser();
  const isMember = me && me.role_level >= ROLES.MEMBER;

  // 비회원: 공개 일정만, 회원: 모두
  const events = isMember ? listEvents() : listEvents({ publicOnly: true });
  const myFamily = isMember ? listFamilyMembers(me.id) : [];

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
              가족 구성원과 세션별로 참석 여부를 체크해 주세요. 세션별 합계가 실시간으로 보입니다.
            </p>
          )}

          <div className="two-col">
            <div className="event-list">
              {events.length === 0 ? (
                <p className="muted small">표시할 일정이 없어요.</p>
              ) : events.map((ev) => {
                const sessions = listSessions(ev.id);
                const hasSessions = sessions.length > 0;
                let totalsBySession = {};
                let myStatus = [];
                if (isMember && hasSessions) {
                  const all = listEventSessionAttendances(ev.id);
                  for (const r of all) {
                    totalsBySession[r.session_id] ||= { going: 0, maybe: 0, no: 0 };
                    totalsBySession[r.session_id][r.status] = (totalsBySession[r.session_id][r.status] || 0) + 1;
                  }
                  myStatus = myFamilySessionStatus(ev.id, me.id);
                }
                // 세션 없는 일정은 기존 단순 RSVP 유지
                const attendance = (isMember && !hasSessions) ? listAttendance(ev.id) : [];
                const my = (isMember && !hasSessions) ? myAttendance(ev.id, me.id) : null;
                const goingCount = !hasSessions
                  ? attendance.filter((a) => a.status === 'going').length
                  : (() => {
                      // 세션이 있는 경우 — 가장 많이 참석하는 세션의 going 수 (대표값)
                      let max = 0;
                      for (const t of Object.values(totalsBySession)) max = Math.max(max, t.going || 0);
                      return max;
                    })();

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
                          {hasSessions && <span className="ev-pill">🎯 세션 {sessions.length}개</span>}
                          {isMember && <span className="ev-pill">👥 참석 {goingCount}명</span>}
                        </div>
                      </div>
                    </div>

                    {isMember && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
                        {hasSessions ? (
                          <FamilySessionGrid
                            sessions={sessions}
                            familyMembers={myFamily}
                            initialMyStatus={myStatus}
                            sessionTotals={totalsBySession}
                            eventId={ev.id}
                          />
                        ) : (
                          <RsvpRow eventId={ev.id} initial={my} attendance={attendance} myId={me.id} />
                        )}
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
