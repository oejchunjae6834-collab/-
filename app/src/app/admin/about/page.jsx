import { listAboutSections, getCmsBlocks } from '@/lib/queries.js';
import AboutAdmin from './client.jsx';

export const metadata = { title: '소개 페이지 관리 — 디적디적 관리자' };

const CMS_KEYS = [
  'about.title',
  'about.body',
  'about.box1.emoji', 'about.box1.title', 'about.box1.body',
  'about.box2.emoji', 'about.box2.title', 'about.box2.body',
  'about.box3.emoji', 'about.box3.title', 'about.box3.body',
];

export default async function AboutAdminPage() {
  const sections = await listAboutSections();
  const cms = await getCmsBlocks(CMS_KEYS);
  return <AboutAdmin initialSections={sections} initialCms={cms} />;
}
