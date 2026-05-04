import { NextResponse } from 'next/server';
import { createMagicLink } from '@/lib/auth.js';
import { sendMagicLinkEmail } from '@/lib/email.js';
import { queryOne } from '@/lib/db.js';

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
    const { email } = await req.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: '유효한 이메일을 입력해 주세요' }, { status: 400 });
    }
    const cleaned = email.toLowerCase().trim();
    const exists = await queryOne('SELECT id FROM users WHERE email = $1', [cleaned]);
    if (!exists) {
      return NextResponse.json({ error: '등록된 이메일이 아닙니다. 회원가입을 먼저 해주세요.' }, { status: 404 });
    }
    const token = await createMagicLink(cleaned);
    const baseUrl = getBaseUrlFromRequest(req);
    const url = `${baseUrl}/api/auth/verify?token=${token}`;
    console.log(`[login] 매직링크 생성: ${url}`);
    
    await sendMagicLinkEmail({ to: cleaned, url, purpose: 'login' });
    // 개발 모드 편의: 응답에도 매직 URL을 같이 보냅니다
    return NextResponse.json({ ok: true, devUrl: url });
  } catch (e) {
    console.error('[login] 오류:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
