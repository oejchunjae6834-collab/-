import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { consumeMagicLink } from '@/lib/auth.js';

const PENDING_KEY = 'dd_signup_pending';

export async function GET(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const base = process.env.NEXT_PUBLIC_BASE_URL || url.origin;

  if (!token) {
    return NextResponse.redirect(new URL('/auth/error?reason=missing', base));
  }

  // 회원가입 임시 데이터 가져오기 (있으면 user 신규 생성에 사용)
  const pendingRaw = cookies().get(PENDING_KEY)?.value;
  let signupData = null;
  if (pendingRaw) {
    try { signupData = JSON.parse(pendingRaw); } catch {}
    cookies().delete(PENDING_KEY);
  }

  const result = consumeMagicLink({ token, signupData });

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/auth/error?reason=${result.reason}`, base));
  }

  // 승인 대기자라면 안내 페이지로
  if (result.user.role_level <= 1) {
    return NextResponse.redirect(new URL('/auth/pending', base));
  }

  // 정회원 / 관리자는 캘린더로 입장
  return NextResponse.redirect(new URL('/calendar', base));
}
