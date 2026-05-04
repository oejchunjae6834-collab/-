import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { moveBoard } from '@/lib/queries.js';

export async function POST(req, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { dir } = await req.json();
  if (!['up', 'down'].includes(dir)) return NextResponse.json({ error: 'dir invalid' }, { status: 400 });
  await moveBoard(parseInt(params.id, 10), dir);
  return NextResponse.json({ ok: true });
}
