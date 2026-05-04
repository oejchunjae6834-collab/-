-- ============================================================
-- 디적디적 PostgreSQL 스키마 (Supabase 운영용)
-- 무료 마이그레이션: SQLite → Supabase Postgres
-- 동일 컬럼명/타입 정책 유지 (코드 호환성):
--   * AUTOINCREMENT → SERIAL
--   * datetime('now','localtime') → NOW() (TIMESTAMPTZ)
--   * TEXT JSON → 동일하게 TEXT 유지 (queries.js가 JSON.parse/stringify)
--   * 0/1 INTEGER 불리언은 INTEGER로 유지 (코드 호환성 위해)
-- ============================================================

-- 회원
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  family_members  TEXT,
  family_role     TEXT,
  motive          TEXT,
  is_approved     INTEGER NOT NULL DEFAULT 0,
  role_level      INTEGER NOT NULL DEFAULT 1,
  permissions     TEXT NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at     TIMESTAMPTZ
);

-- 매직링크 (이메일 1회용 토큰)
CREATE TABLE IF NOT EXISTS magic_links (
  id          SERIAL PRIMARY KEY,
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_magic_email ON magic_links(email);

-- 세션 (로그인 쿠키)
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 일정
CREATE TABLE IF NOT EXISTS events (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  event_type    TEXT NOT NULL CHECK (event_type IN ('정기모임','여름캠프','겨울캠프','공개특강','운영진회의')),
  start_date    TEXT NOT NULL,
  end_date      TEXT,
  start_time    TEXT,
  end_time      TEXT,
  location      TEXT NOT NULL DEFAULT '마하어린이도서관',
  description   TEXT,
  is_public     INTEGER NOT NULL DEFAULT 0,
  is_featured   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(start_date);

-- 출석 (RSVP) — 세션 없는 일정용
CREATE TABLE IF NOT EXISTS attendances (
  event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('going','no','maybe')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(event_id, user_id)
);

-- 공개 특강 외부인 신청
CREATE TABLE IF NOT EXISTS public_rsvps (
  id          SERIAL PRIMARY KEY,
  event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  party_size  INTEGER NOT NULL DEFAULT 1,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 회의록 / 밴드글 아카이브
CREATE TABLE IF NOT EXISTS archive_docs (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  doc_date      TEXT NOT NULL,
  tone          TEXT NOT NULL CHECK (tone IN ('formal','friendly')),
  tags          TEXT NOT NULL DEFAULT '[]',
  summary       TEXT NOT NULL,
  body          TEXT,
  source        TEXT NOT NULL DEFAULT 'manual',
  drive_file_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_archive_date ON archive_docs(doc_date);

-- CMS 블록
CREATE TABLE IF NOT EXISTS cms_blocks (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  INTEGER REFERENCES users(id)
);

-- 댓글
CREATE TABLE IF NOT EXISTS comments (
  id           SERIAL PRIMARY KEY,
  target_type  TEXT NOT NULL CHECK (target_type IN ('archive','event','post')),
  target_id    INTEGER NOT NULL,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id    INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- 보드 (메뉴)
CREATE TABLE IF NOT EXISTS boards (
  id                SERIAL PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT,
  type              TEXT NOT NULL,
  read_role         INTEGER NOT NULL DEFAULT 2,
  write_role        INTEGER NOT NULL DEFAULT 3,
  comments_enabled  INTEGER NOT NULL DEFAULT 1,
  position          INTEGER NOT NULL DEFAULT 100,
  visible           INTEGER NOT NULL DEFAULT 1,
  is_system         INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_boards_position ON boards(position);

-- 게시물
CREATE TABLE IF NOT EXISTS posts (
  id           SERIAL PRIMARY KEY,
  board_id     INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  body         TEXT,
  meta         TEXT NOT NULL DEFAULT '{}',
  author_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  pinned       INTEGER NOT NULL DEFAULT 0,
  visibility   TEXT NOT NULL DEFAULT 'all_members',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_posts_board ON posts(board_id);

-- 보드별 글쓰기 권한 위임
CREATE TABLE IF NOT EXISTS board_writers (
  board_id  INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (board_id, user_id)
);

-- 가족 구성원
CREATE TABLE IF NOT EXISTS family_members (
  id              SERIAL PRIMARY KEY,
  parent_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('부모','자녀')),
  age             INTEGER,
  position        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_parent ON family_members(parent_user_id);

-- 모임 세션 (일정 내 시간대별 프로그램)
CREATE TABLE IF NOT EXISTS event_sessions (
  id           SERIAL PRIMARY KEY,
  event_id     INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  start_time   TEXT,
  end_time     TEXT,
  capacity     INTEGER,
  notes        TEXT,
  position     INTEGER NOT NULL DEFAULT 100,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_sessions_event ON event_sessions(event_id);

-- 모임 세션×가족 출석
CREATE TABLE IF NOT EXISTS session_attendances (
  session_id        INTEGER NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
  family_member_id  INTEGER NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  status            TEXT NOT NULL CHECK (status IN ('going','no','maybe')),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, family_member_id)
);
CREATE INDEX IF NOT EXISTS idx_sa_session ON session_attendances(session_id);
CREATE INDEX IF NOT EXISTS idx_sa_member  ON session_attendances(family_member_id);

-- 활동 포트폴리오
CREATE TABLE IF NOT EXISTS portfolio_items (
  id          SERIAL PRIMARY KEY,
  category    TEXT NOT NULL CHECK (category IN ('adult','kids','math','play')),
  title       TEXT NOT NULL,
  body        TEXT,
  tag         TEXT,
  image_url   TEXT,
  position    INTEGER NOT NULL DEFAULT 100,
  visible     INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_cat ON portfolio_items(category, position);
