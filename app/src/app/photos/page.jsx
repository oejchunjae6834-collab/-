import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, canReadBoard, canWriteBoard, ROLES } from '@/lib/auth.js';
import { getBoard, listPosts, isBoardWriter } from '@/lib/queries.js';
import { GalleryGrid } from '@/components/BoardLayouts.jsx';

export const metadata = { title: '사진첩 — 디적디적' };

export default async function PhotosPage() {
  const me = await getCurrentUser();
  const board = await getBoard('photos');
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
            <h2>📸 {board.name}</h2>
            <div className="head-tools">
              {canWrite && <Link href="/photos/new" className="btn btn-primary btn-sm">+ 사진 올리기</Link>}
              <span className="badge badge-warm">Members</span>
            </div>
          </div>
          {board.description && <p className="muted small">{board.description}</p>}
          <GalleryGrid posts={posts} />
        </section>
      </div>
    </main>
  );
}
