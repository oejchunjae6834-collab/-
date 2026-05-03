import Link from 'next/link';
import SignupForm from './form.jsx';

export const metadata = { title: '회원가입 신청 — 디적디적' };

export default function SignupPage() {
  return (
    <main className="auth-page">
      <h2>회원가입 신청</h2>
      <p className="muted">
        디적디적은 가족 단위로 함께하는 모임이에요.
        신청해 주시면 운영진이 확인 후 정회원 권한을 부여해드려요.
      </p>
      <SignupForm />
      <p className="muted small mt">
        이미 회원이신가요? <Link href="/login" style={{ color: 'var(--primary-ink)', fontWeight: 600 }}>로그인</Link>
      </p>
    </main>
  );
}
