import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { createArchive } from '@/lib/queries.js';

export async function POST(req) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const data = await req.json();
  const doc = await createArchive(data);
  return NextResponse.json({ ok: true, doc });
}
