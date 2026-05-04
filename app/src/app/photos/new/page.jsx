import { redirect } from 'next/navigation';
import { getCurrentUser, canWriteBoard } from '@/lib/auth.js';
import { getBoard, isBoardWriter } from '@/lib/queries.js';
import NewPostForm from '@/components/NewPostForm.jsx';

export const metadata = { title: '사진 올리기 — 디적디적' };

export default async function NewPhoto() {
  const me = await getCurrentUser();
  const board = await getBoard('photos');
  const isWriter = me ? await isBoardWriter(board.id, me.id) : false;
  if (!canWriteBoard(board, me, isWriter)) redirect('/photos');

  return (
    <main className="layout single">
      <div className="content">
        <section className="card">
          <div className="card-head"><h2>📸 사진 올리기</h2></div>
          <NewPostForm boardSlug="photos" boardType="gallery" backHref="/photos" />
        </section>
      </div>
    </main>
  );
}
