import { listUsers, listFamilyMembers } from '@/lib/queries.js';
import MembersAdmin from './client.jsx';

export const metadata = { title: '회원 정보 관리 — 디적디적 관리자' };

export default function MembersAdminPage() {
  const users = listUsers().map((u) => {
    let perms = [];
    try { perms = JSON.parse(u.permissions || '[]'); } catch {}
    // 정식 family_members 테이블에서 가족 정보 가져오기
    const familyRows = listFamilyMembers(u.id);
    return { ...u, permissions_arr: perms, family_rows: familyRows };
  });
  return <MembersAdmin initialUsers={users} />;
}
