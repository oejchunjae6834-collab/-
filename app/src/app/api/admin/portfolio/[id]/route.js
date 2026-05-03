import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { updatePortfolioItem, deletePortfolioItem, movePortfolioItem } from '@/lib/queries.js';

export async function PUT(req, { params }) {
  if (!requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const data = await req.json();
  const id = parseInt(params.id, 10);
  if (data.move === 'up' || data.move === 'down') {
    movePortfolioItem(id, data.move);
    return NextResponse.json({ ok: true });
  }
  const item = updatePortfolioItem(id, data);
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(_req, { params }) {
  if (!requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  deletePortfolioItem(parseInt(params.id, 10));
  return NextResponse.json({ ok: true });
}
