import Link from 'next/link';

export const metadata = { title: '인증 실패 — 디적디적' };

const REASONS = {
  invalid: '이미 사용했거나 잘못된 링크예요.',
  used:    '이미 사용한 링크예요. 로그인 페이지에서 다시 발송해 주세요.',
  expired: '링크가 만료됐어요 (15분). 다시 발송해 주세요.',
  no_user: '가입 정보가 없어요. 회원가입부터 진행해 주세요.',
  missing: '토큰이 없어요. 매직링크를 정확히 복사하셨는지 확인해 주세요.',
};

export default function AuthErrorPage({ searchParams }) {
  const reason = searchParams?.reason;
  const msg = REASONS[reason] || '알 수 없는 오류가 발생했어요.';

  return (
    <main className="auth-page">
      <h2>인증에 실패했어요</h2>
      <p className="muted">{msg}</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Link href="/login" className="btn btn-primary">로그인 다시 시도</Link>
        <Link href="/signup" className="btn btn-outline">회원가입</Link>
      </div>
    </main>
  );
}
