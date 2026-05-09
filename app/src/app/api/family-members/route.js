import { NextResponse } from 'next/server';
import { requireMember, ROLES, SCHOOL_OPTIONS } from '@/lib/auth.js';
import { createFamilyMember } from '@/lib/queries.js';

export async function POST(req) {
  const me = await requireMember();
  if (!me) return NextResponse.json({ error: '회원 로그인이 필요해요' }, { status: 401 });
  const data = await req.json();
  let parentId = me.id;
  if (data.parent_user_id && data.parent_user_id !== me.id) {
    if (me.role_level < ROLES.ADMIN) {
      return NextResponse.json({ error: '다른 회원의 가족을 추가할 수 없어요' }, { status: 403 });
    }
    parentId = data.parent_user_id;
  }
  if (!data.name || !data.name.trim()) {
    return NextResponse.json({ error: '이름이 필요해요' }, { status: 400 });
  }
  if (!['부모', '자녀'].includes(data.type)) {
    return NextResponse.json({ error: '유형은 부모/자녀 중 하나' }, { status: 400 });
  }
  const school = data.type === '자녀' && SCHOOL_OPTIONS.includes(data.school) ? data.school : null;
  const fm = await createFamilyMember(parentId, {
    name: data.name.trim(),
    type: data.type,
    school,
  });
  return NextResponse.json({ ok: true, member: fm });
}
