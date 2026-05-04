import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { createBoard, getBoard } from '@/lib/queries.js';

export async function POST(req) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const data = await req.json();
  if (!data.slug || !data.name) {
    return NextResponse.json({ error: '이름과 슬러그는 필수예요' }, { status: 400 });
  }
  if (await getBoard(data.slug)) {
    return NextResponse.json({ error: '같은 슬러그가 이미 있어요' }, { status: 400 });
  }
  const board = await createBoard({ ...data, position: 1000 + Date.now() % 1000, is_system: 0 });
  return NextResponse.json({ ok: true, board });
}
