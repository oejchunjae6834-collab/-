import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { consumeMagicLink, getSiteBase } from '@/lib/auth.js';

const PENDING_KEY = 'dd_signup_pending';

export async function GET(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  try {
    const base = getSiteBase(req);
    console.log(`[verify] 토큰 검증 시작. base=${base}, token=${token?.slice(0, 8)}...`);

    if (!token) {
      console.log('[verify] 토큰 없음');
      return NextResponse.redirect(new URL('/auth/error?reason=missing', base));
    }

    const pendingRaw = cookies().get(PENDING_KEY)?.value;
    let signupData = null;
    if (pendingRaw) {
      try { signupData = JSON.parse(pendingRaw); } catch {}
      cookies().delete(PENDING_KEY);
    }

    const result = await consumeMagicLink({ token, signupData });

    if (!result.ok) {
      console.log(`[verify] 검증 실패: ${result.reason}`);
      return NextResponse.redirect(new URL(`/auth/error?reason=${result.reason}`, base));
    }

    console.log(`[verify] 검증 성공. user_id=${result.user.id}, role=${result.user.role_level}`);

    if (result.user.role_level <= 1) {
      console.log('[verify] 승인 대기 상태 -> /auth/pending 리다이렉트');
      return NextResponse.redirect(new URL('/auth/pending', base));
    }

    console.log('[verify] 정회원 상태 -> /calendar 리다이렉트');
    return NextResponse.redirect(new URL('/calendar', base));
  } catch (e) {
    console.error('[verify] 예기치 않은 오류:', e);
    const base = getSiteBase(req);
    return NextResponse.redirect(new URL('/auth/error?reason=server_error', base));
  }
}
