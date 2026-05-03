'use client';
import { useState } from 'react';

export default function PublicRsvpForm({ eventId }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      event_id: eventId,
      name: fd.get('name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      party_size: parseInt(fd.get('party_size') || '1', 10),
      note: fd.get('note'),
    };
    try {
      const res = await fetch('/api/events/public-rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '신청에 실패했어요');
      setMsg({ type: 'ok' });
      e.currentTarget.reset();
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (msg?.type === 'ok') {
    return (
      <div className="banner-info">
        ✅ 신청이 접수되었어요. 행사 당일에 만나요!
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="form-grid">
      <label>
        <span>이름 <em>*</em></span>
        <input type="text" name="name" required />
      </label>
      <label>
        <span>이메일 <em>*</em></span>
        <input type="email" name="email" required />
      </label>
      <label>
        <span>연락처</span>
        <input type="tel" name="phone" placeholder="010-0000-0000" />
      </label>
      <label>
        <span>참석 인원 <em>*</em></span>
        <input type="number" name="party_size" min="1" max="10" defaultValue="1" required />
      </label>
      <label className="full">
        <span>메모 (선택)</span>
        <textarea name="note" rows="3" placeholder="아이 동반 여부, 주차 필요 여부 등"></textarea>
      </label>
      <div className="form-actions full">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? '신청 중…' : '참석 신청'}
        </button>
      </div>
      {msg?.type === 'err' && (
        <div className="banner-warn full">⚠️ {msg.text}</div>
      )}
    </form>
  );
}
