import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/auth.js';
import { createComment, getComment } from '@/lib/queries.js';
import { getDb } from '@/lib/db.js';

export async function POST(req) {
  const me = requireMember();
  if (!me) return NextResponse.json({ error: '회원 로그인이 필요해요' }, { status: 401 });
  const data = await req.json();
  const targetType = data.target_type;
  const targetId = parseInt(data.target_id, 10);
  const body = (data.body || '').trim();
  if (!['archive', 'event', 'post'].includes(targetType)) {
    return NextResponse.json({ error: '잘못된 target_type' }, { status: 400 });
  }
  if (!targetId) return NextResponse.json({ error: 'target_id 누락' }, { status: 400 });
  if (!body) return NextResponse.json({ error: '내용을 입력해 주세요' }, { status: 400 });
  if (body.length > 2000) return NextResponse.json({ error: '댓글이 너무 길어요 (최대 2,000자)' }, { status: 400 });

  const parentId = data.parent_id ? parseInt(data.parent_id, 10) : null;
  const id = createComment({ targetType, targetId, userId: me.id, body, parentId });
  // 새로 만든 댓글에 user_name 합쳐서 반환
  const row = getDb().prepare(`
    SELECT c.id, c.body, c.created_at, c.user_id, c.parent_id, u.name AS user_name, u.role_level
    FROM comments c LEFT JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
  `).get(id);
  return NextResponse.json({ ok: true, comment: { ...row } });
}
