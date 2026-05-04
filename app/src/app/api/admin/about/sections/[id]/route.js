import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { updateAboutSection, deleteAboutSection, moveAboutSection } from '@/lib/queries.js';

export async function PUT(req, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = parseInt(params.id, 10);
  const data = await req.json();
  if (data.move === 'up' || data.move === 'down') {
    await moveAboutSection(id, data.move);
    return NextResponse.json({ ok: true });
  }
  const section = await updateAboutSection(id, data);
  return NextResponse.json({ ok: true, section });
}

export async function DELETE(_req, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await deleteAboutSection(parseInt(params.id, 10));
  return NextResponse.json({ ok: true });
}
