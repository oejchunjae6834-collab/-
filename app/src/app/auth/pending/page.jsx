import Link from 'next/link';

export const metadata = { title: '가입 신청 접수 — 디적디적' };

export default function PendingPage() {
  return (
    <main className="auth-page">
      <h2>가입 신청이 접수되었어요 🎉</h2>
      <p>
        환영해요. 운영진이 확인 후 정회원 권한을 부여해드려요.
        승인되면 캘린더·아카이브·AI 검색을 모두 사용하실 수 있어요.
      </p>
      <p className="muted small">
        승인은 보통 며칠 안에 진행돼요. 그동안 공개 페이지(소개·활동·공개 행사)는 자유롭게 둘러보실 수 있어요.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Link href="/" className="btn btn-primary">홈으로</Link>
        <Link href="/portfolio" className="btn btn-outline">활동 둘러보기</Link>
      </div>
    </main>
  );
}
