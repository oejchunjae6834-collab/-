import { redirect } from 'next/navigation';

// 매직링크가 옛 URL(/auth/verify?token=)로 들어와도 동작하도록 호환 처리.
// 실제 토큰 소비는 /api/auth/verify Route Handler가 담당.
export default function VerifyCompat({ searchParams }) {
  const token = searchParams?.token;
  if (!token) redirect('/auth/error?reason=missing');
  redirect(`/api/auth/verify?token=${token}`);
}
