/* ============== Dijeok-Dijeok Archive App ============== */
(function () {
  const D = window.DD_DATA;

  /* ==========================================================
   * Storage layer — events / archive / members 모두 localStorage
   * 에 보관해 관리자 편집이 새로고침에도 유지되도록 합니다.
   * ========================================================== */
  const KEY = {
    user: 'dd_user',
    rsvp: 'dd_rsvp',
    events: 'dd_events',
    archive: 'dd_archive',
    members: 'dd_members',
    seedVer: 'dd_seed_version',
  };
  // 시드 데이터 구조가 바뀌면 이 값을 올려 자동 마이그레이션을 트리거합니다.
  const SEED_VERSION = '2';
  if (localStorage.getItem(KEY.seedVer) !== SEED_VERSION) {
    [KEY.events, KEY.archive, KEY.members, KEY.rsvp].forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(KEY.seedVer, SEED_VERSION);
  }

  function load(key, seed) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    const copy = JSON.parse(JSON.stringify(seed));
    localStorage.setItem(key, JSON.stringify(copy));
    return copy;
  }
  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  // 메모리 캐시 (편집 시 즉시 반영용)
  let MEMBERS = load(KEY.members, D.seedMembers);
  let EVENTS  = load(KEY.events,  D.seedEvents);
  let ARCHIVE = load(KEY.archive, D.seedArchive);
  let RSVP    = load(KEY.rsvp,    D.seedRsvp);

  function persistMembers() { save(KEY.members, MEMBERS); }
  function persistEvents()  { save(KEY.events, EVENTS); }
  function persistArchive() { save(KEY.archive, ARCHIVE); }
  function persistRsvp()    { save(KEY.rsvp, RSVP); }

  /* ---------- Auth helpers ---------- */
  function getUser() {
    const id = localStorage.getItem(KEY.user);
    return MEMBERS.find((m) => m.id === id) || null;
  }
  function setUser(id) {
    if (id) localStorage.setItem(KEY.user, id);
    else localStorage.removeItem(KEY.user);
    applyAuthState();
  }
  function isAdmin() { return !!getUser()?.isAdmin; }

  /* ---------- DOM helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  function openModal(id) { $('#' + id).classList.remove('hidden'); }
  function closeAll() { $$('.modal').forEach((m) => m.classList.add('hidden')); }

  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.add('hidden'), 1900);
  }

  function applyAuthState() {
    const u = getUser();
    document.body.classList.toggle('is-member', !!u);
    document.body.classList.toggle('is-admin', isAdmin());
    $('#hello').classList.toggle('hidden', !u);
    $('#loginBtn').classList.toggle('hidden', !!u);
    $('#signupBtn').classList.toggle('hidden', !!u);
    $('#logoutBtn').classList.toggle('hidden', !u);
    $('#adminBadge').classList.toggle('hidden', !isAdmin());
    if (u) $('#hello-name').textContent = u.name;
    renderNextMeeting();
    renderArchive();
  }

  /* ==========================================================
   * Auth modal — login + signup tabs
   * ========================================================== */
  function renderMemberPick() {
    const wrap = $('#memberPick');
    wrap.innerHTML = MEMBERS.map((m) => `
      <button class="member-card" data-id="${m.id}">
        <div class="nm">${m.name}${m.isAdmin ? ' <span class="role-pill">관리자</span>' : ''}</div>
        <div class="ro">${m.role}</div>
      </button>
    `).join('');
  }

  function setupAuthModal() {
    renderMemberPick();

    // 탭 전환
    $$('.auth-tab').forEach((t) => {
      t.addEventListener('click', () => {
        const key = t.dataset.auth;
        $$('.auth-tab').forEach((b) => b.classList.toggle('active', b === t));
        $$('.auth-panel').forEach((p) => p.classList.toggle('active', p.dataset.auth === key));
        $('#authTitle').textContent = key === 'signup' ? '회원가입 신청' : '회원 로그인';
      });
    });

    // 로그인 (회원 카드 클릭)
    $('#memberPick').addEventListener('click', (e) => {
      const btn = e.target.closest('.member-card');
      if (!btn) return;
      setUser(btn.dataset.id);
      closeAll();
      const u = getUser();
      toast(u.isAdmin ? `${u.name} 님 (관리자)으로 입장했어요` : `${u.name} 님으로 로그인했어요`);
    });

    // 진입 버튼들
    $('#loginBtn').addEventListener('click', () => {
      switchAuthTab('login');
      openModal('authModal');
    });
    $('#signupBtn').addEventListener('click', () => {
      switchAuthTab('signup');
      openModal('authModal');
    });
    $('#logoutBtn').addEventListener('click', () => {
      const name = getUser()?.name;
      setUser(null);
      toast(name ? `${name} 님 로그아웃되었어요` : '로그아웃되었어요');
    });

    // 회원가입 폼
    $('#signupForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = fd.get('name').trim();
      const family = fd.get('family');
      const code = fd.get('code').trim();

      if (code !== D.SIGNUP_CODE) {
        toast('가입 코드가 올바르지 않아요');
        return;
      }
      if (MEMBERS.some((m) => m.name === name)) {
        toast('같은 이름이 이미 있어요. 별명을 추가해 주세요.');
        return;
      }
      const id = 'u' + Date.now().toString(36);
      const newMember = { id, name, role: family, isAdmin: false };
      MEMBERS.push(newMember);
      persistMembers();
      renderMemberPick();
      setUser(id);
      e.target.reset();
      switchAuthTab('login');
      closeAll();
      toast(`${name} 님 환영해요! 디적디적에 가입되었어요 🎉`);
    });

    // 닫기 핸들
    $$('[data-close]').forEach((el) => {
      el.addEventListener('click', closeAll);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });
  }

  function switchAuthTab(key) {
    $$('.auth-tab').forEach((b) => b.classList.toggle('active', b.dataset.auth === key));
    $$('.auth-panel').forEach((p) => p.classList.toggle('active', p.dataset.auth === key));
    $('#authTitle').textContent = key === 'signup' ? '회원가입 신청' : '회원 로그인';
  }

  /* ==========================================================
   * Tabs (portfolio)
   * ========================================================== */
  function setupTabs() {
    $$('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('.tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const key = tab.dataset.tab;
        $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.dataset.tab === key));
      });
    });
  }

  /* ==========================================================
   * Calendar
   * ========================================================== */
  function eventToFc(ev) {
    const cls =
      ev.type === 'meet' ? 'ev-meet' :
      ev.type === 'camp' ? 'ev-camp' : 'ev-board';
    return {
      id: ev.id,
      title: ev.title,
      start: ev.date,
      end: ev.endDate || undefined,
      allDay: true,
      classNames: [cls],
      extendedProps: ev,
    };
  }

  let mainCal, miniCal;
  function refreshCalendars() {
    const fcEvents = EVENTS.map(eventToFc);
    [mainCal, miniCal].forEach((cal) => {
      if (!cal) return;
      cal.removeAllEvents();
      fcEvents.forEach((e) => cal.addEvent(e));
    });
  }

  function setupCalendars() {
    const fcEvents = EVENTS.map(eventToFc);

    mainCal = new FullCalendar.Calendar($('#calendar'), {
      locale: 'ko',
      initialView: 'dayGridMonth',
      initialDate: '2026-05-02',
      height: 'auto',
      headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
      events: fcEvents,
      eventClick: (info) => {
        info.jsEvent.preventDefault();
        showEventModal(info.event.extendedProps);
      },
      dateClick: (info) => {
        const ev = EVENTS.find((e) => e.date === info.dateStr);
        if (ev) showEventModal(ev);
        else if (isAdmin()) openEventEditor(null, info.dateStr);
      },
    });
    mainCal.render();

    miniCal = new FullCalendar.Calendar($('#miniCal'), {
      locale: 'ko',
      initialView: 'dayGridMonth',
      initialDate: '2026-05-02',
      height: 280,
      headerToolbar: { left: 'prev', center: 'title', right: 'next' },
      events: fcEvents,
      eventDisplay: 'background',
      dayHeaderFormat: { weekday: 'narrow' },
      eventClick: (info) => {
        info.jsEvent.preventDefault();
        showEventModal(info.event.extendedProps);
      },
      dateClick: (info) => {
        const ev = EVENTS.find((e) => e.date === info.dateStr);
        if (ev) showEventModal(ev);
      },
    });
    miniCal.render();
  }

  /* ==========================================================
   * Event detail modal + RSVP
   * ========================================================== */
  let activeEventId = null;
  function showEventModal(ev) {
    activeEventId = ev.id;
    $('#evTitle').textContent = ev.title;
    $('#evMeta').innerHTML = `
      <span>📅 ${formatDate(ev.date)}${ev.endDate ? ` ~ ${formatDate(ev.endDate)}` : ''}</span>
      <span>⏰ ${ev.time || '시간 미정'}</span>
      <span>📍 ${ev.where || '장소 미정'}</span>
      <span>${typeBadge(ev.type)}</span>
    `;
    $('#evDesc').textContent = ev.desc || '';
    const member = getUser();
    $('#rsvpBox').classList.toggle('hidden', !member);
    $('#rsvpGuestNote').classList.toggle('hidden', !!member);
    if (member) renderRsvp(ev.id);
    openModal('eventModal');
  }

  function typeBadge(t) {
    if (t === 'meet') return '🟠 정기모임';
    if (t === 'camp') return '🟢 캠프';
    return '🟡 운영진';
  }
  function formatDate(s) {
    const d = new Date(s);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }

  function renderRsvp(eventId) {
    const me = getUser();
    const myStatus = RSVP[eventId]?.[me.id] || null;

    $$('#rsvpBox .r-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.rsvp === myStatus);
    });

    const lists = { going: [], no: [], maybe: [] };
    const evState = RSVP[eventId] || {};
    Object.entries(evState).forEach(([memId, status]) => {
      const mem = MEMBERS.find((m) => m.id === memId);
      if (mem && lists[status]) lists[status].push(mem.name);
    });

    const col = (label, key) => `
      <div class="rsvp-col">
        <h5>${label} (${lists[key].length})</h5>
        <ul>${
          lists[key].length
            ? lists[key].map((n) => `<li>· ${n}</li>`).join('')
            : '<li class="none">아직 없어요</li>'
        }</ul>
      </div>
    `;
    $('#rsvpLists').innerHTML = col('참석', 'going') + col('불참', 'no') + col('미정', 'maybe');
  }

  function setupRsvpButtons() {
    $$('#rsvpBox .r-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const me = getUser();
        if (!me || !activeEventId) return;
        if (!RSVP[activeEventId]) RSVP[activeEventId] = {};
        const next = btn.dataset.rsvp;
        if (RSVP[activeEventId][me.id] === next) {
          delete RSVP[activeEventId][me.id];
        } else {
          RSVP[activeEventId][me.id] = next;
        }
        persistRsvp();
        renderRsvp(activeEventId);
        renderNextMeeting();
        const label = { going: '참석', no: '불참', maybe: '미정' }[next];
        toast(`${label}으로 업데이트했어요`);
      });
    });
  }

  /* ==========================================================
   * Admin — Event CRUD
   * ========================================================== */
  function setupEventAdmin() {
    $('#addEventBtn').addEventListener('click', () => openEventEditor(null));
    $('#editEventBtn').addEventListener('click', () => {
      const ev = EVENTS.find((e) => e.id === activeEventId);
      if (ev) openEventEditor(ev);
    });
    $('#deleteEventBtn').addEventListener('click', () => {
      const ev = EVENTS.find((e) => e.id === activeEventId);
      if (!ev) return;
      askConfirm(
        `“${ev.title}” 일정을 삭제할까요?`,
        '관련 출석 데이터도 함께 사라집니다.',
        () => {
          EVENTS = EVENTS.filter((e) => e.id !== ev.id);
          delete RSVP[ev.id];
          persistEvents(); persistRsvp();
          refreshCalendars();
          renderNextMeeting();
          closeAll();
          toast('일정을 삭제했어요');
        }
      );
    });

    $('#eventEditForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const id = fd.get('id') || ('ev-' + Date.now().toString(36));
      const updated = {
        id,
        title: fd.get('title').trim(),
        date: fd.get('date'),
        endDate: fd.get('endDate') || undefined,
        time: fd.get('time').trim(),
        where: fd.get('where').trim(),
        type: fd.get('type'),
        desc: fd.get('desc').trim(),
      };
      const idx = EVENTS.findIndex((x) => x.id === id);
      if (idx >= 0) EVENTS[idx] = updated;
      else EVENTS.push(updated);
      persistEvents();
      refreshCalendars();
      renderNextMeeting();
      closeAll();
      toast(idx >= 0 ? '일정을 수정했어요' : '일정을 추가했어요');
    });
  }

  function openEventEditor(ev, prefilledDate) {
    $('#evEditTitle').textContent = ev ? '일정 수정' : '일정 추가';
    const f = $('#eventEditForm');
    f.reset();
    f.id.value = ev?.id || '';
    f.title.value = ev?.title || '';
    f.date.value = ev?.date || prefilledDate || '';
    f.endDate.value = ev?.endDate || '';
    f.time.value = ev?.time || '';
    f.where.value = ev?.where || '';
    f.type.value = ev?.type || 'meet';
    f.desc.value = ev?.desc || '';
    closeAll();
    openModal('eventEditModal');
  }

  /* ==========================================================
   * Next meeting card
   * ========================================================== */
  function renderNextMeeting() {
    const today = new Date('2026-05-02'); // 데모 기준일
    const upcoming = EVENTS
      .filter((e) => new Date(e.date) >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const box = $('#nextMeeting');
    if (!upcoming) {
      box.innerHTML = '<p class="muted">예정된 일정이 없어요.</p>';
      box.onclick = null; box.style.cursor = '';
      return;
    }

    const evState = RSVP[upcoming.id] || {};
    const goingCount = Object.values(evState).filter((v) => v === 'going').length;
    const me = getUser();
    const my = me ? evState[me.id] : null;

    const myPill = me
      ? `<span class="pill">내 상태: <strong>${
          my === 'going' ? '참석' : my === 'no' ? '불참' : my === 'maybe' ? '미정' : '미응답'
        }</strong></span>`
      : `<span class="pill muted">로그인 시 참석 토글</span>`;

    box.innerHTML = `
      <div class="nm-title">${upcoming.title}</div>
      <div class="nm-when">${formatDate(upcoming.date)} · ${upcoming.time || '시간 미정'}</div>
      <div class="nm-where">📍 ${upcoming.where || '장소 미정'}</div>
      <div class="nm-act">
        <span class="pill">참석 ${goingCount}명</span>
        ${myPill}
      </div>
    `;
    box.onclick = () => showEventModal(upcoming);
    box.style.cursor = 'pointer';
  }

  /* ==========================================================
   * Archive list + admin CRUD
   * ========================================================== */
  let archiveTag = 'all';
  let archiveQuery = '';
  function renderArchive() {
    const list = $('#archiveList');
    if (!list) return;
    const filtered = ARCHIVE.filter((it) => {
      const tagOk = archiveTag === 'all' || it.tags.includes(archiveTag);
      const q = archiveQuery.trim().toLowerCase();
      const txt = (it.title + ' ' + it.summary + ' ' + it.tags.join(' ')).toLowerCase();
      return tagOk && (!q || txt.includes(q));
    }).sort((a, b) => b.date.localeCompare(a.date));

    if (!filtered.length) {
      list.innerHTML = `<p class="muted small">조건에 맞는 기록이 없어요.</p>`;
      return;
    }
    list.innerHTML = filtered.map((it) => `
      <article class="arc-item" data-id="${it.id}">
        <div class="arc-date">${formatDate(it.date)}</div>
        <div class="arc-body">
          <h4>${it.title}</h4>
          <p>${it.summary}</p>
        </div>
        <div class="arc-tags">
          <span class="arc-tag tone-${it.tone === 'formal' ? 'formal' : 'friendly'}">
            ${it.tone === 'formal' ? '개조식' : '친근체'}
          </span>
          ${it.tags.map((t) => `<span class="arc-tag">#${t}</span>`).join('')}
        </div>
        <div class="arc-actions">
          <button class="icon-btn" data-edit="${it.id}" title="수정">✎</button>
          <button class="icon-btn icon-danger" data-del="${it.id}" title="삭제">🗑</button>
        </div>
      </article>
    `).join('');
  }

  function setupArchiveAdmin() {
    $('#addArchiveBtn').addEventListener('click', () => openArchiveEditor(null));

    $('#archiveList').addEventListener('click', (e) => {
      const editId = e.target.closest('[data-edit]')?.dataset.edit;
      const delId  = e.target.closest('[data-del]')?.dataset.del;
      if (editId) {
        const item = ARCHIVE.find((x) => x.id === editId);
        if (item) openArchiveEditor(item);
      } else if (delId) {
        const item = ARCHIVE.find((x) => x.id === delId);
        if (!item) return;
        askConfirm(
          `“${item.title}” 글을 삭제할까요?`,
          '아카이브에서 영구히 사라집니다.',
          () => {
            ARCHIVE = ARCHIVE.filter((x) => x.id !== delId);
            persistArchive();
            renderArchive();
            closeAll();
            toast('아카이브 글을 삭제했어요');
          }
        );
      }
    });

    $('#archiveEditForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const id = fd.get('id') || ('doc-' + Date.now().toString(36));
      const tags = fd.get('tags').split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean);
      const updated = {
        id,
        date: fd.get('date'),
        title: fd.get('title').trim(),
        summary: fd.get('summary').trim(),
        tags,
        tone: fd.get('tone'),
      };
      const idx = ARCHIVE.findIndex((x) => x.id === id);
      if (idx >= 0) ARCHIVE[idx] = updated;
      else ARCHIVE.push(updated);
      persistArchive();
      renderArchive();
      closeAll();
      toast(idx >= 0 ? '글을 수정했어요' : '새 글을 추가했어요');
    });
  }

  function openArchiveEditor(item) {
    $('#arcEditTitle').textContent = item ? '아카이브 글 수정' : '아카이브 글 작성';
    const f = $('#archiveEditForm');
    f.reset();
    f.id.value = item?.id || '';
    f.title.value = item?.title || '';
    f.date.value = item?.date || new Date().toISOString().slice(0, 10);
    f.tone.value = item?.tone || 'formal';
    f.tags.value = (item?.tags || []).join(', ');
    f.summary.value = item?.summary || '';
    closeAll();
    openModal('archiveEditModal');
  }

  function setupArchiveFilters() {
    $('#archiveSearch')?.addEventListener('input', (e) => {
      archiveQuery = e.target.value;
      renderArchive();
    });
    $('#tagChips')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      $$('#tagChips .chip').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      archiveTag = btn.dataset.tag;
      renderArchive();
    });
  }

  /* ==========================================================
   * Confirm modal
   * ========================================================== */
  let confirmCb = null;
  function askConfirm(title, desc, cb) {
    $('#confirmTitle').textContent = title;
    $('#confirmDesc').textContent = desc || '';
    confirmCb = cb;
    openModal('confirmModal');
  }
  function setupConfirm() {
    $('#confirmYes').addEventListener('click', () => {
      const cb = confirmCb;
      confirmCb = null;
      if (cb) cb();
    });
  }

  /* ==========================================================
   * AI search (mock RAG)
   * ========================================================== */
  function pickAi(q) {
    const lower = q.toLowerCase();
    const hit = D.aiSeed.find((s) => s.keys.some((k) => lower.includes(k.toLowerCase())));
    return hit || D.aiFallback;
  }
  function renderAi(q) {
    const out = $('#aiResult');
    if (!q || !q.trim()) { out.innerHTML = ''; return; }
    const ans = pickAi(q);
    const modeLabel = ans.mode === 'formal'
      ? '회의록 기반 · 개조식 (Formal Mode)'
      : '밴드글 기반 · 친근체 (Friendly Mode)';
    const modeCls = ans.mode === 'formal' ? 'mode-formal' : 'mode-friendly';
    const body = ans.bullets
      ? `<ul>${ans.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`
      : `<p>${ans.paragraph || ''}</p>`;
    const sources = (ans.sources || []).length
      ? `<div class="ai-source">📎 근거 데이터:
          ${ans.sources.map((s) => `<strong>${s.label}</strong> [${s.tag}]`).join(' · ')}
        </div>`
      : '';
    out.innerHTML = `
      <span class="ai-mode ${modeCls}">${modeLabel}</span>
      <h4>${ans.title}</h4>
      ${body}
      ${sources}
    `;
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function setupAi() {
    $('#aiForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      renderAi($('#aiQuery').value);
    });
    $$('.ghost-chip').forEach((b) => {
      b.addEventListener('click', () => {
        $('#aiQuery').value = b.dataset.q;
        renderAi(b.dataset.q);
      });
    });
  }

  /* ---------- Member-only nav guard ---------- */
  function setupNavGuard() {
    $$('a[data-member-only]').forEach((a) => {
      a.addEventListener('click', (e) => {
        if (!getUser()) {
          e.preventDefault();
          toast('로그인 후 이용할 수 있어요');
          openModal('authModal');
        }
      });
    });
  }

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    setupAuthModal();
    setupTabs();
    setupCalendars();
    setupRsvpButtons();
    setupEventAdmin();
    setupArchiveAdmin();
    setupArchiveFilters();
    setupConfirm();
    setupAi();
    setupNavGuard();
    applyAuthState();
  });
})();
