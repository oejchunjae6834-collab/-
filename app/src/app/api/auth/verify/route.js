import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { consumeMagicLink } from '@/lib/auth.js';

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

export async function GET(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  
  try {
    const base = getBaseUrlFromRequest(req);
    console.log(`[verify] 토큰 검증 시작. base=${base}, token=${token?.slice(0, 8)}...`);

    if (!token) {
      console.log('[verify] 토큰 없음');
      return NextResponse.redirect(new URL('/auth/error?reason=missing', base));
    }

    // 회원가입 임시 데이터 가져오기 (있으면 user 신규 생성에 사용)
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

    // 승인 대기자라면 안내 페이지로
    if (result.user.role_level <= 1) {
      console.log('[verify] 승인 대기 상태 → /auth/pending 리다이렉트');
      return NextResponse.redirect(new URL('/auth/pending', base));
    }

    // 정회원 / 관리자는 캘린더로 입장
    console.log('[verify] 정회원 상태 → /calendar 리다이렉트');
    return NextResponse.redirect(new URL('/calendar', base));
  } catch (e) {
    console.error('[verify] 예기치 않은 오류:', e);
    const base = getBaseUrlFromRequest(req);
    return NextResponse.redirect(new URL('/auth/error?reason=server_error', base));
  }
}
