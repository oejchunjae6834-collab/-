import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, canReadBoard, canWriteBoard, hasPermission, ROLES } from '@/lib/auth.js';
import { getPost, getBoard, isBoardWriter, listComments } from '@/lib/queries.js';
import CommentSection from '@/components/CommentSection.jsx';
import PostActions from '@/components/PostActions.jsx';

function formatDate(value) {
  if (!value && value !== 0) return '날짜 없음';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const asString = String(value);
  return asString.slice(0, 10);
}

function parseMeta(s) {
  try { return JSON.parse(s || '{}') || {}; } catch { return {}; }
}

export default async function PostDetail({ postId, backHref }) {
  const me = await getCurrentUser();
  const post = await getPost(postId);
  if (!post) redirect(backHref);
  const board = await getBoard(post.board_id);
  if (!canReadBoard(board, me)) redirect('/login');

  const meta = parseMeta(post.meta);
  const canEdit = me && (me.role_level >= ROLES.ADMIN || me.id === post.author_id);
  const isMember = me && me.role_level >= ROLES.MEMBER;
  const canModerate = me && (me.role_level >= ROLES.ADMIN || hasPermission(me, 'moderate_comments'));
  const safeMe = isMember ? { id: me.id, name: me.name, role_level: me.role_level } : null;
  const comments = post.comments_enabled ? await listComments('post', post.id) : [];

  return (
    <main className="layout single">
      <div className="content">
        <section className="card">
          <div className="card-head">
            <h2>{post.title}</h2>
            <Link href={backHref} className="btn btn-ghost btn-sm">← 목록</Link>
          </div>
          <div className="ev-meta-row">
            <span className="ev-pill">📁 {post.board_name}</span>
            <span className="ev-pill">👤 {post.author_name || '익명'}</span>
            <span className="ev-pill">🕐 {formatDate(post.created_at)}</span>
            {post.pinned ? <span className="ev-pill" style={{ background: 'var(--warm)', color: 'var(--ink)' }}>📌 고정</span> : null}
          </div>

          {/* 보드 타입별 본문 */}
          {board.type === 'gallery' && meta.image_url && (
            <div style={{ marginTop: 14, textAlign: 'center', background: 'var(--bg)', borderRadius: 12, overflow: 'hidden' }}>
              <img src={meta.image_url} alt={post.title} style={{ maxWidth: '100%', maxHeight: 600, display: 'block', margin: '0 auto' }} />
            </div>
          )}
          {board.type === 'file' && meta.file_url && (
            <div style={{ marginTop: 14, padding: 14, background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 12 }}>
              <strong>📎 첨부 파일</strong>
              <div style={{ marginTop: 6 }}>
                <a href={meta.file_url} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                  {meta.file_name || '파일 열기'} →
                </a>
              </div>
            </div>
          )}
          {board.type === 'assignment' && meta.due_date && (
            <div style={{ marginTop: 14, padding: 14, background: 'var(--warm-soft)', border: '1px solid var(--warm)', borderRadius: 12 }}>
              <strong>⏰ 마감일</strong> <span style={{ marginLeft: 8 }}>{formatDate(meta.due_date)}</span>
            </div>
          )}

          {post.body && (
            <div style={{ marginTop: 16 }}>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: '1.02rem', lineHeight: 1.8 }}>{post.body}</p>
            </div>
          )}

          {canEdit && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
              <PostActions postId={post.id} backHref={backHref} />
            </div>
          )}

          {board.comments_enabled ? (
            <CommentSection
              targetType="post"
              targetId={post.id}
              initialComments={comments}
              me={safeMe}
              canModerate={!!canModerate}
            />
          ) : (
            <p className="muted small" style={{ marginTop: 18 }}>이 보드는 댓글 기능이 꺼져 있어요.</p>
          )}
        </section>
      </div>
    </main>
  );
}
