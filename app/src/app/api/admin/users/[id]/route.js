import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { updateUser, deleteUser } from '@/lib/queries.js';

export async function PUT(req, { params }) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = parseInt(params.id, 10);
  const data = await req.json();
  if (me.id === id && data.role_level !== undefined && data.role_level < 3) {
    return NextResponse.json({ error: '본인 권한은 본인이 강등할 수 없어요. 다른 관리자에게 부탁하세요.' }, { status: 400 });
  }
  const u = await updateUser(id, data);
  return NextResponse.json({ ok: true, user: u });
}

export async function DELETE(_req, { params }) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = parseInt(params.id, 10);
  if (me.id === id) return NextResponse.json({ error: '본인은 삭제할 수 없어요' }, { status: 400 });
  await deleteUser(id);
  return NextResponse.json({ ok: true });
}
