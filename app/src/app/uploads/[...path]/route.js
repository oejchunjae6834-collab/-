/**
 * 업로드된 파일 서빙 라우트.
 *
 * 개발 환경: 파일이 public/uploads/ 에 있으면 Next.js가 정적 파일로 먼저 서빙하므로
 *           이 핸들러는 호출되지 않음.
 * 배포 환경(Render): UPLOAD_DIR=/var/data/uploads 같이 영구 디스크를 가리키게 되며,
 *                   해당 경로의 파일을 이 핸들러가 스트리밍해서 응답.
 */
import { NextResponse } from 'next/server';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';

const MIME = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.pdf':  'application/pdf',
  '.txt':  'text/plain; charset=utf-8',
};

function mimeFor(p) {
  const ext = path.extname(p).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

export async function GET(_req, { params }) {
  const baseDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');
  const segs = (params.path || []).join('/');
  // 디렉터리 탈출 방지
  const target = path.normalize(path.join(baseDir, segs));
  if (!target.startsWith(path.normalize(baseDir) + path.sep) && target !== path.normalize(baseDir)) {
    return new NextResponse('forbidden', { status: 403 });
  }

  try {
    const st = await stat(target);
    if (!st.isFile()) return new NextResponse('not found', { status: 404 });
    const buf = await readFile(target);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'content-type': mimeFor(target),
        'content-length': String(st.size),
        'cache-control': 'public, max-age=2592000, immutable',
      },
    });
  } catch {
    return new NextResponse('not found', { status: 404 });
  }
}
