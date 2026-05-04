/**
 * Supabase 서버용 클라이언트.
 *
 * 서버에서만 호출되는 admin 클라이언트. service_role 키를 쓰므로
 * 절대 클라이언트 컴포넌트로 import하지 말 것.
 *
 * 환경변수:
 *   SUPABASE_URL                = "https://xxx.supabase.co"
 *   SUPABASE_SERVICE_ROLE_KEY   = "eyJ..." (Settings → API → service_role)
 */
import { createClient } from '@supabase/supabase-js';

let _admin;
export function supabaseAdmin() {
  if (_admin) return _admin;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.');
  }
  _admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  return _admin;
}

/** Storage 버킷 이름. Supabase 대시보드에서 미리 생성해야 함 (Public). */
export const STORAGE_BUCKET = 'uploads';
