import { redirect } from 'next/navigation';
import PostDetail from '@/components/PostDetail.jsx';
import { getPost } from '@/lib/queries.js';

export default function ResourceDetail({ params }) {
  const id = parseInt(params.id, 10);
  const post = getPost(id);
  if (!post || post.board_slug !== 'resources') redirect('/resources');
  return <PostDetail postId={id} backHref="/resources" />;
}
