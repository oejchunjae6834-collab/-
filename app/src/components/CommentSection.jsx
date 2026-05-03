'use client';
import { useState } from 'react';

/**
 * CommentSection — 회원만 사용. 관리자/모더레이터는 모든 댓글 삭제 가능.
 * 댓글 + 1단계 답글 (답글의 답글은 같은 부모로 평탄화)
 */
export default function CommentSection({ targetType, targetId, initialComments, me, canModerate }) {
  const [comments, setComments] = useState(initialComments || []);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyBody, setReplyBody] = useState('');

  // 댓글을 부모/답글로 그룹핑
  const tops = comments.filter((c) => !c.parent_id);
  const repliesByParent = {};
  for (const c of comments) {
    if (c.parent_id) {
      repliesByParent[c.parent_id] ||= [];
      repliesByParent[c.parent_id].push(c);
    }
  }

  async function postComment(parentId, text) {
    const res = await fetch(`/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_type: targetType,
        target_id: targetId,
        body: text.trim(),
        parent_id: parentId || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '오류');
    return data.comment;
  }

  async function submitTop(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      const c = await postComment(null, body);
      setComments([...comments, c]);
      setBody('');
    } catch (err) { alert(err.message); }
    finally { setBusy(false); }
  }

  async function submitReply(e, parentId) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setBusy(true);
    try {
      const c = await postComment(parentId, replyBody);
      setComments([...comments, c]);
      setReplyingTo(null);
      setReplyBody('');
    } catch (err) { alert(err.message); }
    finally { setBusy(false); }
  }

  async function remove(c) {
    if (!confirm('이 댓글을 삭제할까요? 달려있는 답글도 함께 사라져요.')) return;
    const res = await fetch(`/api/comments/${c.id}`, { method: 'DELETE' });
    if (!res.ok) { alert('삭제 실패'); return; }
    // 부모 삭제 시 답글도 cascade — 화면에서도 같이 제거
    setComments(comments.filter((x) => x.id !== c.id && x.parent_id !== c.id));
  }

  function CommentItem({ c, isReply = false }) {
    const canDelete = me && (me.id === c.user_id || canModerate);
    const isAdmin = c.role_level >= 3;
    return (
      <article className={`comment-item ${isReply ? 'comment-reply' : ''}`}>
        <div className="comment-meta">
          {isReply && <span className="reply-arrow">↳</span>}
          <strong>{c.user_name || '알 수 없음'}</strong>
          {isAdmin && <span className="role-pill" style={{ background: 'var(--primary)' }}>관리자</span>}
          <span>·</span>
          <span>{c.created_at}</span>
        </div>
        <div className="comment-body">{c.body}</div>
        <div className="comment-actions">
          {me && !isReply && (
            <button
              type="button"
              onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyBody(''); }}
              style={{ color: 'var(--accent)' }}
            >
              {replyingTo === c.id ? '↶ 답글 취소' : '↳ 답글'}
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={() => remove(c)}>🗑 삭제</button>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="comments-block">
      <h3>💬 댓글 ({comments.length})</h3>

      <div className="comments-list">
        {tops.length === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>첫 댓글을 남겨보세요.</p>
        ) : tops.map((c) => {
          const replies = repliesByParent[c.id] || [];
          const isReplying = replyingTo === c.id;
          return (
            <div key={c.id} className="comment-thread">
              <CommentItem c={c} />
              {replies.length > 0 && (
                <div className="comment-replies">
                  {replies.map((r) => <CommentItem key={r.id} c={r} isReply />)}
                </div>
              )}
              {isReplying && me && (
                <form className="comment-form reply-form" onSubmit={(e) => submitReply(e, c.id)}>
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder={`@${c.user_name} 에게 답글…`}
                    rows={2}
                    autoFocus
                  />
                  <div className="comment-form-row">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setReplyingTo(null); setReplyBody(''); }}
                    >취소</button>
                    <button className="btn btn-primary btn-sm" disabled={busy || !replyBody.trim()}>
                      {busy ? '등록 중…' : '답글 달기'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {me ? (
        <form onSubmit={submitTop} className="comment-form">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`${me.name} 님으로 댓글 달기`}
            rows={3}
          />
          <div className="comment-form-row">
            <small className="muted">서로 존중하는 말로 적어주세요.</small>
            <button className="btn btn-primary btn-sm" disabled={busy || !body.trim()}>
              {busy ? '등록 중…' : '댓글 달기'}
            </button>
          </div>
        </form>
      ) : (
        <p className="muted small" style={{ margin: 0 }}>댓글은 회원 로그인 후 남길 수 있어요.</p>
      )}
    </div>
  );
}
