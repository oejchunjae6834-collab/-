'use client';
import { useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

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
