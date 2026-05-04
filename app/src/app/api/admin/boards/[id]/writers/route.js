import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { addBoardWriter } from '@/lib/queries.js';

export async function POST(req, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { user_id } = await req.json();
  if (!user_id) return NextResponse.json({ error: 'user_id 필요' }, { status: 400 });
  await addBoardWriter(parseInt(params.id, 10), parseInt(user_id, 10));
  return NextResponse.json({ ok: true });
}
