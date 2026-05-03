import { NextResponse } from 'next/server';
import { getCurrentUser, ROLES } from '@/lib/auth.js';
import { getPost, deletePost, updatePost } from '@/lib/queries.js';

export async function PUT(req, { params }) {
  const me = getCurrentUser();
  if (!me) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });
  const id = parseInt(params.id, 10);
  const post = getPost(id);
  if (!post) return NextResponse.json({ error: '없음' }, { status: 404 });
  const isOwner = post.author_id === me.id;
  const isAdmin = me.role_level >= ROLES.ADMIN;
  if (!isOwner && !isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  const data = await req.json();
  const updated = updatePost(id, data);
  return NextResponse.json({ ok: true, post: updated });
}

export async function DELETE(_req, { params }) {
  const me = getCurrentUser();
  if (!me) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });
  const id = parseInt(params.id, 10);
  const post = getPost(id);
  if (!post) return NextResponse.json({ error: '없음' }, { status: 404 });
  const isOwner = post.author_id === me.id;
  const isAdmin = me.role_level >= ROLES.ADMIN;
  if (!isOwner && !isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  deletePost(id);
  return NextResponse.json({ ok: true });
}
