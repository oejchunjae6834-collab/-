import Link from 'next/link';
import { getEvent, listComments } from '@/lib/queries.js';
import { getCurrentUser, hasPermission, ROLES } from '@/lib/auth.js';
import PublicRsvpForm from './form.jsx';
import CommentSection from '@/components/CommentSection.jsx';

export default function PublicEventDetail({ params }) {
  const ev = getEvent(parseInt(params.id, 10));
  if (!ev || !ev.is_public) {
    return (
      <main className="auth-page">
        <h2>행사를 찾을 수 없어요</h2>
        <p className="muted">이미 종료되었거나 비공개로 전환된 행사일 수 있어요.</p>
        <Link href="/events/public" className="btn btn-primary">공개 행사 목록으로</Link>
      </main>
    );
  }

  return (
    <main className="layout single">
      <div className="content">
        <section className="card">
          <div className="card-head">
            <h2>{ev.title}</h2>
            <span className="badge badge-warm">{ev.event_type}</span>
          </div>
          <div className="ev-meta-row">
            <span className="ev-pill">📅 {ev.start_date}{ev.end_date ? ` ~ ${ev.end_date}` : ''}</span>
            {ev.start_time && <span className="ev-pill">⏰ {ev.start_time}{ev.end_time ? `~${ev.end_time}`:''}</span>}
            <span className="ev-pill">📍 {ev.location}</span>
          </div>
          <p style={{ marginTop: 14 }}>{ev.description}</p>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>참석 신청</h3>
          </div>
          <p className="muted small">
            아래 폼을 작성해 주세요. 신청 후 운영진이 확인 안내를 보내드릴 수 있어요.
          </p>
          <PublicRsvpForm eventId={ev.id} />
        </section>

        {(() => {
          const me = getCurrentUser();
          const isMember = me && me.role_level >= ROLES.MEMBER;
          const comments = listComments('event', ev.id);
          const canModerate = me && (me.role_level >= ROLES.ADMIN || hasPermission(me, 'moderate_comments'));
          return (
            <section className="card">
              <div className="card-head">
                <h3>이 행사에 대한 이야기</h3>
                {!isMember && <span className="badge badge-soft">회원만 작성</span>}
              </div>
              <CommentSection
                targetType="event"
                targetId={ev.id}
                initialComments={comments}
                me={isMember ? { id: me.id, name: me.name, role_level: me.role_level } : null}
                canModerate={!!canModerate}
              />
            </section>
          );
        })()}
      </div>
    </main>
  );
}
