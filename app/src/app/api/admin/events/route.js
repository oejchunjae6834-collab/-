import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { createEvent } from '@/lib/queries.js';

export async function POST(req) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const data = await req.json();
  const ev = await createEvent(data, me.id);
  return NextResponse.json({ ok: true, event: ev });
}
