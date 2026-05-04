const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

// .env 로드
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const result = await pool.query('UPDATE events SET is_public = 1 RETURNING id, title');
    console.log('✅ 이벤트 공개 처리:', result.rows.length, '개');
    result.rows.slice(0, 5).forEach(r => console.log('  -', r.title));
    if (result.rows.length > 5) console.log('  ... 외', result.rows.length - 5, '개');
  } catch (e) {
    console.error('❌ 오류:', e.message);
  } finally {
    await pool.end();
  }
})();
