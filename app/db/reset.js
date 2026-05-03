/**
 * DB 리셋 — 파일 자체를 삭제하고 다시 init+seed
 * 사용법: npm run db:reset
 */
const path = require('node:path');
const fs = require('node:fs');
const { execSync } = require('node:child_process');

const dbPath = path.join(__dirname, '..', 'data', 'dijeokdijeok.db');
const wal = dbPath + '-wal';
const shm = dbPath + '-shm';
[dbPath, wal, shm].forEach((p) => {
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`🗑  removed ${path.basename(p)}`);
  }
});

execSync('node db/init.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
execSync('node db/seed.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
console.log('🔄 reset complete');
