import { redirect } from 'next/navigation';
import { getCurrentUser, canWriteBoard } from '@/lib/auth.js';
import { getBoard, isBoardWriter } from '@/lib/queries.js';
import NewPostForm from '@/components/NewPostForm.jsx';

export const metadata = { title: '과제 출제 — 디적디적' };

export default function NewAssignment() {
  const me = getCurrentUser();
  const board = getBoard('assignments');
  if (!canWriteBoard(board, me, isBoardWriter)) redirect('/assignments');

  return (
    <main className="layout single">
      <div className="content">
        <section className="card">
          <div className="card-head"><h2>📝 과제 출제</h2></div>
          <NewPostForm boardSlug="assignments" boardType="assignment" backHref="/assignments" />
        </section>
      </div>
    </main>
  );
}
