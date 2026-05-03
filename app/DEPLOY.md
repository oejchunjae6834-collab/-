# 디적디적 홈페이지 — Render 배포 가이드

## 0. 미리 준비할 것

| 항목 | 어디서 | 비용 |
|---|---|---|
| GitHub 계정 | https://github.com | 무료 |
| Render 계정 | https://render.com (GitHub 로그인 가능) | $7/월~ |
| 도메인 (선택) | 가비아·후이즈 등 | 1만~2만/년 |
| Resend 계정 (선택, 메일 발송용) | https://resend.com | 월 3,000통 무료 |

> **무료로 일단 테스트하고 싶다면**: Render `free` 플랜으로 시작하되, 15분간 요청이 없으면 자동으로 잠들어 첫 접속이 30초 정도 느려집니다. Disk(영구 저장소)는 free 플랜에서 지원하지 않으니, 진짜로 운영하실 때는 `starter`($7/월) + Disk($0.25/월)로 올려주세요.

---

## 1. GitHub에 코드 올리기

프로젝트 루트(`claude-test/`)에서:

```bash
git init                        # 이미 있으면 생략
git add .
git commit -m "deploy: initial"
# GitHub에서 빈 저장소 만든 뒤
git remote add origin https://github.com/<your>/<repo>.git
git branch -M main
git push -u origin main
```

> `.gitignore`에 `app/data/`, `app/.next/`, `app/node_modules/`, `app/public/uploads/`, `app/.env`이 들어가 있는지 확인하세요. 이미 들어 있습니다.

---

## 2. Render Blueprint로 배포 (자동)

1. Render 대시보드 → **New +** → **Blueprint**
2. GitHub 저장소 선택 → 자동으로 `app/render.yaml`을 인식
3. **Apply** 누르면 Web Service + Disk가 함께 생성됨
4. 환경 변수 입력 화면에서 다음 3개를 채워주세요:
   - `NEXT_PUBLIC_BASE_URL` → 처음엔 Render가 준 임시 URL (예: `https://dijeokdijeok.onrender.com`)
   - `EMAIL_FROM` → `"디적디적 <noreply@yourdomain.com>"` 또는 테스트용 `"onboarding@resend.dev"`
   - `RESEND_API_KEY` → Resend에서 발급받은 키 (없으면 비워둬도 됨, 콘솔에만 출력)

5. 첫 빌드 5~10분 후 배포 완료. 임시 URL로 접속 확인.

---

## 3. 도메인 연결 (선택)

1. Render 대시보드 → 서비스 → **Settings** → **Custom Domain** → 도메인 입력
2. Render가 알려주는 CNAME(또는 A 레코드)을 도메인 등록업체(가비아 등)의 DNS 설정에 추가
3. 5분~1시간 안에 SSL 인증서 자동 발급 (Let's Encrypt)
4. `NEXT_PUBLIC_BASE_URL` 환경변수를 실제 도메인(`https://dijeokdijeok.kr`)으로 변경 → 자동 재배포

---

## 4. 메일 발송 활성화 (Resend)

매직링크는 메일 발송이 안 되면 회원가입/로그인이 사실상 막힙니다. 운영 전 꼭 설정하세요.

1. https://resend.com 가입 → **API Keys** → **Create API Key** → 복사
2. (도메인이 있다면) **Domains** → **Add Domain** → DNS 레코드 3개 추가 → Verify
3. Render 대시보드에서 환경변수 설정:
   - `RESEND_API_KEY` = 방금 복사한 키
   - `EMAIL_FROM` = `"디적디적 <noreply@yourdomain.com>"` (도메인 인증 후) 또는 임시로 `"onboarding@resend.dev"`
4. 변경 저장 → 자동 재배포

---

## 5. 첫 관리자 계정 만들기

배포 후 시드 데이터에 운영진 계정이 들어가지만(`oej@dijeok.test`), 이건 가짜 이메일이라 매직링크가 안 옵니다. 본인 실제 이메일로 관리자 만들기:

1. 배포된 사이트에서 **회원가입** → 본인 이메일 입력 → 받은 메일로 로그인
2. Render 대시보드 → 서비스 → **Shell** 탭 → 다음 명령으로 본인을 관리자(role_level=3) 승격:
   ```bash
   node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.env.DB_PATH);d.prepare('UPDATE users SET role_level=3, is_approved=1 WHERE email=?').run('your@email.com');console.log('done');"
   ```
3. 본인 이메일을 따옴표 안에 정확히 넣어서 실행
4. 사이트 다시 열면 상단에 "관리자" 메뉴 표시됨

---

## 6. 운영 중 점검

| 작업 | 방법 |
|---|---|
| **로그 보기** | Render 대시보드 → 서비스 → **Logs** 탭 |
| **DB 백업** | Shell에서 `cp $DB_PATH /tmp/backup.db` 후 `Files` 탭으로 다운로드 (또는 `cat $DB_PATH \| base64` 출력 복사) |
| **시드 다시 채우기** | (보통 불필요) Shell에서 `npm run db:seed` |
| **환경변수 변경** | Settings → Environment → 저장 시 자동 재배포 |
| **수동 재배포** | Manual Deploy → Deploy latest commit |
| **서비스 일시 정지** | Settings → Suspend (요금 부과 중지) |

---

## 7. 자주 막히는 부분

- **"Application failed to respond"** → Logs 확인. 보통 환경변수(특히 `DB_PATH`) 누락이거나 Disk 마운트 안 됐을 때.
- **사진이 안 보임** → `UPLOAD_DIR=/var/data/uploads` 환경변수 + Disk 마운트 경로(`/var/data`) 일치 확인.
- **로그인 메일이 안 옴** → `RESEND_API_KEY` 미설정이면 Logs에 콘솔로만 출력됩니다. 회원가입을 받으려면 Resend 필수.
- **첫 요청이 30초 걸림** → free 플랜의 sleep. starter로 업그레이드하면 해결.
- **`Cannot find module './xxxx.js'`** → 보통 stale build cache. Render에서 Manual Deploy → "Clear build cache & deploy" 클릭.

---

## 8. 비용 정리

| 항목 | 월 비용 |
|---|---|
| Render Web Service (Starter) | $7 |
| Render Disk 1GB | $0.25 |
| 도메인 (.kr 1년/12) | ~₩1,500 |
| Resend 무료 | $0 |
| **합계** | **약 ₩11,000/월** |

부담되시면 **free 플랜 + free 도메인(`*.onrender.com`) + 메일은 운영진끼리 콘솔 로그 공유**로 시작하셔도 됩니다(0원). 규모가 커지면 starter로 올리세요.
