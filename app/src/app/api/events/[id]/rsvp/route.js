import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/auth.js';
import { setAttendance, listAttendance, getEvent } from '@/lib/queries.js';

export async function POST(req, { params }) {
  const me = requireMember();
  if (!me) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 });

  const id = parseInt(params.id, 10);
  const ev = getEvent(id);
  if (!ev) return NextResponse.json({ error: '일정을 찾을 수 없어요' }, { status: 404 });

  const { status } = await req.json();
  if (status && !['going','no','maybe'].includes(status)) {
    return NextResponse.json({ error: '잘못된 상태' }, { status: 400 });
  }

  setAttendance(id, me.id, status || null);
  return NextResponse.json({ ok: true, attendance: listAttendance(id) });
}
