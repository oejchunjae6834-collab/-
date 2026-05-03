'use client';
import { useState } from 'react';

const EMPTY_FAMILY = { name: '', type: '자녀', age: '' };

export default function SignupForm() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [families, setFamilies] = useState([
    { name: '', type: '부모', age: '' },
  ]);

  function setFam(i, field, v) {
    setFamilies((arr) => arr.map((f, idx) => idx === i ? { ...f, [field]: v } : f));
  }
  function addFam() { setFamilies((arr) => [...arr, { ...EMPTY_FAMILY }]); }
  function removeFam(i) { setFamilies((arr) => arr.filter((_, idx) => idx !== i)); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const cleanedFamilies = families
      .filter((f) => f.name.trim())
      .map((f) => ({
        name: f.name.trim(),
        type: f.type,
        age: f.age ? parseInt(f.age, 10) : null,
      }));
    const payload = {
      email: fd.get('email').toString().trim(),
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
      setMsg({ type: 'ok', text: '신청 완료! 매직링크가 발송되었어요. 인증 후 자동으로 승인 대기 상태로 전환됩니다.', devUrl: data.devUrl });
      e.currentTarget.reset();
      setFamilies([{ name: '', type: '부모', age: '' }]);
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
        <input type="email" name="email" required placeholder="example@email.com" />
      </label>
      <label>
        <span>이름 (대표 신청자) <em>*</em></span>
        <input type="text" name="name" required placeholder="홍길동" />
      </label>
      <label>
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
          함께 오실 가족을 미리 등록해 주세요. 승인 후 바로 출석 체크에 반영돼요.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {families.map((f, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 90px 70px 30px',
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
              <input
                type="number"
                placeholder="나이"
                min="0" max="120"
                value={f.age}
                onChange={(e) => setFam(i, 'age', e.target.value)}
                style={{ padding: 9, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--bg-soft)', font: 'inherit' }}
              />
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
          {busy ? '신청 중…' : '가입 신청 + 매직링크 받기'}
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
