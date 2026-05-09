import { NextResponse } from 'next/server';
import { getCurrentUser, ROLES, SCHOOL_OPTIONS } from '@/lib/auth.js';
import { getFamilyMember, updateFamilyMember, deleteFamilyMember } from '@/lib/queries.js';

function normalizeSchool(value) {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return SCHOOL_OPTIONS.includes(value) ? value : null;
}

function checkAccess(fm, me) {
  if (!me) return '로그인 필요';
  if (fm.parent_user_id === me.id) return null;
  if (me.role_level >= ROLES.ADMIN) return null;
  return '권한 없음';
}

export async function PUT(req, { params }) {
  const me = await getCurrentUser();
  const fm = await getFamilyMember(parseInt(params.id, 10));
  if (!fm) return NextResponse.json({ error: '없음' }, { status: 404 });
  const err = checkAccess(fm, me);
  if (err) return NextResponse.json({ error: err }, { status: 403 });
  const data = await req.json();
  const updated = await updateFamilyMember(fm.id, {
    name: data.name?.trim(),
    type: data.type,
    school: 'school' in data ? normalizeSchool(data.school) : undefined,
  });
  return NextResponse.json({ ok: true, member: updated });
}

export async function DELETE(_req, { params }) {
  const me = await getCurrentUser();
  const fm = await getFamilyMember(parseInt(params.id, 10));
  if (!fm) return NextResponse.json({ error: '없음' }, { status: 404 });
  const err = checkAccess(fm, me);
  if (err) return NextResponse.json({ error: err }, { status: 403 });
  await deleteFamilyMember(fm.id);
  return NextResponse.json({ ok: true });
}
