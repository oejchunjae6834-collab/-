import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { updateBoard, deleteBoard, getBoard } from '@/lib/queries.js';

export async function PUT(req, { params }) {
  if (!requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = parseInt(params.id, 10);
  const b = getBoard(id);
  if (!b) return NextResponse.json({ error: '없음' }, { status: 404 });
  const data = await req.json();
  // 시스템 보드는 slug/type 변경 금지
  if (b.is_system) {
    delete data.slug;
    delete data.type;
  }
  const updated = updateBoard(id, data);
  return NextResponse.json({ ok: true, board: updated });
}

export async function DELETE(_req, { params }) {
  if (!requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    deleteBoard(parseInt(params.id, 10));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
