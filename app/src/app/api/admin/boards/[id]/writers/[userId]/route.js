import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { removeBoardWriter } from '@/lib/queries.js';

export async function DELETE(_req, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await removeBoardWriter(parseInt(params.id, 10), parseInt(params.userId, 10));
  return NextResponse.json({ ok: true });
}
