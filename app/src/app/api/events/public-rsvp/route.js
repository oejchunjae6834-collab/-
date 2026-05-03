import { NextResponse } from 'next/server';
import { createPublicRsvp, getEvent } from '@/lib/queries.js';

export async function POST(req) {
  try {
    const data = await req.json();
    if (!data.event_id || !data.name || !data.email) {
      return NextResponse.json({ error: '필수 항목이 비어 있어요' }, { status: 400 });
    }
    const ev = getEvent(data.event_id);
    if (!ev || !ev.is_public) {
      return NextResponse.json({ error: '신청할 수 없는 행사예요' }, { status: 400 });
    }
    createPublicRsvp(data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
