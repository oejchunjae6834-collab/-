import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { updateEvent, deleteEvent } from '@/lib/queries.js';

export async function PUT(req, { params }) {
  if (!requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const data = await req.json();
  const ev = updateEvent(parseInt(params.id, 10), data);
  return NextResponse.json({ ok: true, event: ev });
}

export async function DELETE(_req, { params }) {
  if (!requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  deleteEvent(parseInt(params.id, 10));
  return NextResponse.json({ ok: true });
}
