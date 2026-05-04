import { redirect } from 'next/navigation';
import PostDetail from '@/components/PostDetail.jsx';
import { getPost } from '@/lib/queries.js';

export default async function ResourceDetail({ params }) {
  const id = parseInt(params.id, 10);
  const post = await getPost(id);
  if (!post || post.board_slug !== 'resources') redirect('/resources');
  return <PostDetail postId={id} backHref="/resources" />;
}
