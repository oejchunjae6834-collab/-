/**
 * 매직링크 이메일 발송.
 *
 * 우선순위:
 *   1. RESEND_API_KEY 가 있으면 Resend HTTP API로 실제 발송
 *   2. 없으면 서버 콘솔에 링크 출력 (개발 모드)
 *
 * Resend 무료 티어(월 3,000통)로 동아리 규모는 충분합니다.
 * 가입: https://resend.com/  → API Keys → Create
 *
 * 필요한 환경 변수:
 *   RESEND_API_KEY   "re_xxxxxxx"
 *   EMAIL_FROM       "디적디적 <noreply@yourdomain.com>"  (도메인 인증 필요)
 *                    또는 "onboarding@resend.dev"  (인증 전 테스트용)
 */

const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

function logToConsole({ to, url, label }) {
  const lines = [
    '',
    yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'),
    yellow(`📧  매직링크 (개발 모드 — 실제 발송 X, RESEND_API_KEY 미설정)`),
    yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'),
    `  대상  : ${to}`,
    `  목적  : ${label}`,
    `  링크  : ${cyan(url)}`,
    dim('  ↑ 위 링크를 브라우저 주소창에 붙여넣으면 인증됩니다 (15분 유효)'),
    yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'),
    '',
  ];
  console.log(lines.join('\n'));
}

function htmlBody({ url, label }) {
  return `<!doctype html>
<html lang="ko"><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#222;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#2b6cb0">디적디적 ${label}</h2>
  <p>아래 버튼을 눌러 인증을 완료해주세요. 링크는 <strong>15분</strong> 동안만 유효합니다.</p>
  <p style="margin:24px 0">
    <a href="${url}" style="background:#2b6cb0;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">
      ${label} 완료하기
    </a>
  </p>
  <p style="color:#666;font-size:13px">버튼이 동작하지 않으면 다음 주소를 브라우저에 붙여넣으세요:<br>
    <span style="word-break:break-all">${url}</span>
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#999;font-size:12px">이 메일을 요청하지 않으셨다면 그냥 무시하시면 됩니다.</p>
</body></html>`;
}

async function sendViaResend({ to, url, label }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `[디적디적] ${label}`,
      html: htmlBody({ url, label }),
      text: `${label}: ${url}\n(15분 동안 유효합니다)`,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Resend 발송 실패 (${res.status}): ${txt}`);
  }
}

export async function sendMagicLinkEmail({ to, url, purpose = 'login' }) {
  const label = purpose === 'signup' ? '가입 인증 링크' : '로그인 링크';

  if (process.env.RESEND_API_KEY) {
    try {
      await sendViaResend({ to, url, label });
      console.log(`📨 매직링크 발송 완료 → ${to}`);
      return;
    } catch (e) {
      console.error('[email] Resend 실패, 콘솔로 폴백:', e.message);
      // 폴백
    }
  }
  logToConsole({ to, url, label });
}
