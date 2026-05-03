import { NextResponse } from 'next/server';
import { getCurrentUser, ROLES } from '@/lib/auth.js';
import { getFamilyMember, updateFamilyMember, deleteFamilyMember } from '@/lib/queries.js';

function checkAccess(fm, me) {
  if (!me) return '로그인 필요';
  if (fm.parent_user_id === me.id) return null;          // 본인 가족
  if (me.role_level >= ROLES.ADMIN) return null;          // 관리자
  return '권한 없음';
}

export async function PUT(req, { params }) {
  const me = getCurrentUser();
  const fm = getFamilyMember(parseInt(params.id, 10));
  if (!fm) return NextResponse.json({ error: '없음' }, { status: 404 });
  const err = checkAccess(fm, me);
  if (err) return NextResponse.json({ error: err }, { status: 403 });
  const data = await req.json();
  const updated = updateFamilyMember(fm.id, {
    name: data.name?.trim(),
    type: data.type,
    age: data.age != null ? parseInt(data.age, 10) : undefined,
  });
  return NextResponse.json({ ok: true, member: updated });
}

export async function DELETE(_req, { params }) {
  const me = getCurrentUser();
  const fm = getFamilyMember(parseInt(params.id, 10));
  if (!fm) return NextResponse.json({ error: '없음' }, { status: 404 });
  const err = checkAccess(fm, me);
  if (err) return NextResponse.json({ error: err }, { status: 403 });
  deleteFamilyMember(fm.id);
  return NextResponse.json({ ok: true });
}
