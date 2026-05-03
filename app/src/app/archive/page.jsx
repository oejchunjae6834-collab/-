import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/auth.js';
import { listArchive } from '@/lib/queries.js';
import ArchiveClient from './client.jsx';

export const metadata = { title: '아카이브 — 디적디적' };

export default function ArchivePage({ searchParams }) {
  const me = requireMember();
  if (!me) redirect('/login');

  const tag = searchParams?.tag || 'all';
  const q = searchParams?.q || '';
  const docs = listArchive({ tag, q }).map((d) => ({
    ...d,
    tags: (() => { try { return JSON.parse(d.tags); } catch { return []; } })(),
  }));

  return (
    <main className="layout single">
      <div className="content">
        <section className="card">
          <div className="card-head">
            <h2>회의록 아카이브</h2>
            <span className="badge badge-warm">Members</span>
          </div>
          <p className="muted small">
            모든 회원이 모든 회의록을 열람할 수 있어요. 학부모 회의 내용도 투명하게 공유됩니다.
          </p>
          <ArchiveClient initialDocs={docs} initialTag={tag} initialQuery={q} />
        </section>
      </div>
    </main>
  );
}
