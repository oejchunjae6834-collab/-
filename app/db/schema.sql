-- ============================================================
-- 디적디적 SQLite 스키마 (Phase 1)
-- TRD에 정의된 PostgreSQL 스키마와 호환되도록 칼럼 이름을 동일하게 둡니다.
-- 운영 시 Supabase/Neon으로 옮길 때 같은 SQL을 거의 그대로 사용 가능.
-- ============================================================

-- 회원
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  family_members  TEXT,                 -- JSON 배열 문자열 e.g. '["엄마","아빠","첫째"]'
  family_role     TEXT,                 -- '학부모' | '아이' | '운영진' | '외부 강사'
  motive          TEXT,
  is_approved     INTEGER NOT NULL DEFAULT 0,   -- 0=미승인, 1=승인
  role_level      INTEGER NOT NULL DEFAULT 1,   -- 0=guest, 1=pending, 2=member, 3=admin
  permissions     TEXT NOT NULL DEFAULT '[]',   -- 추가 권한 JSON 배열: ["write_archive","write_events","moderate_comments"]
  created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  approved_at     TEXT
);

-- 매직링크 (이메일 1회용 토큰)
CREATE TABLE IF NOT EXISTS magic_links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_magic_email ON magic_links(email);

-- 세션
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,           -- 랜덤 토큰
  user_id     INTEGER NOT NULL,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 일정
CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  event_type    TEXT NOT NULL CHECK (event_type IN ('정기모임','여름캠프','겨울캠프','공개특강','운영진회의')),
  start_date    TEXT NOT NULL,            -- YYYY-MM-DD
  end_date      TEXT,                     -- 캠프 등 다일 일정
  start_time    TEXT,
  end_time      TEXT,
  location      TEXT NOT NULL DEFAULT '마하어린이도서관',
  description   TEXT,
  is_public     INTEGER NOT NULL DEFAULT 0,   -- 비회원 노출 여부 (공개특강 등)
  is_featured   INTEGER NOT NULL DEFAULT 0,   -- 랜딩 "가까운 공개 행사"에 노출
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  created_by    INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(start_date);

-- 출석 (RSVP)
CREATE TABLE IF NOT EXISTS attendances (
  event_id    INTEGER NOT NULL,
  user_id     INTEGER NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('going','no','maybe')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  PRIMARY KEY(event_id, user_id),
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id)  REFERENCES users(id)  ON DELETE CASCADE
);

-- 공개 특강 등 외부인 참관 신청
CREATE TABLE IF NOT EXISTS public_rsvps (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id    INTEGER NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  party_size  INTEGER NOT NULL DEFAULT 1,
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- 회의록 / 밴드글 아카이브
CREATE TABLE IF NOT EXISTS archive_docs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  doc_date     TEXT NOT NULL,        -- YYYY-MM-DD
  tone         TEXT NOT NULL CHECK (tone IN ('formal','friendly')),
  tags         TEXT NOT NULL DEFAULT '[]',  -- JSON 배열
  summary      TEXT NOT NULL,
  body         TEXT,
  source       TEXT NOT NULL DEFAULT 'manual', -- manual | drive
  drive_file_id TEXT,                          -- Phase 2에서 사용
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_archive_date ON archive_docs(doc_date);

-- CMS 블록 (랜딩 페이지 콘텐츠)
CREATE TABLE IF NOT EXISTS cms_blocks (
  key         TEXT PRIMARY KEY,        -- 'hero.title', 'about.body' 등
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_by  INTEGER REFERENCES users(id)
);

-- 댓글 (아카이브 글, 일정, 일반 게시물 등에 달림)
-- parent_id: 답글일 때 최상위 댓글 id. 답글의 답글도 동일 parent로 묶음 (1단계 평탄화).
CREATE TABLE IF NOT EXISTS comments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type  TEXT NOT NULL CHECK (target_type IN ('archive','event','post')),
  target_id    INTEGER NOT NULL,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id    INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id);
-- idx_comments_parent 는 lib/db.js migrate()에서 컬럼 추가 후에 생성됩니다.

-- ============================================================
-- 보드 (메뉴 1급 객체) + 게시물 + 보드별 글쓰기 권한
-- 다음 카페/네이버 블로그처럼 관리자가 메뉴를 직접 만들고 정렬하는 구조.
-- ============================================================

CREATE TABLE IF NOT EXISTS boards (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT,
  type              TEXT NOT NULL,                  -- 'about','portfolio','events','members','article','gallery','file','assignment','custom','ai'
  read_role         INTEGER NOT NULL DEFAULT 2,     -- 0=guest 1=pending 2=member 3=admin
  write_role        INTEGER NOT NULL DEFAULT 3,
  comments_enabled  INTEGER NOT NULL DEFAULT 1,
  position          INTEGER NOT NULL DEFAULT 100,
  visible           INTEGER NOT NULL DEFAULT 1,     -- Nav 노출 여부
  is_system         INTEGER NOT NULL DEFAULT 0,     -- 시스템 보드 = 삭제 불가
  created_at        TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_boards_position ON boards(position);

CREATE TABLE IF NOT EXISTS posts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id     INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  body         TEXT,
  meta         TEXT NOT NULL DEFAULT '{}',          -- JSON: {image_url, file_url, file_name, due_date, ...}
  author_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  pinned       INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_posts_board ON posts(board_id);

-- 보드별 글쓰기 권한 위임 (회원 등급으로 부족한 사람에게도 개별 부여)
CREATE TABLE IF NOT EXISTS board_writers (
  board_id  INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (board_id, user_id)
);

-- ============================================================
-- 세션·가족 단위 RSVP (CLAUDE.md TRD 1번)
-- ============================================================

-- 가족 구성원: 한 부모 계정에 묶이는 부모/자녀 정보
CREATE TABLE IF NOT EXISTS family_members (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('부모','자녀')),
  age             INTEGER,
  position        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_family_parent ON family_members(parent_user_id);

-- 모임 세션: 일정 안의 시간대별 프로그램
-- ⚠️ 테이블명이 'event_sessions'인 이유: 'sessions'는 이미 로그인 쿠키 세션 저장에 사용 중.
-- 예) 6월 정기모임 → [수학이랑 놀자 13:30~15:00 / 공동체 놀이 15:00~15:30 / 아이들 모여라 15:40~17:30 / 어른 공부 모임 18:40~20:10]
CREATE TABLE IF NOT EXISTS event_sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id     INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  start_time   TEXT,
  end_time     TEXT,
  capacity     INTEGER,                 -- 선택: 인원 제한 (저녁식사 등)
  notes        TEXT,
  position     INTEGER NOT NULL DEFAULT 100,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_event_sessions_event ON event_sessions(event_id);

-- 모임 세션-가족구성원 출석. 기존 attendances 테이블은 세션이 없는 일정용으로 유지.
CREATE TABLE IF NOT EXISTS session_attendances (
  session_id        INTEGER NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
  family_member_id  INTEGER NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  status            TEXT NOT NULL CHECK (status IN ('going','no','maybe')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  PRIMARY KEY (session_id, family_member_id)
);
CREATE INDEX IF NOT EXISTS idx_sa_session ON session_attendances(session_id);
CREATE INDEX IF NOT EXISTS idx_sa_member  ON session_attendances(family_member_id);
