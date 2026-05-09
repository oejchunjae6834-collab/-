import Link from 'next/link';
import LoginForm from './form.jsx';

export const metadata = { title: '로그인 — 디적디적' };

export default function LoginPage() {
  return (
    <main className="auth-page">
      <h2>로그인</h2>
      <p className="muted">
        아이디와 비밀번호를 입력해 주세요.
      </p>

      <LoginForm />

      <p className="muted small mt">
        아직 회원이 아니세요? <Link href="/signup" style={{ color: 'var(--primary-ink)', fontWeight: 600 }}>회원가입 신청</Link>
      </p>
    </main>
  );
}
