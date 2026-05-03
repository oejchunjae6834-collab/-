'use client';
import { useRouter } from 'next/navigation';

export default function PostActions({ postId, backHref }) {
  const router = useRouter();

  async function remove() {
    if (!confirm('이 글을 삭제할까요? 댓글도 함께 사라져요.')) return;
    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    if (!res.ok) { alert('삭제 실패'); return; }
    router.push(backHref);
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button className="btn btn-danger btn-sm" onClick={remove}>🗑 삭제</button>
    </div>
  );
}
