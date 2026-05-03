# 디적디적 공식 홈페이지

> AI 시대를 부모와 아이가 함께 공부하는 교육공동체 — Phase 1 (백엔드 + DB + 인증)

## 🛠 기술 스택

- **Frontend + Backend**: Next.js 14 (App Router) — 풀스택 단일 프로젝트
- **DB (개발)**: SQLite (`better-sqlite3`)
- **DB (운영 예정)**: PostgreSQL (Supabase 무료 티어)
- **인증**: 매직링크 (이메일 1회용 토큰) — Phase 1은 콘솔 출력 모드
- **권한 (RBAC)**: Guest(0) / Pending(1) / Member(2) / Admin(3)

## 🚀 로컬 실행 방법

### 1. 처음 한 번만
```bash
cd app
npm install
npm run db:init   # SQLite DB 생성
npm run db:seed   # 시드 데이터 채우기 (운영진 + 일정 + 아카이브 + CMS)
```

### 2. 개발 서버 시작
```bash
npm run dev
```
브라우저에서 http://localhost:3000 접속.

### 3. DB 처음부터 다시
```bash
npm run db:reset
```

## 👤 시드 계정 (개발용)

| 이메일 | 이름 | 권한 |
|--------|------|------|
| `oej@dijeok.test`  | 오은진     | **관리자** (Admin) |
| `ymsn@dijeok.test` | 양미선     | 회원 (Member) |
| `lsjn@dijeok.test` | 이산지나   | 회원 |
| `kga@dijeok.test`  | 고경애     | 회원 |
| `les@dijeok.test`  | 이은숙     | 회원 |
| `guest@dijeok.test`| 신청대기자 | 승인 대기 (Pending) |

## 🔐 로그인 흐름 (개발 모드)

1. `/login` 페이지에서 위 이메일 중 하나 입력 → "매직링크 받기"
2. 폼 응답에 **개발용 바로 인증 링크**가 같이 표시됨 (서버 콘솔에도 출력됨)
3. 그 링크 클릭 → 자동으로 세션 생성 → 회원/관리자 진입

> Phase 4(배포)에서 Resend 같은 무료 SMTP로 교체해 진짜 이메일 발송으로 바뀝니다.

## 🗺 페이지 맵

### 🌐 Public (비회원)
- `/`              — 랜딩 (히어로 + 가까운 공개 행사 + 활동 소개)
- `/about`         — 디적디적 소개 (CMS로 편집 가능)
- `/portfolio`     — 활동 포트폴리오 (어른/아이/수학/공동체 4탭)
- `/events/public` — 공개 행사 목록
- `/events/public/[id]` — 공개 행사 상세 + 외부인 신청 폼

### 🔒 Members
- `/calendar` — 전체 일정 + RSVP (참석/불참/미정)
- `/archive`  — 회의록 아카이브 (태그 필터 + 검색)
- `/members`  — 회원 명부 (가족 구성원 포함)
- `/ai`       — AI 검색 (Phase 2에서 활성화)

### 🛡 Admin
- `/admin`            — 대시보드 (요약 통계)
- `/admin/approvals`  — 가입 승인 / 반려
- `/admin/events`     — 일정 CRUD + 출석 명단 CSV 다운로드
- `/admin/archive`    — 아카이브 글 CRUD
- `/admin/cms`        — 랜딩 페이지 텍스트 편집

## 🗂 디렉토리 구조

```
app/
├── package.json
├── next.config.js
├── jsconfig.json
├── .env / .env.example
├── data/                      ← SQLite 파일 (gitignored)
├── db/
│   ├── schema.sql             ← 모든 테이블 정의
│   ├── init.js                ← 스키마 적용 스크립트
│   ├── seed.js                ← 시드 데이터
│   └── reset.js               ← 리셋
├── lib/
│   ├── db.js                  ← SQLite 클라이언트 + 마이그레이션
│   ├── auth.js                ← 매직링크 / 세션 / RBAC
│   ├── email.js               ← (개발) 콘솔 출력
│   └── queries.js             ← 모든 DB 조회/쓰기 헬퍼
└── src/
    ├── app/                   ← Next.js App Router
    │   ├── layout.jsx
    │   ├── globals.css
    │   ├── page.jsx           ← 랜딩
    │   ├── about/, portfolio/
    │   ├── events/public/
    │   ├── calendar/, archive/, members/, ai/
    │   ├── admin/...
    │   ├── login/, signup/, auth/verify/
    │   └── api/               ← REST API
    │       ├── auth/{login,signup,logout}
    │       ├── events/[id]/rsvp
    │       ├── events/public-rsvp
    │       └── admin/...
    └── components/
        ├── Nav.jsx
        └── Footer.jsx
```

## 🗃 DB 스키마 요약 (PRD/TRD 매핑)

| 테이블 | 용도 |
|--------|------|
| `users`          | 회원 — `is_approved`, `role_level`, `family_members` 포함 |
| `magic_links`    | 매직링크 1회용 토큰 (15분 만료) |
| `sessions`       | 세션 쿠키 (`dd_sid`, 30일) |
| `events`         | 일정 — `event_type`(정기모임/여름캠프/겨울캠프/공개특강/운영진회의), `is_public` |
| `attendances`    | 회원 출석 (going / no / maybe) |
| `public_rsvps`   | 공개 행사 외부인 신청 |
| `archive_docs`   | 회의록 + 밴드글 — `tone`(formal/friendly), `tags` JSON |
| `cms_blocks`     | 관리자 편집 가능한 랜딩 텍스트 |


## 🧪 빠른 테스트 시나리오

1. `oej@dijeok.test` 로그인 → 관리자 메뉴 진입
2. 가입 승인 화면에서 `신청대기자` 승인 → `guest@dijeok.test`가 회원으로 격상
3. 일정 관리에서 새 정기모임 추가 → 캘린더에 즉시 노출
4. 양미선 계정으로 로그인 → 추가된 일정에 RSVP 토글 → 다른 계정에서도 명단 갱신 확인
5. 관리자에서 해당 일정 CSV 다운로드 → 한글 깨짐 없이 출석부 받기
6. CMS에서 `notice` 변경 → 랜딩 상단 띠 즉시 변경

## ⚠️ 주의사항

- `.env` 파일의 `SESSION_SECRET`은 운영 시 **반드시** 새 임의값으로 교체
- `data/` 폴더와 `.env`는 git에 올리지 않습니다
- `better-sqlite3`는 native 모듈입니다 — `npm install` 시 컴파일이 필요해요. Windows에서 빌드 도구 누락 에러가 나면 `npm install --build-from-source=false` 옵션을 시도하거나 Node 18 LTS 사용을 권장합니다 (현재는 Node 24도 prebuilt binary 지원).
