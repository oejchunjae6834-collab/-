import { NextResponse } from 'next/server';
import { getCurrentUser, canWriteBoard } from '@/lib/auth.js';
import { getBoard, isBoardWriter, createPost } from '@/lib/queries.js';

export async function POST(req, { params }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 });
  const board = await getBoard(params.slug);
  if (!board) return NextResponse.json({ error: '보드 없음' }, { status: 404 });
  const isWriter = await isBoardWriter(board.id, me.id);
  if (!canWriteBoard(board, me, isWriter)) {
    return NextResponse.json({ error: '이 보드에 글을 쓸 권한이 없어요' }, { status: 403 });
  }
  const data = await req.json();
  if (!data.title || !data.title.trim()) {
    return NextResponse.json({ error: '제목을 입력해 주세요' }, { status: 400 });
  }
  const post = await createPost({
    board_id: board.id,
    title: data.title.trim(),
    body: (data.body || '').trim(),
    meta: data.meta || '{}',
    author_id: me.id,
    pinned: data.pinned ? 1 : 0,
  });
  return NextResponse.json({ ok: true, post });
}
