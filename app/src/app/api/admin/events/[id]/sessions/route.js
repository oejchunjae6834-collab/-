import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { createSession, getEvent } from '@/lib/queries.js';

export async function POST(req, { params }) {
  if (!requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const eventId = parseInt(params.id, 10);
  if (!getEvent(eventId)) return NextResponse.json({ error: '일정 없음' }, { status: 404 });
  const data = await req.json();
  if (!data.name || !data.name.trim()) return NextResponse.json({ error: '세션 이름이 필요해요' }, { status: 400 });
  const session = createSession(eventId, data);
  return NextResponse.json({ ok: true, session });
}
