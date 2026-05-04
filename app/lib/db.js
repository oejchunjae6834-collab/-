/**
 * Postgres 클라이언트 (Supabase 호환).
 *
 * pg.Pool 단일 인스턴스를 사용. Render Free + Supabase Free의 connection 한도(60)를
 * 고려해 pool max를 5로 제한.
 *
 * SSL: Supabase는 SSL 필수, self-signed라 rejectUnauthorized:false.
 *
 * 모든 쿼리는 async. queries.js / auth.js에서 await.
 */
import pg from 'pg';
const { Pool } = pg;

let _pool;
export function getPool() {
  if (_pool) return _pool;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 환경변수가 없습니다. Supabase Connection string을 .env에 넣어 주세요.');
  }
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
  });
  // pg는 자동 재연결을 하므로 error 핸들러만 달아 둠
  _pool.on('error', (err) => {
    console.error('[pg pool error]', err.message);
  });
  return _pool;
}

/** SELECT — 결과 행 배열 반환 */
export async function query(sql, params = []) {
  const r = await getPool().query(sql, params);
  return r.rows;
}

/** SELECT — 첫 행만 (없으면 null) */
export async function queryOne(sql, params = []) {
  const r = await getPool().query(sql, params);
  return r.rows[0] || null;
}

/** INSERT/UPDATE/DELETE — pg.QueryResult 그대로 반환 (rowCount, rows 등 사용) */
export async function execute(sql, params = []) {
  return getPool().query(sql, params);
}
