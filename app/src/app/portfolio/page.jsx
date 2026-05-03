import PortfolioTabs from './tabs.jsx';

export const metadata = { title: '활동 — 디적디적' };

export default function PortfolioPage() {
  return (
    <main className="layout single">
      <div className="content">
        <section className="card">
          <div className="card-head">
            <h2>활동 포트폴리오</h2>
            <span className="badge badge-soft">Public</span>
          </div>
          <p className="muted">
            매달 모임에서 어른과 아이가 함께 시도해 본 도구·주제·실험을 모았어요.
          </p>
          <PortfolioTabs />
        </section>
      </div>
    </main>
  );
}
