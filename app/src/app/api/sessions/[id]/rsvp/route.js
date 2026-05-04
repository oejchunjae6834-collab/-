import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/auth.js';
import { getSession, getFamilyMember, setSessionAttendance, listEventSessionAttendances } from '@/lib/queries.js';

/**
 * 세션별·가족구성원별 RSVP 갱신 (CLAUDE.md 1-B)
 *
 * body: { family_member_id, status: 'going'|'no'|'maybe'|null }
 * 권한: 본인이 부모인 family_member 만 수정 가능 (관리자는 모두)
 * 응답: { ok, totals: { going, maybe, no } } — 해당 세션 합계 반환 (실시간 가용성)
 */
export async function POST(req, { params }) {
  const me = await requireMember();
  if (!me) return NextResponse.json({ error: '회원 로그인이 필요해요' }, { status: 401 });

  const sessionId = parseInt(params.id, 10);
  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: '세션 없음' }, { status: 404 });

  const { family_member_id, status } = await req.json();
  const fm = await getFamilyMember(parseInt(family_member_id, 10));
  if (!fm) return NextResponse.json({ error: '가족 구성원 없음' }, { status: 404 });

  if (fm.parent_user_id !== me.id && me.role_level < 3) {
    return NextResponse.json({ error: '다른 가족의 출석은 수정할 수 없어요' }, { status: 403 });
  }
  if (status && !['going', 'no', 'maybe'].includes(status)) {
    return NextResponse.json({ error: '잘못된 상태' }, { status: 400 });
  }

  await setSessionAttendance(sessionId, fm.id, status || null);

  const all = (await listEventSessionAttendances(session.event_id)).filter((r) => r.session_id === sessionId);
  const totals = { going: 0, no: 0, maybe: 0 };
  for (const r of all) totals[r.status] = (totals[r.status] || 0) + 1;
  return NextResponse.json({ ok: true, totals });
}
