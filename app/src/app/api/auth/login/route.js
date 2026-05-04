import { NextResponse } from 'next/server';
import { buildMagicUrl, createMagicLink } from '@/lib/auth.js';
import { sendMagicLinkEmail } from '@/lib/email.js';
import { queryOne } from '@/lib/db.js';

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: '유효한 이메일을 입력해 주세요' }, { status: 400 });
    }

    const cleaned = email.toLowerCase().trim();
    const exists = await queryOne('SELECT id FROM users WHERE email = $1', [cleaned]);
    if (!exists) {
      return NextResponse.json({ error: '등록된 이메일이 아닙니다. 회원가입을 먼저 해주세요.' }, { status: 404 });
    }

    const token = await createMagicLink(cleaned);
    const url = buildMagicUrl(token, req);
    console.log(`[login] 매직링크 생성: ${url}`);

    await sendMagicLinkEmail({ to: cleaned, url, purpose: 'login' });
    return NextResponse.json({ ok: true, devUrl: url });
  } catch (e) {
    console.error('[login] 오류:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
