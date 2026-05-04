import { redirect } from 'next/navigation';
import { getCurrentUser, canWriteBoard } from '@/lib/auth.js';
import { getBoard, isBoardWriter } from '@/lib/queries.js';
import NewPostForm from '@/components/NewPostForm.jsx';

export const metadata = { title: '자료 올리기 — 디적디적' };

export default async function NewResource() {
  const me = await getCurrentUser();
  const board = await getBoard('resources');
  const isWriter = me ? await isBoardWriter(board.id, me.id) : false;
  if (!canWriteBoard(board, me, isWriter)) redirect('/resources');

  return (
    <main className="layout single">
      <div className="content">
        <section className="card">
          <div className="card-head"><h2>📚 자료 올리기</h2></div>
          <NewPostForm boardSlug="resources" boardType="file" backHref="/resources" />
        </section>
      </div>
    </main>
  );
}
