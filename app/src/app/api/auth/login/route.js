import { NextResponse } from 'next/server';
import { loginWithPassword } from '@/lib/auth.js';

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    const result = await loginWithPassword({ username, password });
    if (!result.ok) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않아요' },
        { status: 401 }
      );
    }
    return NextResponse.json({
      ok: true,
      role_level: result.user.role_level,
      is_approved: !!result.user.is_approved,
    });
  } catch (e) {
    console.error('[login] 오류:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
