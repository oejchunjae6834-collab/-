import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireMember, hasPermission, ROLES } from '@/lib/auth.js';
import { getArchive, listComments } from '@/lib/queries.js';
import CommentSection from '@/components/CommentSection.jsx';

export default async function ArchiveDetail({ params }) {
  const me = await requireMember();
  if (!me) redirect('/login');

  const id = parseInt(params.id, 10);
  const doc = await getArchive(id);
  if (!doc) {
    return (
      <main className="auth-page">
        <h2>글을 찾을 수 없어요</h2>
        <Link href="/archive" className="btn btn-primary">아카이브로</Link>
      </main>
    );
  }

  let tags = [];
  try { tags = JSON.parse(doc.tags || '[]'); } catch {}

  const comments = await listComments('archive', id);
  const canModerate = me.role_level >= ROLES.ADMIN || hasPermission(me, 'moderate_comments');
  const safeMe = { id: me.id, name: me.name, role_level: me.role_level };

  return (
    <main className="layout single">
      <div className="content">
        <section className="card">
          <div className="card-head">
            <h2>{doc.title}</h2>
            <Link href="/archive" className="btn btn-ghost btn-sm">← 목록</Link>
          </div>

          <div className="ev-meta-row">
            <span className="ev-pill">📅 {doc.doc_date}</span>
            <span className={`arc-tag tone-${doc.tone}`}>{doc.tone === 'formal' ? '개조식' : '친근체'}</span>
            {tags.map((t) => <span key={t} className="arc-tag">#{t}</span>)}
          </div>

          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: '1.02rem', whiteSpace: 'pre-wrap' }}>{doc.summary}</p>
            {doc.body && (
              <div style={{ marginTop: 12, padding: 16, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--line)' }}>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{doc.body}</p>
              </div>
            )}
          </div>

          <CommentSection
            targetType="archive"
            targetId={id}
            initialComments={comments}
            me={safeMe}
            canModerate={canModerate}
          />
        </section>
      </div>
    </main>
  );
}
