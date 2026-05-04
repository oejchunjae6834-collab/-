import { NextResponse } from 'next/server';
import { createMagicLink } from '@/lib/auth.js';
import { sendMagicLinkEmail } from '@/lib/email.js';
import { cookies } from 'next/headers';
import { queryOne } from '@/lib/db.js';

const PENDING_KEY = 'dd_signup_pending';

/**
 * 현재 요청에서 base URL을 추출합니다.
 * 우선순위: NEXT_PUBLIC_BASE_URL > 요청 헤더 > localhost
 */
function getBaseUrlFromRequest(req) {
  // 환경 변수 우선
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
  }
  
  // 요청 헤더에서 추출 (Render, Vercel 등 프록시 환경)
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (host) {
    const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
  }
  
  return 'http://localhost:3000';
}

export async function POST(req) {
  try {
    const data = await req.json();
    const email = (data.email || '').toLowerCase().trim();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: '유효한 이메일을 입력해 주세요' }, { status: 400 });
    }
    if (!data.name || !data.family_role) {
      return NextResponse.json({ error: '이름과 가족 형태는 필수예요' }, { status: 400 });
    }

    const existing = await queryOne('SELECT * FROM users WHERE email = $1', [email]);
    if (existing) {
      return NextResponse.json({ error: '이미 가입된 이메일이에요. 로그인을 이용해 주세요.' }, { status: 400 });
    }

    const token = await createMagicLink(email);
    cookies().set(PENDING_KEY, JSON.stringify({
      email,
      name: data.name,
      family_role: data.family_role,
      family_members: data.family_members || [],
      motive: data.motive || '',
    }), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 30 });

    const baseUrl = getBaseUrlFromRequest(req);
    const url = `${baseUrl}/api/auth/verify?token=${token}`;
    console.log(`[signup] 매직링크 생성: ${url}`);
    
    await sendMagicLinkEmail({ to: email, url, purpose: 'signup' });
    return NextResponse.json({ ok: true, devUrl: url });
  } catch (e) {
    console.error('[signup] 오류:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
