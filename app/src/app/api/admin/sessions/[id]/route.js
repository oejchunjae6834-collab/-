import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { updateSession, deleteSession } from '@/lib/queries.js';

export async function PUT(req, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const data = await req.json();
  const s = await updateSession(parseInt(params.id, 10), data);
  return NextResponse.json({ ok: true, session: s });
}

export async function DELETE(_req, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await deleteSession(parseInt(params.id, 10));
  return NextResponse.json({ ok: true });
}
