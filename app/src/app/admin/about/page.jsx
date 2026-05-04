import { listAboutSections, getCmsBlocks } from '@/lib/queries.js';
import AboutAdmin from './client.jsx';

export const metadata = { title: '소개 페이지 관리 — 디적디적 관리자' };

export default async function AboutAdminPage() {
  const sections = await listAboutSections();
  const cms = await getCmsBlocks(['about.title']);
  return <AboutAdmin initialSections={sections} initialTitle={cms['about.title'] || ''} />;
}
