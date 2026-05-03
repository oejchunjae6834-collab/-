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
 *   allAttendances: [{ session_id, family_member_id, status, member_name, member_type, age, parent_user_id, parent_name }]
 *                                                                    ← 모든 회원의 가족 출석
 *   myUserId: number — 내 user.id (본인 행 강조용)
 *   eventId: number
 */
export default function FamilySessionGrid({
  sessions,
  familyMembers,
  initialMyStatus,
  sessionTotals: initialTotals,
  allAttendances: initialAttendances,
  myUserId,
  eventId,
}) {
  // 본인 가족 출석 상태: 'going' | 'no' | 'maybe' | null
  const initMap = useMemo(() => {
    const m = {};
    for (const r of initialMyStatus || []) m[`${r.session_id}:${r.family_member_id}`] = r.status;
    return m;
  }, [initialMyStatus]);
  const [status, setStatus] = useState(initMap);
  const [totals, setTotals] = useState(initialTotals || {});
  const [attendances, setAttendances] = useState(initialAttendances || []);
  const [busy, setBusy] = useState(false);

  function key(sId, fId) { return `${sId}:${fId}`; }

  function updateAttendances(sessionId, familyMemberId, prev, next, fm) {
    setAttendances((list) => {
      // 해당 (session, member) 기존 행 제거
      const filtered = list.filter(
        (r) => !(r.session_id === sessionId && r.family_member_id === familyMemberId)
      );
      if (!next) return filtered;
      filtered.push({
        session_id: sessionId,
        family_member_id: familyMemberId,
        status: next,
        member_name: fm.name,
        member_type: fm.type,
        age: fm.age ?? null,
        parent_user_id: myUserId,
        parent_name: '나',
      });
      return filtered;
    });
  }

  async function setOne(sessionId, familyMemberId, next) {
    const k = key(sessionId, familyMemberId);
    const prev = status[k] || null;
    const fm = familyMembers.find((m) => m.id === familyMemberId);
    if (prev === next) next = null;     // 같은 버튼 재클릭 = 해제

    // 낙관적 업데이트
    setStatus((s) => ({ ...s, [k]: next }));
    setTotals((t) => {
      const cur = { ...(t[sessionId] || { going: 0, maybe: 0, no: 0 }) };
      if (prev) cur[prev] = Math.max(0, (cur[prev] || 0) - 1);
      if (next) cur[next] = (cur[next] || 0) + 1;
      return { ...t, [sessionId]: cur };
    });
    if (fm) updateAttendances(sessionId, familyMemberId, prev, next, fm);

    setBusy(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_member_id: familyMemberId, status: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'fail');
      const data = await res.json();
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
          // eslint-disable-next-line no-await-in-loop
          await setOne(s.id, fm.id, 'going');
        }
      }
    }
  }

  // 세션별 참석자 그룹: parent_user_id 기준으로 묶어 가족 단위로 표시
  function attendeesBySession(sessionId, statusFilter) {
    const rows = attendances.filter((r) => r.session_id === sessionId && r.status === statusFilter);
    const byFamily = new Map();
    for (const r of rows) {
      const arr = byFamily.get(r.parent_user_id) || { parent: r.parent_name, members: [] };
      arr.members.push(r);
      byFamily.set(r.parent_user_id, arr);
    }
    return Array.from(byFamily.entries()).map(([uid, v]) => ({ uid, ...v }));
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

      {/* 정원 초과 안내 */}
      {sessions.some((s) => s.capacity && (totals[s.id]?.going || 0) > s.capacity) && (
        <p className="banner-warn" style={{ marginTop: 10 }}>
          ⚠️ 정원을 초과한 세션이 있어요. 운영진과 상의해 주세요.
        </p>
      )}

      {/* 세션별 참석 명단 — 다른 가족의 출석을 함께 볼 수 있어요 */}
      <details className="fs-attendees" style={{ marginTop: 14 }} open>
        <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '8px 0' }}>
          🧑‍🤝‍🧑 세션별 참석 명단 보기 (전체 가족)
        </summary>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(sessions.length, 3)}, minmax(0, 1fr))`,
            gap: 12,
            marginTop: 8,
          }}
        >
          {sessions.map((s) => {
            const going = attendeesBySession(s.id, 'going');
            const maybe = attendeesBySession(s.id, 'maybe');
            return (
              <div
                key={s.id}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: 10,
                  background: 'var(--bg-soft, #fafafa)',
                }}
              >
                <div style={{ fontWeight: 600 }}>{s.name}</div>
                {s.start_time && s.end_time && (
                  <div className="muted small" style={{ marginBottom: 6 }}>
                    {s.start_time}~{s.end_time}
                  </div>
                )}

                <div className="small" style={{ marginTop: 6 }}>
                  <strong style={{ color: 'var(--primary-ink, #2b6cb0)' }}>
                    ✅ 참석 ({going.reduce((a, f) => a + f.members.length, 0)})
                  </strong>
                  {going.length === 0 ? (
                    <div className="muted small">아직 없어요</div>
                  ) : (
                    <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                      {going.map((fam) => (
                        <li key={fam.uid} style={{ marginBottom: 2 }}>
                          {fam.uid === myUserId ? <strong>{fam.parent} 가족</strong> : <span>{fam.parent} 가족</span>}
                          {' '}— {fam.members.map((m) => `${m.member_type === '부모' ? '👤' : '🧒'}${m.member_name}`).join(', ')}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {maybe.length > 0 && (
                  <div className="small" style={{ marginTop: 8 }}>
                    <strong style={{ color: 'var(--accent, #c08a2a)' }}>
                      🤔 미정 ({maybe.reduce((a, f) => a + f.members.length, 0)})
                    </strong>
                    <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                      {maybe.map((fam) => (
                        <li key={fam.uid} style={{ marginBottom: 2 }}>
                          {fam.parent} 가족 — {fam.members.map((m) => m.member_name).join(', ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
