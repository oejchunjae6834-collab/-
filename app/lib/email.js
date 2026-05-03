/**
 * 이메일 발송 (Phase 1: 콘솔 출력)
 *
 * Phase 4 배포 단계에서 Resend / SMTP로 교체합니다.
 * 지금은 매직링크 URL을 서버 콘솔에 보기 좋게 출력해서,
 * 개발 중에 그대로 클릭/복붙해 인증할 수 있도록 합니다.
 */

const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

export async function sendMagicLinkEmail({ to, url, purpose = 'login' }) {
  const label = purpose === 'signup' ? '가입 인증 링크' : '로그인 링크';
  const lines = [
    '',
    yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'),
    yellow(`📧  매직링크 발송 (개발 모드 — 실제 발송 X)`),
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
