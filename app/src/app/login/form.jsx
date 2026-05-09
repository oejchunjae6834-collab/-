'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const LOGIN_USERNAME_KEY = 'dijeok_login_username';

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(LOGIN_USERNAME_KEY);
    if (saved) setUsername(saved);
  }, []);

  useEffect(() => {
    if (username) window.localStorage.setItem(LOGIN_USERNAME_KEY, username);
  }, [username]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '로그인 실패');
      const next = data.role_level >= 2 ? '/calendar' : '/auth/pending';
      router.push(next);
      router.refresh();
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="form-grid">
      <label className="full">
        <span>아이디 <em>*</em></span>
        <input
          type="text" required value={username} autoComplete="username"
          onChange={(e) => setUsername(e.target.value)}
          placeholder="아이디 또는 이메일"
        />
      </label>
      <label className="full">
        <span>비밀번호 <em>*</em></span>
        <input
          type="password" required value={password} autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
        />
      </label>
      <p className="muted small full" style={{ marginTop: 4 }}>
        아이디는 자동 저장되어 다음 로그인 때 편리합니다.
      </p>
      <div className="form-actions full">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? '로그인 중…' : '로그인'}
        </button>
      </div>
      {msg && msg.type === 'err' && (
        <div className="banner-warn full">⚠️ {msg.text}</div>
      )}
    </form>
  );
}
