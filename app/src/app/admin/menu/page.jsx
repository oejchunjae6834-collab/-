import { listBoards, listBoardWriters, listUsers } from '@/lib/queries.js';
import MenuAdmin from './client.jsx';

export const metadata = { title: '메뉴 관리 — 디적디적 관리자' };

export default function MenuAdminPage() {
  const boards = listBoards();
  const allMembers = listUsers().filter((u) => u.role_level >= 2);
  const boardsWithWriters = boards.map((b) => ({
    ...b,
    writers: listBoardWriters(b.id),
  }));
  return <MenuAdmin initialBoards={boardsWithWriters} allMembers={allMembers} />;
}
