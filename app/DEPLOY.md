# 디적디적 — 무료 배포 가이드 (Render Free + Supabase Free)

## 0. 비용 정리

| 항목 | 월 비용 |
|---|---|
| Render Web Service Free | $0 (단, 15분 idle 후 sleep — 첫 요청 30초 지연) |
| Supabase Postgres Free | $0 (500MB DB, 7일 미접속 시 일시정지/자동 복구) |
| Supabase Storage Free | $0 (1GB, 5GB egress/월) |
| Resend (메일) Free | $0 (월 3,000통) |
| 도메인 (선택) | ~₩1,500/월 |
| **합계** | **도메인 안 사면 0원** |

---

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 가입 (GitHub 로그인 가능)
2. **New Project** 클릭
   - 이름: `dijeokdijeok-prod` (개발용은 별도로 `dijeokdijeok-dev`도 만들면 좋음)
   - Database Password: 강력한 비밀번호 생성 후 안전하게 보관
   - Region: `Northeast Asia (Seoul)` 권장
3. 프로젝트 생성 5~10분 대기

### 가져올 값 3가지
- **Settings → Database → Connection string → URI** 옆 토글에서 **Transaction (Pooler)** 선택 후 복사
  → `postgresql://postgres.xxxxx:PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`
  *(끝의 `[YOUR-PASSWORD]` 부분을 실제 DB 비밀번호로 교체)*
- **Settings → API → Project URL** → `https://xxxxx.supabase.co`
- **Settings → API → Project API keys → service_role** (자물쇠 클릭해서 표시) → `eyJ...`

### Storage 버킷 만들기
1. 좌측 메뉴 **Storage** → **New bucket**
2. 이름: `uploads`
3. **Public bucket** 체크 ✅ (회원이 올린 사진을 비회원도 볼 수 있어야 하므로)
4. Create

---

## 2. 로컬 검증 (선택 — 권장)

배포 전 로컬에서 잘 도는지 확인:

```bash
cd app
cp .env.example .env
# .env 파일 열어서 위에서 가져온 3개 값(DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) 채우기
npm install
npm run db:migrate    # Supabase에 스키마 적용 + 시드 데이터
npm run dev           # http://localhost:3000
```

확인할 것:
- [ ] 메인 페이지에 텍스트가 보임 (CMS 시드)
- [ ] /portfolio 에 활동 카드들이 보임
- [ ] /signup 에서 본인 이메일로 가입 → 콘솔에 매직링크 출력
- [ ] /admin/portfolio 에서 사진 업로드 → Supabase Storage 대시보드에 파일 보임

---

## 3. GitHub에 push

```bash
git add .
git commit -m "feat: Supabase migration"
git push
```

---

## 4. Render 배포

1. https://dashboard.render.com 접속 → GitHub 로그인
2. **New +** → **Blueprint**
3. 저장소 선택 → `app/render.yaml` 자동 인식 → **Apply**
4. 환경 변수 입력 화면:
   - `DATABASE_URL` → Supabase Connection string
   - `SUPABASE_URL` → Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` → service_role key
   - `NEXT_PUBLIC_BASE_URL` → 일단 비워두기 (배포 후 갱신)
   - `EMAIL_FROM` → `onboarding@resend.dev` (Resend 도메인 인증 전 임시값)
   - `RESEND_API_KEY` → 일단 비워두기 (없으면 콘솔에만 출력)
5. **Apply** → 5~10분 대기

빌드 로그에서 다음을 확인:
- `npm install` 성공
- `npm run build` 성공
- `npm run db:migrate` 에서 `📐 스키마 적용 완료` + `🌱 마이그레이션·시드 완료` 메시지

배포 완료되면 Render가 임시 URL을 줍니다 (예: `https://dijeokdijeok-xxxx.onrender.com`).

### 배포 후 후속 작업
1. Render Dashboard → 서비스 → **Settings → Environment**
2. `NEXT_PUBLIC_BASE_URL`을 임시 URL로 갱신 → Save (자동 재배포 트리거)

---

## 5. 도메인 연결 (선택)

1. Render → 서비스 → **Settings → Custom Domain** → 도메인 입력
2. 도메인 등록업체(가비아 등)의 DNS 설정에 Render가 알려주는 CNAME(또는 A 레코드) 추가
3. 5분~1시간 안에 SSL 인증서 자동 발급
4. `NEXT_PUBLIC_BASE_URL`을 실제 도메인으로 갱신

---

## 6. 메일 발송 활성화 (Resend)

배포된 사이트로 회원을 받을 거라면 메일 발송 필수 (지금은 매직링크가 Render 로그에만 출력됩니다).

1. https://resend.com 가입 → **API Keys → Create**
2. (도메인 있다면) **Domains → Add Domain** → DNS 레코드 3개 추가 → Verify
3. Render 환경변수:
   - `RESEND_API_KEY` = 발급받은 키
   - `EMAIL_FROM` = `"디적디적 <noreply@yourdomain.com>"` (도메인 인증 후) 또는 `"onboarding@resend.dev"`
4. 저장 → 자동 재배포

---

## 7. 첫 관리자 계정 만들기

시드 데이터의 `oej@dijeok.test` 같은 가짜 이메일은 매직링크가 안 옵니다. 본인 이메일로 가입 후 admin 승격:

1. 배포된 사이트에서 **회원가입** → 본인 이메일 → 받은 메일/콘솔의 매직링크로 인증
2. Supabase Dashboard → **SQL Editor** → New query
3. 실행:
   ```sql
   UPDATE users SET role_level = 3, is_approved = 1 WHERE email = 'your@email.com';
   ```
4. 사이트 다시 열면 상단에 "관리자" 메뉴 표시됨

---

## 8. 운영 중 점검

| 작업 | 방법 |
|---|---|
| **로그 보기** | Render Dashboard → 서비스 → Logs |
| **DB 직접 보기** | Supabase Dashboard → Table Editor 또는 SQL Editor |
| **DB 백업** | Supabase Dashboard → Database → Backups (Free 플랜은 7일 자동 백업) |
| **사진 관리** | Supabase Dashboard → Storage → uploads 버킷 |
| **환경변수 변경** | Render → Settings → Environment → 저장 시 자동 재배포 |
| **수동 재배포** | Render → Manual Deploy → "Deploy latest commit" |
| **빌드 캐시 초기화** | Render → Manual Deploy → "Clear build cache & deploy" |

---

## 9. 자주 막히는 부분

- **빌드 시 `❌ 마이그레이션 실패`** → `DATABASE_URL`이 잘못 입력됐거나 Supabase가 시작 중. URL의 비밀번호 부분이 `[YOUR-PASSWORD]` 그대로 남아있는지 확인.
- **사진 업로드 실패** → `uploads` 버킷이 없거나 Public 체크가 안 됐을 가능성. Storage 설정 다시 확인.
- **첫 요청이 30초 걸림** → Render Free 플랜의 sleep. 스타터($7)로 올리거나 Cron-job.org로 5분마다 ping해서 깨워두기.
- **"DB 일시정지"** → Supabase Free는 7일 미접속 시 일시정지. 사이트 접속 시 자동 복구 (~10초). 활발히 쓰면 발생하지 않음.
- **`Cannot find module './xxxx.js'`** → Render에서 Manual Deploy → "Clear build cache & deploy".

---

## 10. 마이그레이션 노트

이 프로젝트는 원래 SQLite(파일 DB) + 로컬 디스크였으나, 무료 운영을 위해 Supabase로 전환되었습니다.

- DB: `node:sqlite` → `pg` (PostgreSQL)
- 사진: 로컬 디스크 → Supabase Storage
- 모든 DB 함수 동기 → 비동기 (await)
- 영향 파일: 약 60개

레거시 SQLite 파일들은 `db/schema.legacy.sqlite.sql`, `db/seed.legacy.sqlite.js`로 백업되어 있습니다.
