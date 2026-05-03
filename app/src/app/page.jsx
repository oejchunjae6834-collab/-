import Link from 'next/link';
import { listEvents, getCmsBlocks } from '@/lib/queries.js';
import MiniCalendar from '@/components/MiniCalendar.jsx';

export default function HomePage() {
  const cms = getCmsBlocks();
  // 관리자가 "랜딩 노출"로 표시한 일정 우선. 없으면 가장 가까운 일정 자동 선택.
  const featured = listEvents({ featuredOnly: true });
  const fallback = listEvents({ publicOnly: true })
    .filter((e) => new Date(e.start_date) >= new Date('2026-05-01'))
    .slice(0, 1);
  const heroEvents = featured.length ? featured : fallback;

  // 캘린더 위젯에 보여줄 일정: 비회원에게 노출되는 일정만
  const calendarEvents = listEvents({ publicOnly: true });

  // 한 달은 첫 추천 행사 또는 오늘 기준
  const initialMonth = heroEvents[0]?.start_date || '2026-05-01';
  const todayStr = '2026-05-03'; // 데모용 고정

  const heroTitle = (cms['hero.title'] || '').split('\\n');

  return (
    <>
      {cms['notice'] && <div className="notice-bar">📣 {cms['notice']}</div>}

      <section className="hero">
        <div className="hero-inner">
          <p className="kicker">{cms['hero.kicker'] || 'Dijeok-Dijeok'}</p>
          <h1>
            {heroTitle.map((line, i) => (
              <span key={i}>
                {i === 0 ? <span className="hl">{line}</span> : <span className="hl2">{line}</span>}
                {i < heroTitle.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="lede">{cms['hero.lede']}</p>
          <div className="hero-cta">
            <Link href="/about" className="btn btn-primary btn-lg">디적디적 알아보기</Link>
            <Link href="/calendar" className="btn btn-outline btn-lg">일정 보기</Link>
          </div>
          <ul className="hero-pills">
            <li>#AI리터러시</li>
            <li>#수학이랑놀자</li>
            <li>#공동체놀이</li>
            <li>#어른공부모임</li>
            <li>#가족과함께</li>
          </ul>
        </div>
      </section>

      <main className="layout single">
        <div className="content">
          <section className="card">
            <div className="card-head">
              <h2>가까운 일정</h2>
              <Link href="/calendar" className="btn btn-ghost btn-sm">전체 보기 →</Link>
            </div>

            <div className="two-col">
              {/* 좌측: 추천 일정 카드 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {heroEvents.length === 0 ? (
                  <p className="muted small">예정된 일정이 아직 없어요.</p>
                ) : heroEvents.map((ev) => (
                  <Link key={ev.id} href="/calendar" className="featured-event">
                    <div className="fe-date">
                      📅 {ev.start_date}{ev.end_date ? ` ~ ${ev.end_date}` : ''}
                    </div>
                    <h4>{ev.title}</h4>
                    <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '.92rem' }}>{ev.description}</p>
                    <div className="ev-meta-row">
                      <span className="ev-pill type-public">{ev.event_type}</span>
                      <span className="ev-pill">📍 {ev.location}</span>
                      {ev.start_time && <span className="ev-pill">⏰ {ev.start_time}{ev.end_time ? `~${ev.end_time}` : ''}</span>}
                    </div>
                    <span className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                      자세히 보기 →
                    </span>
                  </Link>
                ))}
              </div>

              {/* 우측: 미니 캘린더 위젯 */}
              <MiniCalendar
                events={calendarEvents}
                initialMonth={initialMonth}
                today={todayStr}
              />
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>활동 영역</h2>
              <Link href="/portfolio" className="btn btn-ghost btn-sm">자세히 보기 →</Link>
            </div>
            <div className="grid-3">
              <article className="port-item">
                <h4>🎯 어른 공부 모임</h4>
                <p>딥리서치 활용, Agentic AI 실습, 다리오 아모데이의 책으로 토론. 부모가 먼저 공부합니다.</p>
              </article>
              <article className="port-item">
                <h4>🎨 아이들 활동</h4>
                <p>구글 아트&컬쳐 앱 만들기, Gemini로 봄 음악 작곡, 모듈러 연산과 시저 암호.</p>
              </article>
              <article className="port-item">
                <h4>📐 수학이랑 놀자</h4>
                <p>한글 암호 풀기, 일본 입시 문제, 곱하기 규칙 찾기. 수학과 AI의 만남.</p>
              </article>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
