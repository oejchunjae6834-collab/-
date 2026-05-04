import { listArchive } from '@/lib/queries.js';
import ArchiveAdmin from './client.jsx';

export const metadata = { title: '아카이브 관리 — 디적디적 관리자' };

export default async function ArchiveAdminPage() {
  const rows = await listArchive();
  const docs = rows.map((d) => ({
    ...d,
    tagsArr: (() => { try { return JSON.parse(d.tags); } catch { return []; } })(),
  }));
  return <ArchiveAdmin initialDocs={docs} />;
}
