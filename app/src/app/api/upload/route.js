/**
 * 파일 업로드 API → Supabase Storage.
 *
 * 응답 형식은 기존과 호환: { ok, url, name, size, type }
 * - url: Supabase Public URL (`https://xxx.supabase.co/storage/v1/object/public/uploads/...`)
 *   ↑ DB에 저장되는 image_url/file_url 컬럼은 형식 변화 없이 그대로 동작.
 */
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentUser, ROLES } from '@/lib/auth.js';
import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase.js';

export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;            // 5MB
const ALLOWED_IMAGE = /^image\//;
const ALLOWED_FILE = /^(image\/|application\/pdf|application\/vnd\.|text\/|audio\/|video\/)/;

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
  const me = await getCurrentUser();
  if (!me || me.role_level < ROLES.MEMBER) {
    return NextResponse.json({ error: '회원 로그인이 필요해요' }, { status: 401 });
  }

  let form;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 }); }

  const file = form.get('file');
  const kind = (form.get('kind') || 'image').toString();
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
  const arrayBuffer = await file.arrayBuffer();

  // Supabase Storage에 업로드
  const { error } = await supabaseAdmin()
    .storage.from(STORAGE_BUCKET)
    .upload(fname, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });
  if (error) {
    return NextResponse.json({ error: `업로드 실패: ${error.message}` }, { status: 500 });
  }

  const { data: pub } = supabaseAdmin()
    .storage.from(STORAGE_BUCKET)
    .getPublicUrl(fname);

  return NextResponse.json({
    ok: true,
    url: pub.publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  });
}
