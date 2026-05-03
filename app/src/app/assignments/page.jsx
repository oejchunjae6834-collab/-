import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, canReadBoard, canWriteBoard } from '@/lib/auth.js';
import { getBoard, listPosts, isBoardWriter } from '@/lib/queries.js';
import { AssignmentList } from '@/components/BoardLayouts.jsx';

export const metadata = { title: '과제방 — 디적디적' };

export default function AssignmentsPage() {
  const me = getCurrentUser();
  const board = getBoard('assignments');
  if (!board) redirect('/');
  if (!canReadBoard(board, me)) redirect('/login');

  const posts = listPosts(board.id);
  const canWrite = canWriteBoard(board, me, isBoardWriter);

  return (
    <main className="layout single">
      <div className="content">
        <section className="card">
          <div className="card-head">
            <h2>📝 {board.name}</h2>
            <div className="head-tools">
              {canWrite && <Link href="/assignments/new" className="btn btn-primary btn-sm">+ 과제 출제</Link>}
              <span className="badge badge-warm">Members</span>
            </div>
          </div>
          {board.description && <p className="muted small">{board.description}</p>}
          <AssignmentList posts={posts} />
        </section>
      </div>
    </main>
  );
}
