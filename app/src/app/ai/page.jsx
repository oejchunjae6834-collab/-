import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/auth.js';

export const metadata = { title: 'AI 검색 — 디적디적' };

export default function AiPage() {
  const me = requireMember();
  if (!me) redirect('/login');

  return (
    <main className="layout single">
      <div className="content">
        <section className="card">
          <div className="card-head">
            <h2>AI 지식 검색</h2>
            <span className="badge badge-warm">Members · RAG</span>
          </div>
          <p className="muted small">
            저장된 회의록·밴드글을 바탕으로 답해드릴 예정이에요.
          </p>

          <div className="ai-coming">
            <h3 style={{ marginTop: 0 }}>🚧 Phase 2에서 활성화돼요</h3>
            <p style={{ margin: '8px 0', color: 'var(--ink-soft)' }}>
              지금은 백엔드·DB·인증을 먼저 깔아두는 Phase 1 단계입니다. 다음 단계에서 아래 두 가지를 붙이면 진짜 AI 답변이 동작해요.
            </p>
            <ul style={{ margin: '8px 0 0 18px', color: 'var(--ink-soft)', lineHeight: 1.7 }}>
              <li>📁 <strong>Google Drive 연동</strong> — 운영진이 공유한 폴더의 회의록을 자동 수집</li>
              <li>🤖 <strong>Gemini 무료 티어</strong> — 임베딩 + 답변 생성 ($0)</li>
            </ul>
            <p style={{ marginTop: 12, marginBottom: 0, color: 'var(--ink-soft)' }}>
              그 전까지는 <a href="/archive" style={{ color: 'var(--primary-ink)', fontWeight: 600 }}>아카이브</a>에서 키워드로 직접 찾아보실 수 있어요.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
