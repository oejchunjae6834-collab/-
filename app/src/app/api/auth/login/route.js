import { NextResponse } from 'next/server';
import { createMagicLink, buildMagicUrl } from '@/lib/auth.js';
import { sendMagicLinkEmail } from '@/lib/email.js';
import { getDb, migrate } from '@/lib/db.js';

export async function POST(req) {
  try {
    migrate();
    const { email } = await req.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: '유효한 이메일을 입력해 주세요' }, { status: 400 });
    }
    const cleaned = email.toLowerCase().trim();
    const db = getDb();
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(cleaned);
    if (!exists) {
      return NextResponse.json({ error: '등록된 이메일이 아닙니다. 회원가입을 먼저 해주세요.' }, { status: 404 });
    }
    const token = createMagicLink(cleaned);
    const url = buildMagicUrl(token);
    await sendMagicLinkEmail({ to: cleaned, url, purpose: 'login' });
    // 개발 모드 편의: 응답에도 매직 URL을 같이 보냅니다
    return NextResponse.json({ ok: true, devUrl: url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
