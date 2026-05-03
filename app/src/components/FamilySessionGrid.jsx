'use client';
import { useMemo, useState } from 'react';

/**
 * 가족×세션 출석 그리드 (CLAUDE.md TRD 1-B)
 *
 * props:
 *   sessions: [{ id, name, start_time, end_time, capacity, notes }]
 *   familyMembers: [{ id, name, type, age }]   ← 본인 가족만
 *   initialMyStatus: [{ session_id, family_member_id, status }]
 *   sessionTotals: { [sessionId]: { going: n, maybe: n, no: n } }   ← 전체 회원 가족 합산
 *   eventId: number
 */
export default function FamilySessionGrid({ sessions, familyMembers, initialMyStatus, sessionTotals: initialTotals, eventId }) {
  // 본인 가족 출석 상태: 'going' | 'no' | 'maybe' | null
  const initMap = useMemo(() => {
    const m = {};
    for (const r of initialMyStatus || []) m[`${r.session_id}:${r.family_member_id}`] = r.status;
    return m;
  }, [initialMyStatus]);
  const [status, setStatus] = useState(initMap);
  const [totals, setTotals] = useState(initialTotals || {});
  const [busy, setBusy] = useState(false);

  function key(sId, fId) { return `${sId}:${fId}`; }

  async function setOne(sessionId, familyMemberId, next) {
    const k = key(sessionId, familyMemberId);
    const prev = status[k] || null;
    if (prev === next) next = null;     // 같은 버튼 재클릭 = 해제
    // 낙관적 업데이트
    setStatus((s) => ({ ...s, [k]: next }));
    setTotals((t) => {
      const cur = { ...(t[sessionId] || { going: 0, maybe: 0, no: 0 }) };
      if (prev) cur[prev] = Math.max(0, (cur[prev] || 0) - 1);
      if (next) cur[next] = (cur[next] || 0) + 1;
      return { ...t, [sessionId]: cur };
    });
    setBusy(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_member_id: familyMemberId, status: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'fail');
      const data = await res.json();
      // 서버에서 갱신된 totals를 받으면 동기화
      if (data.totals) setTotals((t) => ({ ...t, [sessionId]: data.totals }));
    } catch (e) {
      // 롤백
      setStatus((s) => ({ ...s, [k]: prev }));
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function attendAll() {
    if (familyMembers.length === 0) {
      alert('등록된 가족 구성원이 없어요. 회원 정보에서 가족을 먼저 추가해 주세요.');
      return;
    }
    if (!confirm(`${familyMembers.length}명 × ${sessions.length}세션 = 총 ${familyMembers.length * sessions.length}건을 모두 "참석"으로 표시할까요?`)) return;
    for (const s of sessions) {
      for (const fm of familyMembers) {
        const k = key(s.id, fm.id);
        if (status[k] !== 'going') {
          // 직렬 호출 (서버 부담 적게)
          // eslint-disable-next-line no-await-in-loop
          await setOne(s.id, fm.id, 'going');
        }
      }
    }
  }

  if (sessions.length === 0) {
    return <p className="muted small">이 일정엔 아직 세션이 등록되지 않았어요.</p>;
  }

  if (familyMembers.length === 0) {
    return (
      <div className="banner-warn">
        ⚠️ 출석 체크를 하려면 먼저 가족 구성원을 등록해 주세요.{' '}
        <a href="/admin/members" style={{ color: 'var(--primary-ink)', fontWeight: 600 }}>회원 정보 관리</a>에서
        본인 행을 ✎ 수정 → 가족 구성원을 추가하면 여기 행으로 나타나요.
      </div>
    );
  }

  return (
    <div className="fs-grid-wrap">
      <div className="fs-grid-toolbar">
        <button type="button" className="btn btn-primary btn-sm" onClick={attendAll} disabled={busy}>
          ✓ 전체 세션 참석
        </button>
        <span className="muted small">버튼을 누르면 모든 세션·가족이 "참석"으로 표시돼요. 개별 칸은 다시 누르면 해제됩니다.</span>
      </div>

      <div className="fs-grid-scroll">
        <table className="fs-grid">
          <thead>
            <tr>
              <th className="fs-corner">가족 \ 세션</th>
              {sessions.map((s) => {
                const t = totals[s.id] || {};
                const going = t.going || 0;
                const overCap = s.capacity && going > s.capacity;
                return (
                  <th key={s.id} className="fs-session">
                    <div className="fs-session-name">{s.name}</div>
                    <div className="fs-session-time">
                      {s.start_time && s.end_time ? `${s.start_time}~${s.end_time}` : ''}
                    </div>
                    <div className={`fs-session-total ${overCap ? 'over' : ''}`}>
                      참석 <strong>{going}</strong>
                      {s.capacity ? <span className="muted"> / 정원 {s.capacity}</span> : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {familyMembers.map((fm) => (
              <tr key={fm.id}>
                <th className="fs-member">
                  <div className="fs-member-name">
                    {fm.type === '부모' ? '👤' : '🧒'} {fm.name}
                  </div>
                  <div className="fs-member-meta">
                    {fm.type}{fm.age ? ` · ${fm.age}세` : ''}
                  </div>
                </th>
                {sessions.map((s) => {
                  const cur = status[key(s.id, fm.id)] || null;
                  return (
                    <td key={s.id} className="fs-cell">
                      <div className="fs-toggle">
                        {['going', 'no', 'maybe'].map((st) => {
                          const isActive = cur === st;
                          const label = st === 'going' ? '참석' : st === 'no' ? '불참' : '미정';
                          return (
                            <button
                              key={st}
                              type="button"
                              className={`fs-pill ${isActive ? 'active ' + st : ''}`}
                              disabled={busy}
                              onClick={() => setOne(s.id, fm.id, st)}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 정원 초과 등 안내 */}
      {sessions.some((s) => s.capacity && (totals[s.id]?.going || 0) > s.capacity) && (
        <p className="banner-warn" style={{ marginTop: 10 }}>
          ⚠️ 정원을 초과한 세션이 있어요. 운영진과 상의해 주세요.
        </p>
      )}
    </div>
  );
}
