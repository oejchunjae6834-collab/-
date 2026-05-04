import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { approveUser } from '@/lib/queries.js';

export async function POST(_req, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await approveUser(parseInt(params.id, 10), 2);
  return NextResponse.json({ ok: true });
}
