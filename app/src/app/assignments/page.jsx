import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, canReadBoard, canWriteBoard } from '@/lib/auth.js';
import { getBoard, listPosts, isBoardWriter } from '@/lib/queries.js';
import { AssignmentList } from '@/components/BoardLayouts.jsx';

export const metadata = { title: '과제방 — 디적디적' };

export default async function AssignmentsPage() {
  const me = await getCurrentUser();
  const board = await getBoard('assignments');
  if (!board) redirect('/');
  if (!canReadBoard(board, me)) redirect('/login');

  const posts = await listPosts(board.id);
  const isWriter = me ? await isBoardWriter(board.id, me.id) : false;
  const canWrite = canWriteBoard(board, me, isWriter);

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
