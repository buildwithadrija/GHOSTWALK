/* ─────────────────────────────────────────────────────────────────────────────
   GHOSTWALK — Ghost AI client.

   This is the explanation layer on top of the existing investigation engine.
   It is deliberately NOT a chatbot and deliberately NOT a second detector.

   What it does
     · knows where the user is, which control they are on and what stage they
       are at, so it can explain the screen in front of them
     · turns finding codes from the engine into plain-language answers
     · offers three fixed questions: Explain simply / Why does this matter? /
       What should I do next?
     · sends the minimum to the server: UI context, finding codes, and — only
       when it improves the explanation and the user consents — text that the
       server has redacted. It never sends raw identifiers.
     · always has a complete, already-translated deterministic answer to show
       while the AI works, and to fall back to if the AI is unavailable.

   What it never does
     · never invents a finding, never states a verdict
     · never sends an OTP, PIN, password or card security code
     · never stores conversation history beyond the current page view
     · never asks "ask me anything": off-topic questions get a fixed answer
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (window.GhostAI) return;

  const T = (k) => { try { return typeof window.__tr === 'function' ? window.__tr(k) : k; } catch { return k; } };
  const lang = () => { try { return window.siteLang ? window.siteLang() : 'en'; } catch { return 'en'; } };
  const voiceOn = () => { try { return localStorage.getItem('gw_voice') === 'on'; } catch { return false; } };

  /* session-only: cleared on reload, never written to localStorage, no profile,
     no scam history, no retained case data */
  const session = { lastIntent: null, lastCodes: [], aiEnabled: null, pending: 0 };

  /* the 14 concepts lib/ghost-notes.js can report, plus the verdict states.
     Order matters only for readability. */
  const CONCEPTS = ['payment_destination', 'withdrawal_trap', 'redirect_identity',
    'lookalike_address', 'transport_security', 'credentials_request', 'device_control',
    'app_install', 'new_domain', 'pressure', 'deception', 'off_channel',
    'escalation', 'unreachable'];

  const PAGE_OF = () => {
    const p = location.pathname;
    if (/message/.test(p)) return 'check-message';
    if (/ghost/.test(p)) return 'walk-link';
    if (/qr/.test(p)) return 'qr';
    if (/trusted/.test(p)) return 'trusted-contact';
    if (/recovery/.test(p)) return 'already-paid';
    return 'home';
  };

  /* Stage is inferred from what the page currently shows, never from a
     timestamp or a previous visit. */
  function stage() {
    try {
      if (document.querySelector('.ev-list, #resultBox, .verdict.red, .verdict.yellow')) return 'result-ready';
      if (document.querySelector('[data-ghost-start]:not([disabled])')) return 'before-investigation';
      if (document.querySelector('form, input, textarea, [contenteditable]')) return 'ready-for-input';
    } catch {}
    return 'idle';
  }

  function activeControl() {
    try {
      const a = document.activeElement;
      const guided = a && a.closest ? a.closest('[data-ghost-guide]') : null;
      if (guided) {
        const txt = (guided.getAttribute('data-ghost-say') || guided.getAttribute('aria-label')
          || guided.textContent || '').replace(/\s+/g, ' ').trim();
        return txt.slice(0, 60);
      }
      const tag = a && a.tagName ? a.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        const ph = (a.getAttribute('placeholder') || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
        return ph.slice(0, 60) || tag;
      }
    } catch {}
    return null;
  }

  /* Result codes come from the engine responses the pages already hold. Pages
     publish them on window.GW_FINDINGS; if none was published we stay silent
     rather than guessing. */
  function findings() {
    try {
      const f = window.GW_FINDINGS || null;
      if (f && Array.isArray(f.codes)) {
        return { codes: f.codes.slice(0, 12), verdict: f.verdict || null };
      }
    } catch {}
    return { codes: session.lastCodes, verdict: null };
  }

  /* ── deterministic explanation (always available, already translated) ─────
     Picks the single most serious concept present and answers from the local
     pack. No network, no AI, no English mixing. */
  const SEVERITY = ['payment_destination', 'withdrawal_trap', 'credentials_request',
    'redirect_identity', 'lookalike_address', 'device_control', 'app_install',
    'new_domain', 'deception', 'pressure', 'escalation', 'off_channel',
    'transport_security', 'unreachable'];

  /* Raw finding ids -> concepts, straight from the server's own table so the
     built-in answer and the grounded AI answer can never disagree. Loaded once,
     in the background, and never blocking: the verdict answer works without it. */
  let CONCEPT_MAP = null;
  async function loadConcepts() {
    if (CONCEPT_MAP) return CONCEPT_MAP;
    try {
      const res = await fetch('/api/ghost/ai/status');
      const d = await res.json();
      if (d && d.concepts && typeof d.concepts === 'object') CONCEPT_MAP = d.concepts;
    } catch { /* built-in answer stays available */ }
    return CONCEPT_MAP;
  }

  function deterministic(intent, codes, verdict) {
    const parts = [];
    let concept = null;
    const map = CONCEPT_MAP || {};
    for (const s of SEVERITY) {
      /* accept either a concept or any raw finding id that maps to it */
      if (codes.indexOf(s) !== -1 || codes.some(c => map[c] === s)) { concept = s; break; }
    }

    /* 'control' and 'overview' reuse the simple pack: they answer from the
       same translated copy, differing only in the UI context the AI receives */
    const pack = (intent === 'control' || intent === 'overview') ? 'simple' : intent;
    const vd = verdict === 'RED' ? 'red' : (verdict === 'YELLOW' ? 'yellow' : 'none');
    parts.push(T('gd_' + vd + '_' + pack));

    /* per-concept detail only for the three fixed questions, so a summary and a
       deep explanation never say the same thing twice */
    if (concept && pack !== 'simple') {
      const k = 'gc_' + concept + '_' + (pack === 'why' ? 'why' : 'next');
      const v = T(k);
      if (v && v !== k) parts.push(v);
    }
    if (intent === 'next' && vd !== 'none') parts.push(T('ai_never'));
    return parts.join(' ');
  }

  /* ── UI ──────────────────────────────────────────────────────────────────── */
  function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /* Where the answer is rendered. Mounted inside whichever Ghost surface is
     open, or created as a section in the results box if none is. */
  function host() {
    return document.getElementById('gaPanel') ? document.getElementById('gaPanel').querySelector('.ga-pbody')
      || document.getElementById('gaPanel')
      : (document.getElementById('gaTeach') ? document.getElementById('gaTeach').querySelector('.ga-tbubble')
        : null);
  }

  let section = null;
  function ensureSection() {
    let h = host();
    /* no Ghost surface open yet: open the full panel, which is where the
       explanation belongs, then mount there */
    if (!h) {
      try { if (typeof window.__ghostOpenPanel === 'function') window.__ghostOpenPanel(); } catch {}
      h = host();
    }
    if (!h) return null;
    if (section && section.isConnected && section.closest('#gaPanel,#gaTeach')) return section;
    section = el(`<div class="ga-ai" hidden>
      <p class="ga-ai-head"><span class="ga-ai-dot" aria-hidden="true"></span>${esc(T('ai_assisted'))}</p>
      <p class="ga-ai-note">${esc(T('ai_note'))}</p>
      <div class="ga-ai-btns">
        <button class="btn btn-ink btn-sm" data-ai="simple">${esc(T('ai_simple'))}</button>
        <button class="btn btn-paper btn-sm" data-ai="why">${esc(T('ai_why'))}</button>
        <button class="btn btn-paper btn-sm" data-ai="next">${esc(T('ai_next'))}</button>
      </div>
      <div class="ga-ai-out" role="status" aria-live="polite"></div>
      <details class="ga-ai-priv">
        <summary>${esc(T('ai_privacy'))}</summary>
        <p>${esc(T('ai_p1'))}</p>
        <p>${esc(T('ai_p2'))}</p>
        <p>${esc(T('ai_p3'))}</p>
        <p>${esc(T('ai_p4'))}</p>
        <p>${esc(T('ai_p5'))}</p>
        <p class="ga-ai-why"><strong>${esc(T('ai_why_data'))}</strong> ${esc(T('ai_note'))}</p>
      </details>
    </div>`);
    h.appendChild(section);
    section.querySelectorAll('[data-ai]').forEach(b => b.addEventListener('click', () => run(b.dataset.ai)));
    return section;
  }

  function show(sectionEl, text, source) {
    if (!sectionEl) return;
    sectionEl.hidden = false;
    const out = sectionEl.querySelector('.ga-ai-out');
    out.textContent = '';
    const p = document.createElement('p');
    p.className = 'ga-ai-text';
    p.textContent = text;
    out.appendChild(p);
    const tag = document.createElement('p');
    tag.className = 'ga-ai-src';
    tag.textContent = source === 'ai' ? T('ai_src_ai') + ' · ' + T('ai_privacy_short')
      : (T('ai_src_basic') + ' · ' + (session.lastReason ? T('ai_unavail') : ''));
    out.appendChild(tag);
    try { speak(text); } catch {}
  }

  /* atomic replacement: one complete message, never a half-written sentence */
  function showWorking(sectionEl) {
    if (!sectionEl) return;
    sectionEl.hidden = false;
    const out = sectionEl.querySelector('.ga-ai-out');
    out.textContent = '';
    const p = document.createElement('p');
    p.className = 'ga-ai-text ga-ai-wait';
    p.textContent = T('ai_working');
    out.appendChild(p);
  }

  function speak(text) {
    if (!voiceOn() || !text) return;
    try {
      const say = window.speechText ? window.speechText(text) : text;
      if (typeof window.speak === 'function') window.speak(say, lang());
    } catch {}
  }

  /* ── off-topic guard: this is not a chatbot ────────────────────────────── */
  const OFFTOPIC = /\b(stock|share|shares|equity|mutual fund|crypto|bitcoin|trading|trade|invest in|which company should|market|tip|lottery|loan against|portfolio)\b/i;
  function looksOffTopic(q) { return OFFTOPIC.test(String(q || '')); }

  /* ── the request ───────────────────────────────────────────────────────── */
  /* Asks the server which categories of sensitive data are present. The reply
   contains category names only - never the text, never the values. */
  async function precheck(text) {
    try {
      const res = await fetch('/api/ghost/explain/precheck', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const d = await res.json().catch(() => null);
      return d && d.ok ? d : null;
    } catch { return null; }
  }

  let inflight = 0;
  async function run(intent) {
    const sec = ensureSection();
    if (!sec) return;
    const f = findings();
    session.lastIntent = intent;
    session.lastCodes = f.codes;

    /* always show something immediately and complete */
    showWorking(sec);

    /* the id->concept table is static and cached for the session; a failure here
       only costs per-concept detail, never the answer */
    if (!CONCEPT_MAP) {
      try { await loadConcepts(); } catch {}
      if (inflight === 0) { /* fall through */ }
    }

    /* user-visible language must match the app language exactly */
    const code = lang();
    const body = {
      intent,
      lang: code,
      guidance: 'standard',
      page: PAGE_OF(),
      stage: stage(),
      control: session.lastControl || activeControl(),
      voiceEnabled: voiceOn(),
      findingCodes: f.codes,
      verdict: f.verdict,
    };
    session.lastControl = null;

    /* Optional evidence, in two clearly separated modes:
         entities - no user prose at all, only booleans the model needs. This is
                    the default and needs no consent, because nothing the user
                    wrote leaves the device.
         redact   - the sentence shape with every identifier replaced, so
                    manipulation patterns survive. Only used after the user has
                    explicitly agreed, and only when credentials were detected.
       The client never decides which mode is safe: the server's privacy layer
       reports the categories found, and the server sanitizes again regardless. */
    const ev = window.GW_EVIDENCE_TEXT;
    if (typeof ev === 'string' && ev.trim()) {
      const pre = await precheck(ev);
      if (pre && pre.needsConsent) { askConsent(sec, intent, body, ev, pre); return; }
      body.evidenceText = ev;
      body.evidenceMode = 'entities';
    }

    const my = ++inflight;
    try {
      const res = await fetch('/api/ghost/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (my !== inflight) return; /* a newer question won */

      if (data.needsConsent) { askConsent(sec, intent, body, null, data); return; }

      if (data.ok && data.text) {
        show(sec, data.text, 'ai');
        return;
      }
      session.lastReason = data.reason || 'unavailable';
      show(sec, deterministic(intent, f.codes, f.verdict), 'basic');
    } catch {
      if (my !== inflight) return;
      session.lastReason = 'network';
      show(sec, deterministic(intent, f.codes, f.verdict), 'basic');
    }
  }

  /* Explicit, specific consent for the only case where the user's own words are
     processed: never a vague "Accept AI". Declining uses the built-in
     explanation, which needs no consent at all. */
  function askConsent(sec, intent, body, evidenceText, found) {
    const out = sec.querySelector('.ga-ai-out');
    out.textContent = '';
    const q = document.createElement('p');
    q.className = 'ga-ai-text';
    q.textContent = T('ai_consent_q');
    out.appendChild(q);
    const cats = document.createElement('p');
    cats.className = 'ga-ai-src';
    cats.textContent = (found.removed || []).join(', ') + ' · ' + T('ai_privacy_short');
    out.appendChild(cats);
    const row = document.createElement('div');
    row.className = 'ga-ai-btns';
    const yes = document.createElement('button');
    yes.className = 'btn btn-ink btn-sm';
    yes.textContent = T('ai_consent_yes');
    yes.addEventListener('click', async () => {
      yes.disabled = true;
      showWorking(sec);
      /* only now is redacted prose requested; the server removes the
         credential values again on the way in */
      const b2 = Object.assign({}, body, { consent: true, evidenceMode: 'redact' });
      if (evidenceText) b2.evidenceText = evidenceText;
      const f = findings();
      try {
        const res = await fetch('/api/ghost/explain', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(b2),
        });
        const data = await res.json().catch(() => ({}));
        if (data.ok && data.text) show(sec, data.text, 'ai');
        else { session.lastReason = data.reason || 'unavailable'; show(sec, deterministic(intent, f.codes, f.verdict), 'basic'); }
      } catch { show(sec, deterministic(intent, f.codes, f.verdict), 'basic'); }
    });
    const no = document.createElement('button');
    no.className = 'btn btn-paper btn-sm';
    no.textContent = T('ai_consent_no');
    no.addEventListener('click', () => {
      const f = findings();
      show(sec, deterministic(intent, f.codes, f.verdict), 'basic');
    });
    row.appendChild(yes); row.appendChild(no);
    out.appendChild(row);
  }

  /* ── public surface ────────────────────────────────────────────────────── */
  const api = {
    /* Explain This Option becomes AI-aware without leaving the guided flow:
       the AI knows which control the user is on and which stage they are at. */
    explain(intent, opts) {
      const o = opts || {};
      if (o.question && looksOffTopic(o.question)) return T('ai_offtopic');
      /* a tapped control names itself: the AI answers about that exact control,
         in the current stage, with the current findings */
      if (typeof o.control === 'string' && o.control.trim()) {
        session.lastControl = o.control.trim().slice(0, 60);
      }
      const sec = ensureSection();
      if (!sec) return deterministic(intent || 'overview', findings().codes, findings().verdict);
      run(intent || 'overview');
      return null;
    },
    open() { const s = ensureSection(); if (s) s.hidden = false; },
    uiContext() {
      const f = findings();
      return { page: PAGE_OF(), stage: stage(), control: activeControl(), language: lang(), voiceEnabled: voiceOn(), codes: f.codes, verdict: f.verdict };
    },
    /* exposed for tests and for the menu's privacy section */
    deterministic, looksOffTopic, CONCEPTS, session,
  };
  window.GhostAI = api;

  /* language change: re-render in the new language and drop any answer that is
     still in the previous one */
  window.addEventListener('gw-lang', () => {
    inflight++;
    const sec = section;
    if (sec && sec.isConnected) {
      const keep = session.lastIntent;
      sec.remove();
      section = null;
      const fresh = ensureSection();
      if (fresh && keep) {
        const f = findings();
        show(fresh, deterministic(keep, f.codes, f.verdict), 'basic');
      }
    }
  });
})();