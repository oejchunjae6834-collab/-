/**
 * SQLite 클라이언트 — Node 22.5+ 내장 `node:sqlite` 사용 (외부 라이브러리 0개).
 *
 * better-sqlite3와 거의 같은 동기 API. 차이:
 *  - prepare().run(array) 가 아니라 prepare().run(...args) 로 spread 필요
 *  - PRAGMA 는 db.exec() 로 실행
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

// DB 파일 위치: env로 덮어쓰기 가능 (배포 시 영구 디스크 경로 지정).
// 예) Render Disk 마운트: DB_PATH=/var/data/dijeokdijeok.db
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'dijeokdijeok.db');
const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

let _db;
export function getDb() {
  if (_db) return _db;
  _db = new DatabaseSync(DB_PATH);
  _db.exec('PRAGMA journal_mode = WAL');
  _db.exec('PRAGMA foreign_keys = ON');
  return _db;
}

function ensureColumn(db, table, name, decl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${decl}`);
  }
}

export function migrate() {
  const db = getDb();
  const schema = fs.readFileSync(path.join(process.cwd(), 'db', 'schema.sql'), 'utf8');
  db.exec(schema);

  // ---- 인플레이스 마이그레이션: 기존 DB에 새 컬럼 추가 ----
  ensureColumn(db, 'users', 'permissions', "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, 'events', 'is_featured', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'comments', 'parent_id', 'INTEGER REFERENCES comments(id) ON DELETE CASCADE');
  // 게시글 단위 열람 권한 (CLAUDE.md 2-A): 'all_members' | 'admin_only'
  ensureColumn(db, 'posts', 'visibility', "TEXT NOT NULL DEFAULT 'all_members'");

  // 컬럼 추가 후에야 만들 수 있는 인덱스
  db.exec('CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id)');

  // AI 검색 기능 제거 — 과거 시드의 'ai' 보드를 메뉴에서 숨김
  db.exec("UPDATE boards SET visible = 0 WHERE slug = 'ai'");
}

/**
 * node:sqlite가 반환하는 row는 prototype이 null이라 React Server Components에서
 * 클라이언트로 직렬화할 때 막힙니다. plain object로 한 번 복사해서 안전하게 만듭니다.
 */
export const toPlain = (r) => (r ? { ...r } : r);
export const toPlainArr = (rs) => (rs ? rs.map((r) => ({ ...r })) : rs);
