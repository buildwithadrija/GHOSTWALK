/* GHOSTWALK shared core — used by every page. Real /api/* calls, on-page fallback if server unreachable. */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function siteLang() { return (window.GW && window.GW.lang) || 'en'; }
function srvLang() { return ({ hi: 'hi', bn: 'bn', mr: 'mr' })[siteLang()] || 'en'; }
function show(s) { $(s).classList.remove('hidden'); }
function hide(s) { $(s).classList.add('hidden'); }
function shake(el) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = 'shakeX .4s'; el.focus(); }
function setBusy(sel, b) { const el = $(sel); if (!el) return; el.disabled = b; el.style.opacity = b ? '.65' : '1'; el.style.pointerEvents = b ? 'none' : 'auto'; }
function toast(m) {
  const d = document.createElement('div'); d.textContent = m;
  d.style.cssText = 'position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:#1C2130;color:#FFE9B8;padding:.7rem 1.2rem;border-radius:999px;z-index:99;font-size:.88rem;border:2px solid #FFD66B';
  document.body.appendChild(d); setTimeout(() => d.remove(), 3200);
}
const _st = document.createElement('style');
_st.textContent = '@keyframes shakeX{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}';
document.head.appendChild(_st);

/* Scam-warning marquee. The items are assembled in JS, so they are served from
   MARQUEE_PRE when a translation exists. Localised items get data-keep so the document
   translation pass skips them entirely: the copy is already final and never needs a
   network call. Untranslated languages fall back to the English list, which the pass can
   still machine-translate like any other text node. */
const GW_MARQUEE_EN = ['GUARANTEED RETURNS', '"UNLOCK FEE" BEFORE WITHDRAWAL', 'LIMITED SLOTS', "DON'T TELL ANYONE",
  'FAKE PROFIT SCREENSHOTS', 'TELEGRAM VIP GROUP', 'APK INSTALL PUSH', 'SCREEN-SHARE REQUEST',
  'UPI TO A PERSONAL NAME', 'REDIRECT \u2192 DIFFERENT SITE'];

function applyMarquee() {
  const mt = $('#marqueeTrack');
  if (!mt) return;
  const localized = window.MARQUEE_PRE && window.MARQUEE_PRE[siteLang()];
  const items = localized && localized.length ? localized : GW_MARQUEE_EN;
  // one span per item so each is a small standalone unit, duplicated for a seamless loop
  const keep = localized && localized.length ? ' data-keep' : '';
  const t = items.map(i => `<span${keep}>👻 ${esc(i)} &nbsp;·&nbsp; </span>`).join('');
  mt.innerHTML = t + t;
}
/* applyLang dispatches gw-lang before the translation pass runs, so rebuilding here keeps
   the marquee in the newly selected language with no second request. */
try { window.addEventListener('gw-lang', applyMarquee); } catch {}

/* scroll reveal + marquee + footer year, safe to call on any page */
function initChrome() {
  const io = new IntersectionObserver((es) => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));
  applyMarquee();
  // hover tilt (fine pointers only)
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    $$('.phone, .stamp-card, .hcard, .opt-card').forEach(el => {
      el.classList.add('tilt');
      let raf = null;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => { el.style.transform = `perspective(700px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`; });
      });
      el.addEventListener('mouseleave', () => { cancelAnimationFrame(raf); el.style.transform = ''; });
    });
  }
}

/* ── API layer ── */
let API_OK = false;
async function initApi(statusEl) {
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    if (!r.ok) throw 0;
    API_OK = true;
    if (statusEl) { statusEl.querySelector('.api-dot')?.classList.add('ok'); statusEl.querySelector('span:last-child').textContent = 'Connected — live server API.'; }
  } catch {
    if (statusEl) { statusEl.querySelector('.api-dot')?.classList.add('bad'); statusEl.querySelector('span:last-child').textContent = 'Offline preview mode — run “npm start” for full server analysis.'; }
  }
}

const LOCAL_RX = [
  [/guarantee|assured|risk-free|double|2x|\d{2,3}\s?%.*(return|profit)|sure profit|no loss/i, 'Guaranteed / unusually high returns', 'Promises of guaranteed or very high returns. Genuine investments always carry risk.'],
  [/unlock.*withdraw|pay.*to withdraw|withdrawal (fee|tax)|deposit.*to (withdraw|release|unlock)|security fee/i, 'Payment demanded to “unlock” withdrawal', 'Another payment is demanded before you can withdraw your own money. Do not send more.'],
  [/urgent|immediately|right now|hurry|last chance|today only|slots? closing|expire/i, 'Urgency / pressure', 'Artificial urgency to stop you asking someone you trust.'],
  [/limited slots?|only \d+.*left|vip|exclusive|selected/i, '“Limited / VIP” lure', '“Exclusive” framing borrows trust. Real offers are not pushed this way.'],
  [/don'?t tell|keep.*secret|between us|only for you/i, 'Secrecy request', 'Asking for secrecy cuts off your best protection — a second opinion.'],
  [/telegram|private.*group|share.*screen|anydesk|teamviewer|screen[\s-]?shar/i, 'Off-channel / screen-share push', 'Private chats and screen-sharing remove records and oversight.'],
  [/testimon|profit screenshot|payout proof|everyone.*earning/i, 'Testimonials / social proof', 'Screenshots of “others earning” are trivially faked.'],
  [/upi|gpay|phonepe|qr|send.*screenshot.*payment|pay to.*@/i, 'Direct UPI / QR push', 'Money pushed to a personal UPI ID. Check the exact recipient name.'],
  [/sebi.*approv|govt.*approv|rbi|nse|bse|official.*scheme/i, 'Authority name-drop', 'Big names are borrowed, not proven. Verify outside this chat.'],
  [/send.*again|one more (payment|deposit)|balance.*stuck|account.*frozen|invest more|upgrade.*plan/i, 'Escalation / repeat deposits', 'Each “next step” raises what you stand to lose.'],
];
function localAnalyze(text, lang) {
  const hits = [];
  LOCAL_RX.forEach(([rx, label, explain], i) => {
    const m = text.match(rx);
    if (m) hits.push({ label, explain, severity: i < 2 ? 'critical' : 'high', evidence: '…' + text.slice(Math.max(0, (m.index || 0) - 50), (m.index || 0) + m[0].length + 50).replace(/\s+/g, ' ') + '…' });
  });
  const urls = (text.match(/https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+|upi:\/\/[^\s<>"')\]]+/gi) || []).slice(0, 8);
  const verdict = hits.length ? 'RED' : 'YELLOW';
  const T = { hi: ['रुकें — अभी पैसे न भेजें।', 'खतरनाक संकेत दिखे हैं। पैसे, OTP या बैंक जानकारी न भेजें।'], bn: ['থামুন — এখন টাকা পাঠাবেন না।', 'বিপজ্জনক আচরণ দেখা গেছে। টাকা বা OTP দেবেন না।'], mr: ['थांबा — आत्ता पैसे पाठवू नका.', 'धोकादायक वर्तन आढळले आहे. पैसे किंवा OTP देऊ नका.'] }[lang];
  return {
    verdict, patterns: hits, urls,
    title: verdict === 'RED' ? (T ? T[0] : 'STOP — Do not pay yet.') : 'NOT VERIFIED — Do not pay yet.',
    subtitle: verdict === 'RED' ? (T ? T[1] : 'Dangerous behaviour was observed in what you forwarded.') : 'We could not establish enough to trust this. Automated checks cannot see everything. Do not pay yet.',
    ask_trusted: 'Would you like someone you trust to look at this with you?'
  };
}

async function callAnalyze(text, lang, amount) {
  if (API_OK) {
    const r = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, lang, amount }) });
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    return d;
  }
  return localAnalyze(text, lang);
}
async function callGhost(url, upi) {
  if (API_OK) {
    const r = await fetch('/api/ghost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, upi }) });
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    return d;
  }
  return { steps: [{ node: 'MESSAGE RECEIVED', detail: 'Ghost picked up the link. You did not have to open it.', tone: 'info' }, { node: 'GHOST STOPPED', detail: 'Offline preview: treat as NOT VERIFIED. Run “npm start” for a live walk.', tone: 'stop' }], flags: [], domains: [], target: url || upi, verdict: 'YELLOW' };
}
async function callRecovery(events, amount, channel, lang) {
  if (API_OK) {
    const r = await fetch('/api/recovery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events, amount, channel, lang }) });
    return (await r.json()).pack;
  }
  return ['GHOSTWALK — Scam Incident Pack (offline draft)', '', ...events.map((e, i) => `${i + 1}. [${e.when}] ${e.what}`), '', 'Keep screenshots, UTR numbers, UPI IDs. Consider: stop payments, tell family, call bank helpdesk, helpline 1930 / cybercrime.gov.in.'].join('\n');
}

/* translate freshly painted dynamic content in place (evidence stays raw via
   data-keep); a delayed second pass covers an in-flight full-page translation */
function translateBox(box) {
  try {
    if (!box || !window.translateNode || !window.GW || window.GW.lang === 'en') return;
    const p = window.translateNode(box);
    if (p && p.catch) p.catch(() => {});
    const retry = () => { try { const q = window.translateNode(box); if (q && q.catch) q.catch(() => {}); } catch {} };
    setTimeout(retry, 4000);
    setTimeout(retry, 9000);
  } catch {}
}
/* Publishes what the investigation engine observed, as codes only. The Ghost AI
   layer reads this. Labels, evidence quotes and user text are deliberately not
   included: the model must never receive them. */
function publishFindings(d) {
  try {
    const seen = [];
    /* A fresh verdict replaces the previous result. Merging old codes into a new
       investigation would let the Ghost explain warnings that are no longer
       present, so only appendGhostFlags() (same journey, later step) may merge. */
    const prev = (d && d.merge) && (window.__gwFindings && window.__gwFindings.codes) || [];
    for (const c of prev) if (seen.indexOf(c) === -1) seen.push(c);
    for (const p of (d && d.patterns) || []) {
      const id = typeof p === 'string' ? p : (p && p.id);
      if (id && seen.indexOf(id) === -1) seen.push(id);
    }
    window.__gwFindings = { codes: seen.slice(0, 12), verdict: (d && d.verdict) || 'NONE' };
    window.GW_FINDINGS = window.__gwFindings;
  } catch {}
}

/* shared verdict painter (RED or YELLOW only — never green) — */
function paintVerdict(box, d) {
  const card = box.querySelector('.verdict');
  card.className = 'verdict ' + (d.verdict === 'RED' ? 'red' : 'amber');
  const stamp = box.querySelector('.verdict-stamp');
  stamp.textContent = d.verdict === 'RED' ? '🛑 STOP — DO NOT PAY' : '⚠️ NOT VERIFIED — DO NOT PAY YET';
  stamp.style.animation = 'none'; void stamp.offsetWidth; stamp.style.animation = '';
  box.querySelector('.verdict-title').textContent = d.title;
  box.querySelector('.verdict-sub').textContent = d.subtitle + ' ' + (d.ask_trusted || '');
  /* Publish the engine's finding codes for the Ghost AI explanation layer.
     Only codes and the state are published — never the user's text. The Ghost
     reads these to explain what the engine observed; it never decides anything
     from them. */
  publishFindings(d);
  const ev = box.querySelector('.ev-list'); ev.innerHTML = '';
  if (!d.patterns || !d.patterns.length) {
    ev.innerHTML = `<div class="ev"><b>No manipulation cue matched this exact text.</b><span class="sev medium">UNCERTAIN</span><p>That is <b>not</b> proof of safety — scam pages often hide from automated checks. Treat as unverified.</p></div>`;
  } else d.patterns.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'ev'; div.style.animationDelay = (i * 0.08) + 's';
    div.innerHTML = `<b>${i + 1}. ${esc(p.label)}</b><span class="sev ${(p.severity || 'high').toLowerCase()}">${esc((p.severity || 'HIGH').toUpperCase())}</span><p>${esc(p.explain || '')}</p>${p.evidence ? `<q data-keep="1">${esc(p.evidence)}</q>` : ''}`;
    ev.appendChild(div);
  });
  const fu = box.querySelector('.found-urls');
  if (fu) {
    if (d.urls && d.urls.length) { fu.classList.remove('hidden'); fu.innerHTML = '🔗 Links found — the ghost can walk the first one: <b data-keep="1">' + d.urls.map(esc).join('</b> · <b data-keep="1">') + '</b>'; }
    else fu.classList.add('hidden');
  }
  translateBox(box);
}

/* append ghost-observed flags into an already-painted verdict box */
function appendGhostFlags(box, flags) {
  publishFindings({ verdict: 'RED', merge: true, patterns: ((window.__gwFindings && window.__gwFindings.codes) || []).concat((flags || []).map(f => ({ id: f.id }))) });
  const ev = box.querySelector('.ev-list');
  flags.forEach((f) => {
    const div = document.createElement('div');
    div.className = 'ev';
    div.innerHTML = `<b>👻 Ghost saw: ${esc(f.label)}</b><span class="sev high">GHOST</span><p>${esc(f.explain || '')}</p>${f.evidence ? `<q data-keep="1">${esc(f.evidence)}</q>` : ''}`;
    ev.appendChild(div);
  });
  if (flags.length) {
    box.querySelector('.verdict').className = 'verdict red';
    box.querySelector('.verdict-stamp').textContent = '🛑 STOP — DO NOT PAY';
    box.querySelector('.verdict-title').textContent = 'STOP — dangerous behaviour was observed.';
    box.querySelector('.verdict-sub').textContent = 'This was walked through safely, so you didn’t have to open it. Please do not proceed or pay. Would you like someone you trust to check this with you?';
  }
  translateBox(box);
}

/* verdict wording with genuine counts — never vague, never "safe" */
function ghostVerdictText(g) {
  const n = (g.flags || []).length;
  const s = g.summary || { clean: 0, total: 0 };
  if (g.verdict === 'RED') {
    const top = g.flags[0] || {};
    return {
      title: `STOP — ${n} reason${n > 1 ? 's' : ''} to stop found.`,
      subtitle: `One clear reason: ${top.label || 'see below'}.${s.total ? ` ${s.clean} of ${s.total} checks looked fine — but the failed ones are what matter. ` : ' '}Please do not proceed or pay.`
    };
  }
  return {
    title: 'NOT VERIFIED — do not pay yet.',
    subtitle: `${s.total ? `${s.clean} of ${s.total} specific checks came back clean, and none failed. ` : ''}That still proves nothing — scam sites routinely show automated visitors a harmless page. Do not pay until independently verified.`
  };
}

/* ── animated ghost-walk replay ── */
async function runReplay(replayBox, data) {
  replayBox.classList.remove('hidden');
  replayBox.querySelectorAll('.checks').forEach(n => n.remove());
  const log = replayBox.querySelector('.glog'); log.innerHTML = '';
  const journey = replayBox.querySelector('.journey');
  journey.querySelectorAll('.jnode').forEach(n => n.remove());
  const ghost = replayBox.querySelector('.journey-ghost');
  const addLog = (text, tone) => {
    const li = document.createElement('li');
    li.className = tone || 'info'; li.textContent = text;
    log.appendChild(li); li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  addLog('Starting the walk… using only fake details, never yours.', 'info');
  const n = Math.max(data.steps.length, 3);
  data.steps.forEach((s, i) => {
    const d = document.createElement('div');
    d.className = 'jnode'; d.style.left = (8 + (i / Math.max(n - 1, 1)) * 84) + '%';
    journey.appendChild(d);
  });
  for (let i = 0; i < data.steps.length; i++) {
    const s = data.steps[i];
    ghost.style.left = `calc(${(8 + (i / Math.max(n - 1, 1)) * 84)}% - 8px)`;
    journey.querySelectorAll('.jnode')[i]?.classList.add('lit');
    addLog(`[${s.node}] ${s.detail}`, s.tone || 'info');
    await new Promise(r => setTimeout(r, 650));
  }
  if (!data.flags || !data.flags.length) addLog('Nothing overtly dangerous visible to the bot — treated as NOT VERIFIED, never "safe".', 'stop');
  // transparency checklist: every concrete point checked, failed first
  if (data.checked && data.checked.length) {
    const box = document.createElement('div');
    box.className = 'checks';
    const bad = data.checked.filter(c => !c.ok), good = data.checked.filter(c => c.ok);
    box.innerHTML = `<b>🔎 What was checked (${data.checked.length})</b>` +
      bad.map(c => `<div class="chk bad"><span class="mk">✗</span><div class="lb"><b>${esc(c.label)}</b></div><div class="dt">${esc(c.detail || '')}</div></div>`).join('') +
      good.map(c => `<div class="chk ok"><span class="mk">✓</span><div class="lb"><b>${esc(c.label)}</b></div><div class="dt">${esc(c.detail || '')}</div></div>`).join('') +
      `<div class="chk-note">✓ only means “nothing wrong found here” — not “this is safe”. Dishonest sites sometimes show automated checks a harmless face.</div>`;
    replayBox.insertBefore(box, replayBox.querySelector('.glog'));
  }
  const meta = replayBox.querySelector('.replay-meta');
  if (meta) meta.textContent = `server-side · synthetic data only · ${(data.domains || []).join(', ') || 'no external host read'}`;
  replayBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  translateBox(replayBox);
}

/* ── voice: best available natural voice, paced delivery, reads the reasons ── */
let _voices = [], _voicesBound = false;
function loadVoices() {
  return new Promise((res) => {
    try {
      if (!_voicesBound && window.speechSynthesis) {
        _voicesBound = true;
        try { speechSynthesis.addEventListener('voiceschanged', () => { try { _voices = speechSynthesis.getVoices() || []; } catch {} }); }
        catch { try { speechSynthesis.onvoiceschanged = () => { try { _voices = speechSynthesis.getVoices() || []; } catch {} }; } catch {} }
      }
      const v = speechSynthesis.getVoices();
      if (v && v.length) { _voices = v; return res(v); }
      setTimeout(() => res((_voices = (function () { try { return speechSynthesis.getVoices() || []; } catch { return []; } })())), 1500);
    } catch { res([]); }
  });
}
function langBase(lang) {
  const direct = { en: 'en', hi: 'hi', bn: 'bn', mr: 'mr', ta: 'ta', te: 'te', gu: 'gu', kn: 'kn', ml: 'ml', pa: 'pa', as: 'as', or: 'or', ur: 'ur', ne: 'ne', sa: 'sa', ks: 'ks', kok: 'kok', mai: 'mai', mni: 'mni', brx: 'brx', doi: 'doi', sat: 'sat', sd: 'sd' };
  if (direct[lang]) return direct[lang];
  try { if (window.speechCode) return String(speechCode()).toLowerCase().split('-')[0] || 'en'; } catch {}
  return 'en';
}
function pickVoice(lang) {
  const want = langBase(lang);
  let wantFull = null;
  try { if (window.speechCode && window.siteLang && siteLang() === lang) wantFull = String(speechCode()).toLowerCase(); } catch {}
  const pool = _voices.filter(v => (v.lang || '').toLowerCase().startsWith(want));
  // prefer exact locale match, then natural-sounding voices within the language
  const exact = pool.filter(v => (v.lang || '').toLowerCase() === wantFull);
  const natural = (list) => list.find(v => /natural|neural|google|premium|enhanced|samantha|zira|aria|jenny/i.test(v.name || '')) || list.find(v => (v.name || '').toLowerCase().includes('female')) || list[0];
  if (exact.length) return natural(exact);
  if (pool.length) return natural(pool);
  // English may fall back to any installed voice; other languages must NOT be
  // read by an English voice - return null so the TTS fallback handles it.
  if (want !== 'en') return null;
  const en = _voices.filter(v => (v.lang || '').toLowerCase().startsWith('en'));
  return natural(en.length ? en : _voices) || null;
}
/* true only if the device actually has a voice for this language — never guess */
async function voiceAvailable(lang) {
  try {
    await loadVoices();
    return _voices.some(v => (v.lang || '').toLowerCase().startsWith(langBase(lang)));
  } catch { return false; }
}
/* ── unified Ghost voice service ──
   Order: server multilingual TTS first (device-independent), then a matching
   browser voice, then text-only. A non-English language is NEVER read aloud by
   an English voice. One message at a time: every speak cancels the previous. */
const TTS_LOCALE = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', mr: 'mr-IN', gu: 'gu-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN', as: 'as-IN', or: 'or-IN', ur: 'ur-IN', ne: 'ne-IN' };
function ttsLocale(lang) { return TTS_LOCALE[String(lang || '').toLowerCase()] || null; }
let _ttsOK = null;
async function ttsAvailable() {
  if (_ttsOK !== null) return _ttsOK;
  try {
    const r = await fetch('/api/tts/status', { cache: 'no-store' });
    const j = await r.json();
    _ttsOK = !!(j && j.configured);
  } catch { _ttsOK = false; }
  return _ttsOK;
}
/* localized "voice unavailable" line; assistant.js provides t('voiceNA') */
function voiceNAMsg() {
  try { if (window.__voiceNA) return window.__voiceNA(); } catch {}
  return 'Voice guidance is temporarily unavailable. Text guidance will continue.';
}
/* speech-safe text: brand spoken as a word ("Ghostwalk"), never spelled out.
   Visual branding stays uppercase; only spoken output is normalized. */
function speechText(s) {
  return String(s || '').replace(/GHOSTWALK/g, 'Ghostwalk');
}
async function ttsAudio(text, locale) {
  // a newer request cancels the previous one; End Guide aborts via stopSpeak
  try { if (_ttsCtrl) _ttsCtrl.abort(); } catch {}
  try { _ttsCtrl = new AbortController(); } catch { _ttsCtrl = null; }
  const r = await fetch('/api/tts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: String(text).slice(0, 1200), lang: locale }),
    signal: _ttsCtrl ? _ttsCtrl.signal : undefined,
  });
  if (!r.ok) throw new Error('tts ' + r.status);
  const j = await r.json();
  if (!j || !j.ok || !j.audio) throw new Error('tts unavailable');
  const bin = atob(j.audio);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([buf], { type: j.mime || 'audio/mpeg' }));
}
let _ttsCtrl = null;
let _ttsAudio = null, _ttsEl = null, _settle = null;
let _gen = 0; // stop epoch: bumped ONLY by external stops (End/Off/lang change). say() guards use this.
let _spk = 0; // speech instance: bumped by every stop AND every new speech. players use this.
function voiceGen() { return _gen; }
/* THE central kill switch: every audio path and every pending speech decision
   keys off these counters, so one call silences the whole pipeline */
function stopAllGuidanceAudio() { stopSpeak(); }
function quietStop() {
  // cancel current playback without invalidating other pending intentional speech
  _stopReq = true; _speaking = false; _paused = false; _mode = null; _spk++;
  try { speechSynthesis.cancel(); } catch {}
  try { if (_ttsCtrl) _ttsCtrl.abort(); } catch {}
  try { if (_ttsEl) { try { _ttsEl.pause(); } catch {} try { _ttsEl.currentTime = 0; } catch {} _ttsEl = null; } } catch {}
  try { if (_ttsAudio) { URL.revokeObjectURL(_ttsAudio); _ttsAudio = null; } } catch {}
  try { if (_settle) { const s = _settle; _settle = null; s(false); } } catch {}
  try { document.querySelectorAll('.ev.reading').forEach(e => e.classList.remove('reading')); } catch {}
  try { if (_currentBtn) { _currentBtn.innerHTML = '🔊 Hear it'; _currentBtn.classList.remove('speaking'); _currentBtn = null; } } catch {}
}
let _mode = null;        // 'tts' | 'native' | null
let _paused = false;
let _last = null;        // { text, lang } for Repeat
function playTtsUrl(url, mySpk) {
  return new Promise((res, rej) => {
    if (mySpk !== _spk) return res(false);
    let a = null;
    try { a = new Audio(url); } catch (e) { return rej(e); }
    _ttsEl = a; _mode = 'tts'; _settle = (v) => res(v);
    a.onended = () => { _ttsEl = null; _settle = null; res(true); };
    a.onerror = () => { _ttsEl = null; _settle = null; rej(new Error('play failed')); };
    try {
      const p = a.play();
      if (p && p.catch) p.catch((e) => { _ttsEl = null; _settle = null; rej(e); });
    } catch (e) { _ttsEl = null; _settle = null; rej(e); }
  });
}
async function speakTts(text, lang, mySpk) {
  const locale = ttsLocale(lang);
  if (!locale) return false;
  const url = await ttsAudio(text, locale);
  if (mySpk !== _spk) { try { URL.revokeObjectURL(url); } catch {} return false; }
  _ttsAudio = url;
  _speaking = true; _stopReq = false; _paused = false;
  try { await playTtsUrl(url, mySpk); }
  finally { try { if (_ttsAudio === url) { URL.revokeObjectURL(url); _ttsAudio = null; } } catch {} }
  return mySpk === _spk;
}
function speakingNow() {
  if (_speaking) return true;
  try { return !!(window.speechSynthesis && speechSynthesis.speaking); } catch { return false; }
}
function speakPaused() {
  try {
    if (_mode === 'tts') return !!_paused;
    if (window.speechSynthesis) return !!speechSynthesis.paused;
  } catch {}
  return !!_paused;
}
function chunkText(t, max = 200) {
  const clean = String(t || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  let sents = [];
  try { sents = clean.split(/(?<=[.!?।])\s+/); } catch { sents = clean.split(/(?:[.?!]|\u0964)\s+/); }
  const out = []; let cur = '';
  for (const s of sents) {
    if ((cur + ' ' + s).trim().length > max && cur) { out.push(cur.trim()); cur = s; }
    else cur += ' ' + s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}
let _speaking = false, _stopReq = false, _currentBtn = null;
function stopSpeak() {
  quietStop();
  _gen++; // external stop: pending say() decisions die, in-flight players die via _spk
  if (_currentBtn) { _currentBtn.innerHTML = '🔊 Hear it'; _currentBtn.classList.remove('speaking'); _currentBtn = null; }
}
function pauseSpeak() {
  if (_mode === 'tts' && _ttsEl) { try { _ttsEl.pause(); _paused = true; return true; } catch {} }
  try {
    if (window.speechSynthesis && speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause(); _paused = true; return true;
    }
  } catch {}
  return false;
}
function resumeSpeak() {
  if (_mode === 'tts' && _ttsEl && _paused) {
    try { const p = _ttsEl.play(); if (p && p.catch) p.catch(() => {}); _paused = false; return true; } catch {}
  }
  try {
    if (window.speechSynthesis && speechSynthesis.paused) { speechSynthesis.resume(); _paused = false; return true; }
  } catch {}
  return false;
}
function repeatSpeak(btn) {
  if (!_last) return false;
  speak(_last.text, _last.lang, btn || null);
  return true;
}
function cleanSpeech(s) { return String(s || '').replace(/[🛑⚠️👻🔗📷⏹]/g, '').replace(/\s+/g, ' ').trim(); }
function speakParts(segments, lang, btn) {
  // segments: [{ text, ev }] — ev = index into .ev-list .ev to highlight, or -1
  // route: server TTS first, then a matching browser voice, then text-only
  return new Promise(async (done) => {
    // normalize brand pronunciation once: every path below speaks this text
    segments = segments.map(s => ({ text: speechText(s.text), ev: s.ev }));
    const full = segments.map(s => s.text).join(' ');
    _last = { text: full, lang };
    quietStop();
    const mySpk = _spk;
    try {
      if (await ttsAvailable()) {
        await speakTts(full, lang, mySpk);
        return done();
      }
    } catch {}
    if (mySpk !== _spk) return done();
    if (!('speechSynthesis' in window)) { toast(voiceNAMsg()); return done(); }
    await loadVoices();
    if (mySpk !== _spk) return done();
    const voice = pickVoice(lang);
    // no matching installed voice -> text-only with a localized note, never English audio
    if (!voice && langBase(lang) !== 'en') {
      toast(voiceNAMsg());
      return done();
    }
    const targetLang = (voice && voice.lang) || ttsLocale(lang) || 'en-IN';
    _speaking = true; _stopReq = false; _paused = false; _mode = 'native'; _currentBtn = btn || null;
    if (btn) { btn.classList.add('speaking'); }
    let i = 0, curEv = -1;
    const setEv = (idx) => {
      if (idx === curEv) return; curEv = idx;
      document.querySelectorAll('.ev.reading').forEach(e => e.classList.remove('reading'));
      if (idx >= 0) {
        const card = document.querySelectorAll('.ev-list .ev')[idx];
        if (card) { card.classList.add('reading'); try { card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch {} }
      }
    };
    const next = () => {
      if (mySpk !== _spk) return done();
      if (_stopReq || i >= segments.length) { quietStop(); return done(); }
      if (btn) btn.innerHTML = `⏹ Stop (${i + 1}/${segments.length})`;
      const seg = segments[i];
      if (seg.ev >= 0) setEv(seg.ev);
      let u = null;
      try { u = new SpeechSynthesisUtterance(seg.text); }
      catch { i++; setTimeout(next, 260); return; }
      if (voice) { u.voice = voice; }
      u.lang = targetLang; u.rate = 0.97; u.pitch = 1.0; u.volume = 1;
      u.onend = () => { if (mySpk !== _spk) return done(); i++; setTimeout(next, 260); };
      u.onerror = () => { if (mySpk !== _spk) return done(); i++; setTimeout(next, 260); };
      try { speechSynthesis.speak(u); } catch { i++; setTimeout(next, 260); }
    };
    next();
  });
}
function speak(text, lang, btn) {
  // new guidance always interrupts and speaks (never silently dropped);
  // button toggles that need stop-on-click check speakingNow() explicitly
  const parts = chunkText(text, 220).map(t => ({ text: t, ev: -1 }));
  if (!parts.length) { toast(ghostT('emptyRead', 'Nothing to read yet.')); return; }
  speakParts(parts, lang, btn);
}
/* ghost translation hook (assistant.js provides t()); falls back to English only
   as a complete sentence, never mixed into another language mid-sentence */
function ghostT(k, fb) {
  try { if (window.__tr) { const v = window.__tr(k); if (typeof v === 'string' && v.trim()) return v; } } catch {}
  return fb;
}
async function speakVerdict(box, lang, btn) {
  if (_speaking) { stopSpeak(); return; }
  const title = cleanSpeech(box.querySelector('.verdict-title').textContent);
  const sub = cleanSpeech(box.querySelector('.verdict-sub').textContent);
  const evEls = [...box.querySelectorAll('.ev-list .ev')].slice(0, 5);
  const segments = [{ text: title + ' ' + sub, ev: -1 }];
  if (evEls.length) segments.push({ text: ghostT('vLead', 'Here is why, in simple words.'), ev: -1 });
  evEls.forEach((ev, i) => {
    const b = cleanSpeech(ev.querySelector('b') ? ev.querySelector('b').textContent : '').replace(/^\d+\.\s*/, '');
    const p = cleanSpeech(ev.querySelector('p') ? ev.querySelector('p').textContent : '');
    const q = cleanSpeech(ev.querySelector('q') ? ev.querySelector('q').textContent : '');
    let line = `${ghostT('vReason', 'Reason {n}:').replace('{n}', String(i + 1))} ${b}. ${p}`;
    if (q) line += ` ${ghostT('vExample', 'For example:')} ${q.slice(0, 140)}`;
    // split long reasons, keep highlight on first piece
    const pieces = chunkText(line, 230);
    pieces.forEach((c, k) => segments.push({ text: (k > 0 ? ghostT('vRephrase', 'In other words, ') + c : c), ev: k === 0 ? i : -1 }));
  });
  segments.push({ text: ghostT('vDoubt', 'When in doubt, do not pay yet. Talk to someone you trust first.'), ev: -1 });
  speakParts(segments, lang, btn);
}
if (typeof window !== 'undefined') window.addEventListener('beforeunload', () => { try { speechSynthesis.cancel(); } catch {} });
