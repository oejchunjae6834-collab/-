import { NextResponse } from 'next/server';
import { getCurrentUser, hasPermission, ROLES } from '@/lib/auth.js';
import { getComment, deleteComment } from '@/lib/queries.js';

export async function DELETE(_req, { params }) {
  const me = getCurrentUser();
  if (!me) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 });

  const id = parseInt(params.id, 10);
  const c = getComment(id);
  if (!c) return NextResponse.json({ error: '댓글이 없어요' }, { status: 404 });

  // 본인 댓글이거나, 모더레이터/관리자만 삭제 가능
  const isOwner = c.user_id === me.id;
  const canModerate = me.role_level >= ROLES.ADMIN || hasPermission(me, 'moderate_comments');
  if (!isOwner && !canModerate) {
    return NextResponse.json({ error: '권한이 없어요' }, { status: 403 });
  }

  deleteComment(id);
  return NextResponse.json({ ok: true });
}
