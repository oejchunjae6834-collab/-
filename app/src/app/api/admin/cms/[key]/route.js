import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { setCmsBlock } from '@/lib/queries.js';

export async function PUT(req, { params }) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { value } = await req.json();
  await setCmsBlock(decodeURIComponent(params.key), value ?? '', me.id);
  return NextResponse.json({ ok: true });
}
