import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { updateBoard, deleteBoard, getBoard } from '@/lib/queries.js';

export async function PUT(req, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = parseInt(params.id, 10);
  const b = await getBoard(id);
  if (!b) return NextResponse.json({ error: '없음' }, { status: 404 });
  const data = await req.json();
  if (b.is_system) {
    delete data.slug;
    delete data.type;
  }
  const updated = await updateBoard(id, data);
  return NextResponse.json({ ok: true, board: updated });
}

export async function DELETE(_req, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    await deleteBoard(parseInt(params.id, 10));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
