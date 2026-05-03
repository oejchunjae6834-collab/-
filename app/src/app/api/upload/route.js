import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { getCurrentUser, ROLES } from '@/lib/auth.js';

// Next.js 14 — Route Handler 기본 4.5MB body limit. 대용량 업로드는 별도 설정 필요.
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;            // 5MB
const ALLOWED_IMAGE = /^image\//;
const ALLOWED_FILE = /^(image\/|application\/pdf|application\/vnd\.|text\/|audio\/|video\/)/;

// MIME → 안전한 확장자
const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/gif':  'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
};

function safeExt(file) {
  const fromMime = EXT_BY_MIME[file.type];
  if (fromMime) return fromMime;
  const fromName = (file.name || '').match(/\.([a-z0-9]{1,6})$/i)?.[1];
  if (fromName) return fromName.toLowerCase().slice(0, 6);
  return 'bin';
}

export async function POST(req) {
  const me = getCurrentUser();
  if (!me || me.role_level < ROLES.MEMBER) {
    return NextResponse.json({ error: '회원 로그인이 필요해요' }, { status: 401 });
  }

  let form;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 }); }

  const file = form.get('file');
  const kind = (form.get('kind') || 'image').toString();   // 'image' | 'file'
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: '파일이 없어요' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `파일이 너무 커요 (최대 ${MAX_BYTES / 1024 / 1024}MB)` }, { status: 400 });
  }
  const allowed = kind === 'image' ? ALLOWED_IMAGE : ALLOWED_FILE;
  if (!allowed.test(file.type)) {
    return NextResponse.json({ error: `허용되지 않은 형식이에요 (${file.type || 'unknown'})` }, { status: 400 });
  }

  const ext = safeExt(file);
  const fname = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  // 업로드 저장 위치: env로 덮어쓰기 가능 (배포 시 영구 디스크 경로).
  // 예) Render Disk: UPLOAD_DIR=/var/data/uploads
  const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  const filepath = path.join(dir, fname);
  const arrayBuffer = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(arrayBuffer));

  return NextResponse.json({
    ok: true,
    url: `/uploads/${fname}`,
    name: file.name,
    size: file.size,
    type: file.type,
  });
}
