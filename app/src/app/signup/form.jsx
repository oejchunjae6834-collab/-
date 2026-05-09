'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const SCHOOL_OPTIONS = [
  '유치원',
  '초1','초2','초3','초4','초5','초6',
  '중1','중2','중3',
  '고1','고2','고3',
];

const EMPTY_FAMILY = { name: '', type: '자녀', school: '' };

export default function SignupForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [families, setFamilies] = useState([
    { name: '', type: '부모', school: '' },
  ]);

  function setFam(i, field, v) {
    setFamilies((arr) => arr.map((f, idx) => {
      if (idx !== i) return f;
      const next = { ...f, [field]: v };
      if (field === 'type' && v === '부모') next.school = '';
      return next;
    }));
  }
  function addFam() { setFamilies((arr) => [...arr, { ...EMPTY_FAMILY }]); }
  function removeFam(i) { setFamilies((arr) => arr.filter((_, idx) => idx !== i)); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const password = fd.get('password').toString();
    const passwordConfirm = fd.get('password_confirm').toString();
    if (password !== passwordConfirm) {
      setMsg({ type: 'err', text: '비밀번호 확인이 일치하지 않아요' });
      setBusy(false);
      return;
    }
    const cleanedFamilies = families
      .filter((f) => f.name.trim())
      .map((f) => ({
        name: f.name.trim(),
        type: f.type,
        school: f.type === '자녀' ? (f.school || null) : null,
      }));
    const payload = {
      email: fd.get('email').toString().trim(),
      username: fd.get('username').toString().trim(),
      password,
      name: fd.get('name').toString().trim(),
      family_role: fd.get('family_role').toString(),
      family_members: cleanedFamilies,
      motive: fd.get('motive').toString().trim(),
    };
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '오류가 발생했어요');
      router.push('/auth/pending');
      router.refresh();
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="form-grid">
      <label className="full">
        <span>이메일 <em>*</em></span>
        <input type="email" name="email" required placeholder="example@email.com" autoComplete="email" />
      </label>
      <label>
        <span>아이디 <em>*</em></span>
        <input type="text" name="username" required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_.\-]{3,20}"
          placeholder="영문/숫자 3~20자" autoComplete="username" />
      </label>
      <label>
        <span>이름 (대표 신청자) <em>*</em></span>
        <input type="text" name="name" required placeholder="홍길동" />
      </label>
      <label>
        <span>비밀번호 <em>*</em></span>
        <input type="password" name="password" required minLength={6} placeholder="6자 이상" autoComplete="new-password" />
      </label>
      <label>
        <span>비밀번호 확인 <em>*</em></span>
        <input type="password" name="password_confirm" required minLength={6} placeholder="다시 입력" autoComplete="new-password" />
      </label>
      <label className="full">
        <span>가족 형태 <em>*</em></span>
        <select name="family_role" required defaultValue="">
          <option value="" disabled>선택해 주세요</option>
          <option>학부모</option>
          <option>아이</option>
          <option>운영진</option>
          <option>외부 강사</option>
        </select>
      </label>

      <div className="full" style={{ marginTop: 8, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
        <h4 style={{ margin: 0 }}>👨‍👩‍👧 가족 구성원</h4>
        <p className="muted small" style={{ marginTop: 4 }}>
          정기모임은 시간대별 세션으로 운영돼요. 부모와 자녀 각자가 어떤 세션에 참여할지 체크할 수 있도록,
          함께 오실 가족을 미리 등록해 주세요. 자녀는 학교·학년을 함께 선택해 주세요.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {families.map((f, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 110px 130px 30px',
              gap: 8, alignItems: 'center',
            }}>
              <input
                type="text"
                placeholder={i === 0 ? '예: 본인 이름' : '예: 첫째'}
                value={f.name}
                onChange={(e) => setFam(i, 'name', e.target.value)}
                style={{ padding: 9, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--bg-soft)', font: 'inherit' }}
              />
              <select
                value={f.type}
                onChange={(e) => setFam(i, 'type', e.target.value)}
                style={{ padding: 9, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--bg-soft)', font: 'inherit' }}
              >
                <option>부모</option>
                <option>자녀</option>
              </select>
              <select
                value={f.school}
                onChange={(e) => setFam(i, 'school', e.target.value)}
                disabled={f.type !== '자녀'}
                style={{ padding: 9, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--bg-soft)', font: 'inherit' }}
              >
                <option value="">{f.type === '자녀' ? '학교·학년' : '—'}</option>
                {SCHOOL_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                type="button"
                onClick={() => removeFam(i)}
                disabled={families.length === 1}
                title="삭제"
                style={{
                  background: 'transparent', border: 0, cursor: 'pointer',
                  fontSize: 18, color: 'var(--muted)',
                  opacity: families.length === 1 ? .3 : 1,
                }}
              >×</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={addFam} style={{ marginTop: 8 }}>
          + 가족 구성원 추가
        </button>
      </div>

      <label className="full">
        <span>가입 동기 (선택)</span>
        <textarea name="motive" rows="3" placeholder="어떻게 디적디적을 알게 되셨나요?"></textarea>
      </label>
      <div className="form-actions full">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? '신청 중…' : '회원가입 신청'}
        </button>
      </div>
      {msg && msg.type === 'err' && (
        <div className="banner-warn full">⚠️ {msg.text}</div>
      )}
    </form>
  );
}
