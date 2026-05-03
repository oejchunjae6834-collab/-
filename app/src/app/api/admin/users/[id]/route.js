import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { updateUser, deleteUser } from '@/lib/queries.js';

export async function PUT(req, { params }) {
  const me = requireAdmin();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = parseInt(params.id, 10);
  // 자기 자신을 회원/대기로 강등 시 위험 — 마지막 관리자가 사라질 수 있음
  if (me.id === id) {
    const data = await req.json();
    if (data.role_level !== undefined && data.role_level < 3) {
      return NextResponse.json({ error: '본인 권한은 본인이 강등할 수 없어요. 다른 관리자에게 부탁하세요.' }, { status: 400 });
    }
    const u = updateUser(id, data);
    return NextResponse.json({ ok: true, user: u });
  }
  const data = await req.json();
  const u = updateUser(id, data);
  return NextResponse.json({ ok: true, user: u });
}

export async function DELETE(_req, { params }) {
  const me = requireAdmin();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = parseInt(params.id, 10);
  if (me.id === id) return NextResponse.json({ error: '본인은 삭제할 수 없어요' }, { status: 400 });
  deleteUser(id);
  return NextResponse.json({ ok: true });
}
