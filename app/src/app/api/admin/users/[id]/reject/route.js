import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { rejectUser } from '@/lib/queries.js';

export async function POST(_req, { params }) {
  if (!requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  rejectUser(parseInt(params.id, 10));
  return NextResponse.json({ ok: true });
}
