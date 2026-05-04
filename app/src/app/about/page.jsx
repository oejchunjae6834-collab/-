import { getCmsBlocks, listAboutSections } from '@/lib/queries.js';

export const metadata = { title: '소개 — 디적디적' };

export default async function AboutPage() {
  const cms = await getCmsBlocks(['about.title', 'about.body']);
  const sections = await listAboutSections({ visibleOnly: true });

  // 관리자가 새 about_sections를 만들기 시작하면 그걸 우선 표시.
  // 비어 있으면 기존 about.body(텍스트만)를 폴백으로 보여줌.
  const hasSections = sections.length > 0;

  return (
    <main className="layout single">
      <div className="content">
        <section className="card">
          <div className="card-head">
            <h2>{cms['about.title'] || '디적디적은 어떤 모임인가요?'}</h2>
            <span className="badge badge-soft">Public</span>
          </div>

          {hasSections ? (
            <div style={{ marginTop: 4 }}>
              {sections.map((s) => {
                if (s.type === 'heading') {
                  return (
                    <h3 key={s.id} style={{ marginTop: 24, marginBottom: 8 }}>{s.content}</h3>
                  );
                }
                if (s.type === 'paragraph') {
                  return (
                    <p
                      key={s.id}
                      style={{ whiteSpace: 'pre-wrap', fontSize: '1.02rem', lineHeight: 1.8, marginBottom: 14 }}
                    >
                      {s.content}
                    </p>
                  );
                }
                if (s.type === 'image') {
                  return (
                    <figure
                      key={s.id}
                      style={{
                        margin: '18px 0',
                        textAlign: 'center',
                        background: 'var(--bg)',
                        borderRadius: 12,
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={s.content}
                        alt={s.caption || ''}
                        style={{
                          maxWidth: '100%',
                          maxHeight: 600,
                          display: 'block',
                          margin: '0 auto',
                        }}
                      />
                      {s.caption && (
                        <figcaption className="muted small" style={{ padding: '8px 12px' }}>
                          {s.caption}
                        </figcaption>
                      )}
                    </figure>
                  );
                }
                return null;
              })}
            </div>
          ) : (
            <p style={{ whiteSpace: 'pre-wrap', fontSize: '1.02rem' }}>
              {cms['about.body'] || '— 관리자가 곧 소개를 등록할 예정입니다.'}
            </p>
          )}

          <div className="three-col" style={{ marginTop: 24 }}>
            <div className="mini">
              <div className="mini-emoji">👨‍👩‍👧</div>
              <h4>누가 모이나요</h4>
              <p>AI 교육에 관심 있는 <strong>가족 단위</strong> 회원이 모여요. 아이가 함께 와도, 어른만 와도 환영입니다.</p>
            </div>
            <div className="mini">
              <div className="mini-emoji">🧩</div>
              <h4>무엇을 하나요</h4>
              <p>수학이랑 놀자 · 공동체 놀이 · 아이들 모여라 · 어른 공부 모임을 시간대별로 운영해요.</p>
            </div>
            <div className="mini">
              <div className="mini-emoji">🗓️</div>
              <h4>어떻게 참여하나요</h4>
              <p>공개 행사에 먼저 참관해 보시고, 마음에 드시면 회원 신청을 해주세요. 가족 단위 가입을 원칙으로 해요.</p>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>운영 기준</h2>
          </div>
          <ul style={{ paddingLeft: 18, color: 'var(--ink-soft)', lineHeight: 1.8 }}>
            <li><strong>월 1회 정기모임</strong> — 마하어린이도서관에서 진행</li>
            <li><strong>여름 캠프</strong> — 1일 일정</li>
            <li><strong>겨울 캠프</strong> — 1박 2일 일정</li>
            <li><strong>운영진 회의</strong> — 매달 별도 진행 (구글 Meet)</li>
            <li><strong>공개 특강</strong> — 비회원도 참관 가능 (사전 신청)</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
