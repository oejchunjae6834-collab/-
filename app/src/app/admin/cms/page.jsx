import { getCmsBlocks } from '@/lib/queries.js';
import CmsAdmin from './client.jsx';

export const metadata = { title: 'CMS — 디적디적 관리자' };

export default function CmsAdminPage() {
  const cms = getCmsBlocks();
  return <CmsAdmin initial={cms} />;
}
