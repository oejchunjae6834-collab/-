import { NextResponse } from 'next/server';
import { requireMember, ROLES } from '@/lib/auth.js';
import { createFamilyMember } from '@/lib/queries.js';

/**
 * 가족 구성원 추가
 * body: { parent_user_id?, name, type: '부모'|'자녀', age? }
 * 본인 가족만 추가 가능. 관리자는 parent_user_id로 다른 회원 가족도 추가 가능.
 */
export async function POST(req) {
  const me = requireMember();
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
  const fm = createFamilyMember(parentId, {
    name: data.name.trim(),
    type: data.type,
    age: data.age ? parseInt(data.age, 10) : null,
  });
  return NextResponse.json({ ok: true, member: fm });
}
