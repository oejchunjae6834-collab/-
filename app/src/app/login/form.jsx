'use client';
import { useEffect, useState } from 'react';

const LOGIN_EMAIL_KEY = 'dijeok_login_email';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(LOGIN_EMAIL_KEY);
    if (saved) setEmail(saved);
  }, []);

  useEffect(() => {
    if (email) window.localStorage.setItem(LOGIN_EMAIL_KEY, email);
  }, [email]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '오류가 발생했어요');
      // 개발 환경에서는 서버 응답에 magicUrl이 같이 와요 → 바로 안내
      setMsg({
        type: 'ok',
        text: '매직링크를 보냈어요. 서버 콘솔에서 링크를 확인해 주세요.',
        devUrl: data.devUrl,
      });
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="form-grid">
      <label className="full">
        <span>이메일 <em>*</em></span>
        <input
          type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="oej@dijeok.test (시드 계정 예시)"
        />
      </label>
      <p className="muted small" style={{ marginTop: 4 }}>
        입력한 이메일은 자동 저장되어 다음에 다시 로그인할 때 편리합니다.
      </p>
      <div className="form-actions full">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? '발송 중…' : '매직링크 받기'}
        </button>
      </div>
      {msg && msg.type === 'ok' && (
        <div className="banner-info full">
          ✅ {msg.text}
          {msg.devUrl && (
            <>
              <br />
              <a href={msg.devUrl} style={{ color: 'var(--accent)', fontWeight: 700 }}>
                👉 개발용 바로 인증 링크
              </a>
            </>
          )}
        </div>
      )}
      {msg && msg.type === 'err' && (
        <div className="banner-warn full">⚠️ {msg.text}</div>
      )}
    </form>
  );
}
