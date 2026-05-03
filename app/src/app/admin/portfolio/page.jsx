import { listPortfolioItems } from '@/lib/queries.js';
import PortfolioAdmin from './client.jsx';

export const metadata = { title: '활동 관리 — 디적디적 관리자' };

export default function PortfolioAdminPage() {
  const items = listPortfolioItems();
  return <PortfolioAdmin initialItems={items} />;
}
