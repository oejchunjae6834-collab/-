import { listPortfolioItems } from '@/lib/queries.js';
import PortfolioAdmin from './client.jsx';

export const metadata = { title: '활동 관리 — 디적디적 관리자' };

export default async function PortfolioAdminPage() {
  const items = await listPortfolioItems();
  return <PortfolioAdmin initialItems={items} />;
}
