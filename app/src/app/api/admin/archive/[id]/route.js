import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { updateArchive, deleteArchive } from '@/lib/queries.js';

export async function PUT(req, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const data = await req.json();
  const doc = await updateArchive(parseInt(params.id, 10), data);
  return NextResponse.json({ ok: true, doc });
}

export async function DELETE(_req, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await deleteArchive(parseInt(params.id, 10));
  return NextResponse.json({ ok: true });
}
