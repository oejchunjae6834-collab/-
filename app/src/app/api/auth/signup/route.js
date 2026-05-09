import { NextResponse } from 'next/server';
import { signupWithPassword } from '@/lib/auth.js';

export async function POST(req) {
  try {
    const data = await req.json();
    const result = await signupWithPassword(data);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      role_level: result.user.role_level,
    });
  } catch (e) {
    console.error('[signup] 오류:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
