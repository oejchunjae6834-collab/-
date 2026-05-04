import { listUsers, listFamilyMembers } from '@/lib/queries.js';
import MembersAdmin from './client.jsx';

export const metadata = { title: '회원 정보 관리 — 디적디적 관리자' };

export default async function MembersAdminPage() {
  const rows = await listUsers();
  const users = await Promise.all(rows.map(async (u) => {
    let perms = [];
    try { perms = JSON.parse(u.permissions || '[]'); } catch {}
    const familyRows = await listFamilyMembers(u.id);
    return { ...u, permissions_arr: perms, family_rows: familyRows };
  }));
  return <MembersAdmin initialUsers={users} />;
}
