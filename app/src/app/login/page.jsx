import Link from 'next/link';
import LoginForm from './form.jsx';

export const metadata = { title: '로그인 — 디적디적' };

export default function LoginPage({ searchParams }) {
  const sent = searchParams?.sent === '1';
  return (
    <main className="auth-page">
      <h2>로그인</h2>
      <p className="muted">
        등록된 이메일을 입력하시면 로그인 링크를 보내드릴게요.<br />
        (개발 모드에서는 서버 콘솔에 링크가 표시됩니다.)
      </p>

      {sent && (
        <div className="banner-info">
          📬 매직링크가 발송되었어요. 이메일(또는 서버 콘솔)을 확인해 주세요.
        </div>
      )}

      <LoginForm />

      <p className="muted small mt">
        아직 회원이 아니세요? <Link href="/signup" style={{ color: 'var(--primary-ink)', fontWeight: 600 }}>회원가입 신청</Link>
      </p>
    </main>
  );
}
