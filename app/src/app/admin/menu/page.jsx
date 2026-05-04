import { listBoards, listBoardWriters, listUsers } from '@/lib/queries.js';
import MenuAdmin from './client.jsx';

export const metadata = { title: '메뉴 관리 — 디적디적 관리자' };

export default async function MenuAdminPage() {
  const boards = await listBoards();
  const allMembers = (await listUsers()).filter((u) => u.role_level >= 2);
  const boardsWithWriters = await Promise.all(boards.map(async (b) => ({
    ...b,
    writers: await listBoardWriters(b.id),
  })));
  return <MenuAdmin initialBoards={boardsWithWriters} allMembers={allMembers} />;
}
