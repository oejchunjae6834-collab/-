import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { createPortfolioItem } from '@/lib/queries.js';

export async function POST(req) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const data = await req.json();
  if (!data.title || !data.title.trim()) {
    return NextResponse.json({ error: '제목을 입력해주세요' }, { status: 400 });
  }
  const item = await createPortfolioItem(data);
  return NextResponse.json({ ok: true, item });
}
