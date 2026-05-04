import { requireAdmin } from '@/lib/auth.js';
import { getEvent, listAttendance, listPublicRsvps } from '@/lib/queries.js';

export async function GET(_req, { params }) {
  if (!(await requireAdmin())) return new Response('forbidden', { status: 403 });
  const id = parseInt(params.id, 10);
  const ev = await getEvent(id);
  if (!ev) return new Response('not found', { status: 404 });

  const member = await listAttendance(id);
  const guest = ev.is_public ? await listPublicRsvps(id) : [];

  const escape = (s) => `"${(s ?? '').toString().replace(/"/g, '""')}"`;
  const lines = [];
  lines.push('# 디적디적 출석 명단');
  lines.push(`# 일정: ${ev.title} (${ev.start_date}${ev.end_date ? ' ~ ' + ev.end_date : ''})`);
  lines.push('');
  lines.push('구분,이름,상태,비고');
  for (const a of member) {
    let family = [];
    try { family = JSON.parse(a.family_members || '[]'); } catch {}
    lines.push([
      escape('회원'),
      escape(a.name),
      escape({going:'참석',no:'불참',maybe:'미정'}[a.status] || a.status),
      escape(family.join(' · ')),
    ].join(','));
  }
  for (const g of guest) {
    lines.push([
      escape('외부신청'),
      escape(g.name),
      escape(`${g.party_size}명`),
      escape(`${g.email}${g.phone ? ' · ' + g.phone : ''}${g.note ? ' · ' + g.note : ''}`),
    ].join(','));
  }

  // 한글 깨짐 방지를 위해 BOM 포함
  const body = '﻿' + lines.join('\n');
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="attendances-${ev.start_date}.csv"`,
    },
  });
}
