import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { createAboutSection } from '@/lib/queries.js';

export async function POST(req) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const data = await req.json();
  if (!['heading', 'paragraph', 'image'].includes(data.type)) {
    return NextResponse.json({ error: 'type은 heading/paragraph/image 중 하나여야 해요' }, { status: 400 });
  }
  if (data.type !== 'image' && !(data.content || '').trim()) {
    return NextResponse.json({ error: '내용을 입력해주세요' }, { status: 400 });
  }
  if (data.type === 'image' && !(data.content || '').trim()) {
    return NextResponse.json({ error: '이미지 URL이 필요해요' }, { status: 400 });
  }
  const section = await createAboutSection(data);
  return NextResponse.json({ ok: true, section });
}
