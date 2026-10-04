/* GHOSTWALK i18n — language gate (all 22 scheduled languages + English),
   full-page translation, site-language voice routing.
   Chain: Google batch → MyMemory fallback → cached in localStorage. */
(function () {
  'use strict';

  /* fresh onboarding on every full reload: a refresh is a new session, so
     onboarding/language/voice state must not leak in from storage */
  try {
    const nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
    const ntype = (nav && nav.type) || ((performance.navigation && performance.navigation.type === 1) ? 'reload' : 'navigate');
    if (ntype === 'reload') {
      ['gw_lang', 'gw_haslang', 'gw_voice'].forEach(k => { try { localStorage.removeItem(k); } catch {} });
      try { sessionStorage.clear(); } catch {}
    }
  } catch {}

  const LANGS = [
    { c: 'en', n: 'English', sub: 'English', s: 'en-IN', m: 'en' },
    { c: 'as', n: 'অসমীয়া', sub: 'Assamese', s: 'as-IN', m: 'as' },
    { c: 'bn', n: 'বাংলা', sub: 'Bengali', s: 'bn-IN', m: 'bn' },
    { c: 'brx', n: 'बड़ो', sub: 'Bodo', s: 'brx-IN', m: 'brx' },
    { c: 'doi', n: 'डोगरी', sub: 'Dogri', s: 'doi-IN', m: 'doi' },
    { c: 'gu', n: 'ગુજરાતી', sub: 'Gujarati', s: 'gu-IN', m: 'gu' },
    { c: 'hi', n: 'हिन्दी', sub: 'Hindi', s: 'hi-IN', m: 'hi' },
    { c: 'kn', n: 'ಕನ್ನಡ', sub: 'Kannada', s: 'kn-IN', m: 'kn' },
    { c: 'ks', n: 'کٲشُر', sub: 'Kashmiri', s: 'ks-IN', m: 'ks' },
    { c: 'kok', n: 'कोंकणी', sub: 'Konkani', s: 'kok-IN', m: 'kok' },
    { c: 'mai', n: 'मैथिली', sub: 'Maithili', s: 'mai-IN', m: 'mai' },
    { c: 'ml', n: 'മലയാളം', sub: 'Malayalam', s: 'ml-IN', m: 'ml' },
    { c: 'mni', n: 'মণিপুরী', sub: 'Manipuri', s: 'mni-IN', m: 'mni-Mtei' },
    { c: 'mr', n: 'मराठी', sub: 'Marathi', s: 'mr-IN', m: 'mr' },
    { c: 'ne', n: 'नेपाली', sub: 'Nepali', s: 'ne-IN', m: 'ne' },
    { c: 'or', n: 'ଓଡ଼ିଆ', sub: 'Odia', s: 'or-IN', m: 'or' },
    { c: 'pa', n: 'ਪੰਜਾਬੀ', sub: 'Punjabi', s: 'pa-IN', m: 'pa' },
    { c: 'sa', n: 'संस्कृतम्', sub: 'Sanskrit', s: 'sa-IN', m: 'sa' },
    { c: 'sat', n: 'संताली', sub: 'Santali', s: 'sat-IN', m: 'sat' },
    { c: 'sd', n: 'سنڌي', sub: 'Sindhi', s: 'sd-IN', m: 'sd' },
    { c: 'ta', n: 'தமிழ்', sub: 'Tamil', s: 'ta-IN', m: 'ta' },
    { c: 'te', n: 'తెలుగు', sub: 'Telugu', s: 'te-IN', m: 'te' },
    { c: 'ur', n: 'اردو', sub: 'Urdu', s: 'ur-IN', m: 'ur' },
  ];
  const byCode = (c) => LANGS.find(l => l.c === c) || LANGS[0];

  /* Languages with a hand-curated dictionary loaded by a <script> tag in each page. */
  const CURATED = ['hi', 'bn', 'mr', 'ta', 'te'];

  /* Static interface copy is served from a local, complete dictionary — never from
     a network call. Curated dictionaries are already in the document; every other
     supported language is fetched once on demand from /i18n/<code>.js. */
  window.__gwDictLoaded = window.__gwDictLoaded || null;
  function loadScript(src, ms) {
    return new Promise((res) => {
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { s.remove(); } catch {}
        res(ok);
      };
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = () => finish(true);
      s.onerror = () => finish(false);
      document.head.appendChild(s);
      /* A missing or stalled dictionary must not freeze language switching.
         Callers treat a timeout like a failed load and keep the current page
         usable in its existing language. */
      const timer = setTimeout(() => finish(false), ms || 5000);
    });
  }
  /* Ghost keys live in their own file for the hand-curated languages: those
     keep dict-<code>.js for the interface and get the Ghost dictionary filled
     in from i18n-ghost/<code>.js, so a generated string can never replace a
     reviewed translation. Languages without a curated file still get their
     Ghost keys from i18n/<code>.js. */
  function ensureDict(code) {
    if (code === 'en') return Promise.resolve(true);
    if (CURATED.includes(code)) {
      if (window.__gwGhostPre === code) return Promise.resolve(true);
      return loadScript('i18n-ghost/' + code + '.js').then(ok => {
        if (ok) window.__gwGhostPre = code;
        else console.warn('[i18n] ghost dictionary missing for ' + code);
        return ok;
      });
    }
    if (window.__gwDictLoaded === code) return Promise.resolve(true);
    return loadScript('i18n/' + code + '.js').then(ok => {
      if (ok) window.__gwDictLoaded = code;
      else console.warn('[i18n] dictionary missing for ' + code);
      return ok;
    });
  }

  window.GW = window.GW || {};
  window.GW.lang = 'en';
  try { window.GW.lang = localStorage.getItem('gw_lang') || 'en'; } catch {}
  if (!byCode(window.GW.lang)) window.GW.lang = 'en';

  window.siteLang = () => window.GW.lang;
  window.srvLang = () => ({ hi: 'hi', bn: 'bn', mr: 'mr' })[window.GW.lang] || 'en';
  window.speechCode = () => byCode(window.GW.lang).s;
  window.mtCode = () => byCode(window.GW.lang).m;

  /* ── translation cache ──
     The cache only ever holds machine-translated *dynamic* strings. It is
     version-stamped, and any legacy (unversioned) entry is dropped on read:
     an old cache written before the dictionaries were complete would otherwise
     shadow good baked translations and render stale English inside a translated
     page forever. Baked dictionaries are authoritative; the cache is not. */
  const CACHE_V = 'v2';
  function cacheGet(lang) {
    try {
      localStorage.removeItem('gwmt_' + lang);
      return JSON.parse(localStorage.getItem('gwmt_' + lang + '_' + CACHE_V) || '{}');
    } catch { return {}; }
  }
  function cachePut(lang, dict) {
    try {
      const keys = Object.keys(dict);
      const slim = {};
      keys.slice(-2500).forEach(k => { slim[k] = dict[k]; });
      localStorage.setItem('gwmt_' + lang + '_' + CACHE_V, JSON.stringify(slim));
    } catch {}
  }

  /* ── backends ── */
  async function mtGoogle(texts, tl) {
    // one query per request: the endpoint sentence-splits responses, so batching
    // multiple queries (or reading only the first row) corrupts neighbouring units
    const out = new Array(texts.length).fill(null);
    const POOL = 6;
    for (let i = 0; i < texts.length; i += POOL) {
      const batch = texts.map((t, k) => k).slice(i, i + POOL);
      await Promise.all(batch.map(async (k) => {
        try {
          const params = new URLSearchParams({ client: 'gtx', sl: 'en', tl, dt: 't' });
          params.append('q', texts[k]);
          const ctrl = new AbortController();
          const to = setTimeout(() => ctrl.abort(), 15000);
          const r = await fetch('https://translate.googleapis.com/translate_a/single?' + params.toString(), { signal: ctrl.signal });
          clearTimeout(to);
          if (!r.ok) return;
          const j = await r.json();
          const t = ((j[0] || []).map(row => (row && row[0]) || '').join('')).trim();
          if (t) out[k] = t;
        } catch { /* this unit stays null → MyMemory fallback */ }
      }));
      await new Promise(r => setTimeout(r, 300));
    }
    return out;
  }
  async function mtMemoryOne(text, tl) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 15000);
      const u = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=en|' + encodeURIComponent(tl);
      const r = await fetch(u, { signal: ctrl.signal });
      clearTimeout(to);
      if (!r.ok) return null;
      const j = await r.json();
      const t = j && j.responseData && j.responseData.translatedText;
      if (!t || /MYMEMORY WARNING|INVALID/i.test(t)) return null;
      return t;
    } catch { return null; }
  }
  async function mtMissing(texts, tl, onProgress) {
    const out = new Array(texts.length).fill(null);
    // pass 1: Google batched
    try {
      const g = await mtGoogle(texts, tl);
      g.forEach((t, i) => { out[i] = t; });
    } catch {}
    // pass 2: MyMemory for leftovers, 6 at a time
    const idx = out.map((t, i) => (t ? -1 : i)).filter(i => i >= 0);
    const POOL = 6;
    for (let i = 0; i < idx.length; i += POOL) {
      const batch = idx.slice(i, i + POOL);
      const res = await Promise.all(batch.map(k => mtMemoryOne(texts[k], tl)));
      res.forEach((t, b) => { out[batch[b]] = t; });
      onProgress && onProgress(Math.min(idx.length, i + POOL), idx.length);
      await new Promise(r => setTimeout(r, 200));
    }
    return out;
  }

  /* ── baked dictionaries (offline, exact) ── */
  function normKey(s) {
    return String(s || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ')
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim()
      .replace(/^[^\p{L}\p{N}]+/u, '').replace(/^\d+\.\s*/, '').replace(/^ghost saw:\s*/i, '')
      .toLowerCase();
  }
  let HI_MAP = null;
  function hiLookup(src) {
    if (!window.DICT_HI_SRC) return null;
    if (!HI_MAP) {
      HI_MAP = new Map();
      for (const e of window.DICT_HI_SRC) {
        if (!Array.isArray(e) || typeof e[0] !== 'string') continue;
        HI_MAP.set(normKey(e[0]), e[1]);
        // lookups truncate long units: index the truncated key too
        if (e[0].length > 450) HI_MAP.set(normKey(e[0].slice(0, 450)), e[1]);
      }
    }
    const hit = HI_MAP.get(normKey(src.length > 450 ? src.slice(0, 450) : src));
    if (hit) return hit;
    if (window.DICT_HI_TPL) {
      for (const [re, rep] of window.DICT_HI_TPL) {
        if (re.test(src)) { try { return src.replace(re, rep); } catch {} }
      }
    }
    return null;
  }
  function bakedLookup(lang, src) {
    if (lang === 'hi') return hiLookup(src);
    if (window.DICT_PRE && window.DICT_PRE[lang]) {
      const mk = lang + '_map';
      if (!window.DICT_PRE[mk]) {
        const m = new Map();
        for (const e of window.DICT_PRE[lang]) {
          if (!Array.isArray(e) || typeof e[0] !== 'string') continue;
          m.set(normKey(e[0]), e[1]);
          // lookups truncate long units: index the truncated key too
          if (e[0].length > 450) m.set(normKey(e[0].slice(0, 450)), e[1]);
        }
        window.DICT_PRE[mk] = m;
      }
      const hit = window.DICT_PRE[mk].get(normKey(src.length > 450 ? src.slice(0, 450) : src));
      if (hit) return hit;
      const tpls = window.DICT_PRE[lang + '_TPL'] || [];
      for (const e of tpls) {
        if (!Array.isArray(e)) continue;
        const [re, rep] = e;
        if (re.test(src)) { try { return src.replace(re, rep); } catch {} }
      }
    }
    return null;
  }
  const BLOCKKIDS = /^(DIV|SECTION|HEADER|FOOTER|FORM|OL|UL|TABLE|NAV|MAIN|ARTICLE|ASIDE)$/;
  const SYMONLY = /^[0-9\s₹.,:;!?()\-–—'"“”‘’→↓↑•·|/\\👻💬📷👪🆘🔊🔎⏹⤴◦✓✗★☆◀▶+×=]+$/u;
  function baseEligible(el) {
    // content test only — consults no marks, so ancestors/descendants can be compared freely
    if (!(el instanceof Element)) return false;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE' || tag === 'PRE') return false;
    if (el.closest('[data-keep]')) return false;
    if (el.closest('#langGate')) return false;
    for (const c of el.children) if (BLOCKKIDS.test(c.tagName)) return false;
    const t = (el.textContent || '');
    if (!t.trim() || t.trim().length < 2) return false;
    if (SYMONLY.test(t)) return false;
    // already in a non-Latin script? leave it — it's translated (or a quote to preserve)
    const letters = (t.match(/\p{L}/gu) || []).length;
    const latin = (t.match(/[A-Za-z]/g) || []).length;
    if (letters > 4 && latin / letters < 0.45) return false;
    return true;
  }
  function hasEligDesc(el) {
    // any descendant element that could stand alone as a unit (leaf-most wins)
    for (const c of el.children) {
      if (c.closest('[data-keep]')) continue;
      if (BLOCKKIDS.test(c.tagName)) continue;
      if (baseEligible(c)) return true;
      if (hasEligDesc(c)) return true;
    }
    return false;
  }
  function eligible(el) {
    if (!baseEligible(el)) return false;
    if (el.hasAttribute('data-tdone')) return false;
    if (el.closest('[data-tdone]')) return false;
    return true;
  }
  const FUNCTAG = /<(input|select|textarea|button|option|optgroup|a)\b[^>]*\s(id|class|data-|href|src|for|type|name|value|placeholder|action|role|tabindex)=/i;
  function textKids(el, units) {
    // translate direct text children only; tags, ids and hooks survive untouched
    for (const n of el.childNodes) {
      if (n.nodeType !== 3) continue;
      const v = n.nodeValue || '';
      if (v.trim().length < 2 || SYMONLY.test(v)) continue;
      const letters = (v.match(/\p{L}/gu) || []).length;
      const latin = (v.match(/[A-Za-z]/g) || []).length;
      if (letters > 4 && latin / letters < 0.45) continue;
      units.push({ node: n, src: v });
    }
  }
  function collectUnits(root) {
    const units = [];
    const all = root === document ? [...document.body.querySelectorAll('*')] : [root, ...root.querySelectorAll('*')];
    all.reverse(); // deepest first: children claim their own strings before parents
    for (const el of all) {
      if (!eligible(el)) continue;
      const html = el.innerHTML || '';
      if (el.querySelector('[data-keep]') || FUNCTAG.test(html)) {
        // technical child intact: only direct text children become units
        if (!el.hasAttribute('data-torig')) el.setAttribute('data-torig', html);
        textKids(el, units);
        el.setAttribute('data-tdone', '1');
        continue;
      }
      if (hasEligDesc(el)) {
        // whole-block dictionary entry wins (existing combined phrases keep working)
        if (dictHas(html)) {
          units.push({ el, src: html });
          el.setAttribute('data-tdone', '1');
          continue;
        }
        // no whole translation: fall back to direct-text fragments so that no
        // sentence is left behind in English (children still claim their own)
        if (!el.hasAttribute('data-torig')) el.setAttribute('data-torig', html);
        textKids(el, units);
        el.setAttribute('data-tdone', '1');
        continue;
      }
      units.push({ el, src: html });
      el.setAttribute('data-tdone', '1');
    }
    // placeholders
    const scope = root === document ? document : root;
    for (const inp of scope.querySelectorAll('input[placeholder],textarea[placeholder]')) {
      if (inp.closest('[data-keep]') || inp.hasAttribute('data-pdone')) continue;
      const ph = inp.getAttribute('placeholder') || '';
      if (ph.trim().length < 2 || SYMONLY.test(ph)) continue;
      const letters = (ph.match(/\p{L}/gu) || []).length, latin = (ph.match(/[A-Za-z]/g) || []).length;
      if (letters > 4 && latin / letters < 0.45) continue;
      inp.setAttribute('data-porig', ph);
      inp.setAttribute('data-pdone', '1');
      units.push({ ph: inp, src: ph });
    }
    // accessibility labels + tooltips (translated in place; structure untouched)
    for (const attr of ['aria-label', 'title']) {
      for (const elm of scope.querySelectorAll(`[${attr}]`)) {
        if (elm.closest('[data-keep]') || elm.hasAttribute('data-ldone')) continue;
        const v = elm.getAttribute(attr) || '';
        if (v.trim().length < 2 || SYMONLY.test(v)) continue;
        const letters = (v.match(/\p{L}/gu) || []).length, latin = (v.match(/[A-Za-z]/g) || []).length;
        if (letters > 4 && latin / letters < 0.45) continue;
        elm.setAttribute('data-lorig', elm.getAttribute(attr));
        elm.setAttribute('data-lattr', attr);
        elm.setAttribute('data-ldone', '1');
        units.push({ aria: elm, attr, src: v });
      }
    }
    return units;
  }

  let translating = false;
  const _tqueue = [];
  let activeLang = 'en';
  /* One language operation at a time, end to end. A switch is restore +
     translate as a single atomic unit: without this, a second switch (or a
     late-arriving pass from onboarding) could restore, collect or apply in the
     middle of the first one — leaving the previous language on screen and
     poisoning the next pass with stale marks, which is exactly the mixed text
     the audit caught. Queued work always runs with the language that is
     current when it starts, never the one it was requested with. */
  async function withLangLock(fn) {
    if (translating) await new Promise(res => _tqueue.push(res));
    translating = true;
    try { return await fn(); }
    finally { translating = false; const next = _tqueue.shift(); if (next) next(); }
  }
  function dictHas(src) {
    // combined-phrase fast path: keep existing whole-block translations working
    try {
      if (activeLang === 'hi' && window.DICT_HI_SRC) return !!hiLookup(src);
      if (window.DICT_PRE && window.DICT_PRE[activeLang]) return !!bakedLookup(activeLang, src);
    } catch {}
    return false;
  }
  async function translateNode(root, forceLang, opts) {
    const lang = forceLang || window.GW.lang;
    if (lang === 'en') return;
    // serialize concurrent passes: never silently drop a translation request,
    // and never interleave two passes (see withLangLock)
    return withLangLock(() => translateNodeInner(root, lang, opts || {}));
  }
  async function translateNodeInner(root, lang, o) {
    o = o || {};
    activeLang = lang;
    try {
      // the local dictionary must exist before any unit is resolved
      await ensureDict(lang);
      const units = collectUnits(root || document);
      if (!units.length) return;
      const isPage = (root || document) === document;
      const tl = byCode(lang).m;
      const cache = cacheGet(lang);
      // baked dictionaries are authoritative: they overwrite the cache, never the reverse
      if (window.DICT_HI_SRC || window.DICT_PRE) {
        for (const u of units) {
          const h = bakedLookup(lang, u.src.length > 450 ? u.src.slice(0, 450) : u.src);
          if (h) cache[u.src] = h;
        }
        cachePut(lang, cache);
      }
      const needIdx = [], needSrc = [];
      units.forEach((u, i) => { if (cache[u.src] == null) { needIdx.push(i); needSrc.push(u.src.length > 450 ? u.src.slice(0, 450) : u.src); } });
      if (needSrc.length) {
        if (isPage || o.staticOnly) {
          // Fixed interface copy is never machine-translated while the page is on screen:
          // a slow or failed request used to drop an English fragment into an otherwise
          // translated page. Report the gap for the build instead, and let the section
          // stay in one language rather than mixing two.
          try { window._gwMiss = (window._gwMiss || []).concat(needSrc.slice(0, 40)); } catch {}
          if (window.console && console.warn) {
            console.warn('[gwaudit] ' + lang + ': ' + needSrc.length + ' static units have no local translation', needSrc.slice(0, 5));
          }
        } else {
          // genuinely dynamic content (a rendered result): translate it as one message
          const got = await mtMissing(needSrc, tl);
          got.forEach((t, k) => { if (t) cache[needSrc[k]] = t; });
          cachePut(lang, cache);
        }
      }
      let applied = 0;
      const failed = [];
      for (const u of units) {
        let t = cache[u.src];
        if (!t) { if (failed.length < 30) failed.push(u.src.length > 120 ? u.src.slice(0, 120) : u.src); continue; }
        if (u.src.includes('<') && !t.includes('<')) continue; // tag guard
        // plain-text targets must never receive markup: whole-unit values
        // belong to innerHTML application only (prevents tag-text injection)
        if (!u.el && t.includes('<')) continue;
        applied++;
        if (u.el) {
          if (!u.el.hasAttribute('data-torig')) u.el.setAttribute('data-torig', u.src);
          u.el.innerHTML = t;
        } else if (u.node) {
          u.node.nodeValue = t;
        } else if (u.ph) {
          u.ph.setAttribute('placeholder', t);
        } else if (u.aria) {
          u.aria.setAttribute(u.attr, t);
        }
      }
      if (units.length > 10 && applied / units.length < 0.4) {
        toastOnce(ghostMsg('netStruggle', 'Translation is struggling on this network — showing English for now.'));
      }
      try { window._gwUntranslated = failed; } catch {}
if ((root || document) === document) {
        const ttl = cache[document.title];
        if (ttl) { if (!document.documentElement.hasAttribute('data-titleorig')) document.documentElement.setAttribute('data-titleorig', document.title); document.title = ttl; }
        else if (!o.dynamic) {
          // the page title is fixed interface copy: no render-time network call
          try { window._gwMiss = (window._gwMiss || []).concat(['<title>' + document.title]); } catch {}
        }
      }
    } finally { /* lock release belongs to withLangLock, never to a pass body */ }
  }
  function restoreAll() {
    document.querySelectorAll('[data-tdone]').forEach(el => {
      if (el.hasAttribute('data-torig')) el.innerHTML = el.getAttribute('data-torig');
      el.removeAttribute('data-tdone'); el.removeAttribute('data-torig');
    });
    document.querySelectorAll('[data-ldone]').forEach(el => {
      const at = el.getAttribute('data-lattr') || 'aria-label';
      if (el.hasAttribute('data-lorig')) el.setAttribute(at, el.getAttribute('data-lorig'));
      el.removeAttribute('data-ldone'); el.removeAttribute('data-lorig'); el.removeAttribute('data-lattr');
    });
    document.querySelectorAll('[data-pdone]').forEach(el => {
      el.setAttribute('placeholder', el.getAttribute('data-porig') || '');
      el.removeAttribute('data-pdone'); el.removeAttribute('data-porig');
    });
    const ot = document.documentElement.getAttribute('data-titleorig');
    if (ot) { document.title = ot; document.documentElement.removeAttribute('data-titleorig'); }
  }
  async function translateTexts(arr, lang) {
    const l = lang || window.GW.lang;
    if (l === 'en') return arr.slice();
    const tl = byCode(l).m;
    const cache = cacheGet(l);
    const shorts = arr.map(s => (s && s.length > 450 ? s.slice(0, 450) : s));
    if (window.DICT_HI_SRC || window.DICT_PRE) {
      for (const s of shorts) {
        if (!s) continue;
        const h = bakedLookup(l, s);
        if (h) cache[s] = h;
      }
      cachePut(l, cache);
    }
    const missing = shorts.filter(s => s && cache[s] == null);
    const uniq = [...new Set(missing)];
    if (uniq.length) {
      const got = await mtMissing(uniq, tl);
      got.forEach((t, i) => { if (t) cache[uniq[i]] = t; });
      cachePut(l, cache);
    }
    return shorts.map(s => (s && cache[s]) || s);
  }

  /* ── dev language audit (?gwaudit=1): console-only, never user-facing.
     Scans for Latin-dominant sentences while a non-English language is active
     (allowed terms: product names, abbreviations, URLs, numbers, emoji). */
  const AUDIT = /[?&]gwaudit=1/.test(location.search || '');
  const ALLOW_TOKENS = ['ghostwalk', 'sangyan', 'qr', 'upi', 'otp', 'pan', 'apk', 'url', 'pdf', 'whatsapp', 'telegram', '1930', 'cybercrime.gov.in',
    'english', 'hinglish', 'hindi', 'bengali', 'marathi', 'tamil', 'telugu', 'nepali', 'urdu', 'gujarati', 'kannada', 'malayalam', 'punjabi', 'assamese', 'odia']; // language names stay in Latin script
  function auditStrip(s) {
    let t = String(s || '');
    t = t.replace(/https?:\/\/\S+|www\.\S+|[\w.%-]+@[\w.-]+\.[A-Za-z]{2,}|[\w-]+\.[a-z]{2,}(\/\S*)?/gi, ' ');
    t = t.replace(/[0-9₹€£¥$%.,:;!?()\-–—'"“”‘’→↓↑•·|/\\+×=°§©®™👻💬📷👪🆘🔊🔎⏹⤴◦✓✗★☆◀▶\s]+/gu, ' ');
    for (const w of ALLOW_TOKENS) t = t.replace(new RegExp(w, 'gi'), ' ');
    return t;
  }
  function auditSuspicious(s) {
    const t = auditStrip(s);
    const letters = (t.match(/\p{L}/gu) || []).length;
    const latin = (t.match(/[A-Za-z]/g) || []).length;
    return letters > 4 && latin / letters >= 0.55 ? t.trim().slice(0, 90) : null;
  }
  function auditPage() {
    if (!AUDIT || window.GW.lang === 'en') return;
    try {
      const bad = [];
      const seen = new Set();
      const push = (src, sample) => {
        if (seen.has(sample) || bad.length >= 15) return;
        seen.add(sample); bad.push(src + ': ' + sample);
      };
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const v = n.nodeValue || '';
        if (v.trim().length < 8) continue;
        const p = n.parentElement;
        if (!p || /^(SCRIPT|STYLE|CODE|PRE)$/.test(p.tagName)) continue;
        if (p.closest('[data-keep]')) continue;
        const hit = auditSuspicious(v);
        if (hit) push('text', hit);
      }
      document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(i => {
        if (i.closest('[data-keep]')) return;
        const hit = auditSuspicious(i.getAttribute('placeholder') || '');
        if (hit) push('placeholder', hit);
      });
      document.querySelectorAll('[aria-label]').forEach(e => {
        if (e.closest('[data-keep]')) return;
        const hit = auditSuspicious(e.getAttribute('aria-label') || '');
        if (hit) push('aria-label', hit);
      });
      const miss = (window._gwMiss || []).slice(0, 15);
      const untr = (window._gwUntranslated || []).slice(0, 10).map(s => String(s).slice(0, 80));
      if (!bad.length && !miss.length && !untr.length) { console.info('[gwaudit] clean for ' + window.GW.lang); return; }
      console.warn('[gwaudit] language=' + window.GW.lang + ' mixed/english=' + bad.length, bad);
      if (miss.length) console.warn('[gwaudit] ghost missing keys:', miss);
      if (untr.length) console.warn('[gwaudit] MT-untranslated units:', untr);
    } catch {}
  }
  function scheduleAudit() {
    if (!AUDIT) return;
    clearTimeout(scheduleAudit._t);
    scheduleAudit._t = setTimeout(auditPage, 3500);
  }
  function buildGate() {
    if (document.getElementById('langGate')) return;
    const g = document.createElement('div');
    g.id = 'langGate';
    g.setAttribute('data-keep', '1');
    g.innerHTML = `<div class="gate-card" role="dialog" aria-label="Choose language">
      <div class="gate-ghost">👻</div>
      <h2>Choose your language</h2>
      <p class="gate-sub">अपनी भाषा चुनें · আপনার ভাষা বেছে নিন · உங்கள் மொழியைத் தேர்ந்தெடுக்கவும் · اپنی زبان منتخب کریں</p>
      <div class="gate-grid">${LANGS.map(l => `<button class="gate-btn" data-lang="${l.c}"><b>${l.n}</b><span>${l.sub}</span></button>`).join('')}</div>
      <button class="gate-skip" id="gateSkip">Continue in English →</button>
      <button class="gate-x hidden" id="gateX" aria-label="Close">✕</button>
    </div>`;
    document.body.appendChild(g);
    g.querySelectorAll('.gate-btn').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang, true)));
    g.querySelector('#gateSkip').addEventListener('click', () => applyLang('en', true));
    g.querySelector('#gateX').addEventListener('click', closeGate);
  }
  function openGate(changing) {
    buildGate();
    const g = document.getElementById('langGate');
    g.classList.remove('hidden');
    g.querySelector('#gateX').classList.toggle('hidden', !changing);
    document.body.style.overflow = 'hidden';
  }
  function closeGate() {
    const g = document.getElementById('langGate');
    if (g) g.classList.add('hidden');
    document.body.style.overflow = '';
  }
  /* Hold first paint until the active language's dictionary is resolved, so the page is
     never briefly English inside a translated session. The failsafe timer guarantees the
     page is always revealed even if a dictionary file fails to load. */
  function gwWait(on) {
    const de = document.documentElement;
    clearTimeout(gwWait._t);
    if (on) {
      de.setAttribute('data-gw-wait', '1');
      gwWait._t = setTimeout(() => de.removeAttribute('data-gw-wait'), 4000);
    } else {
      de.removeAttribute('data-gw-wait');
    }
  }

  async function applyLang(code, fromUser) {
    closeGate();
    if (typeof stopSpeak !== 'undefined') { try { stopSpeak(); } catch {} }
    if (!byCode(code)) code = 'en';
    if (code === window.GW.lang && document.documentElement.lang === code) {
      /* already showing this language: sync the chrome and stop. Re-running
         restore + translate + announce here tore down visible UI (the welcome
         "blink") and cancelled in-flight answers for no change at all. */
      updateSwitcher();
      syncSelects();
      gwWait(false);
      return;
    }
    /* the whole switch holds the language lock: restore, state, announce and
       translate cannot be split apart by another switch or a late pass */
    await withLangLock(async () => {
      restoreAll();
      window.GW.lang = code;
      try { localStorage.setItem('gw_lang', code); localStorage.setItem('gw_haslang', '1'); } catch {}
      document.documentElement.lang = code;
      /* the dictionary must be in memory BEFORE the Ghost is told about the
         language, otherwise the panel renders in the previous language or falls
         back to English for one frame */
      if (code !== 'en') { try { await ensureDict(code); } catch {} }
      // the Ghost Assistant subscribes to this - it must never keep a stale language
      try { window.dispatchEvent(new CustomEvent('gw-lang', { detail: { lang: code } })); } catch {}
      updateSwitcher();
      syncSelects();
      if (code !== 'en') {
        toastOnce(ghostMsg('translating', 'Translating the page — a moment…'));
        gwWait(true);
        try { await translateNodeInner(document, code, {}); } finally { gwWait(false); }
      } else {
        gwWait(false);
      }
    });
  }
  let toasted = false;
  /* ghost translation hook (assistant.js provides t()); complete-sentence
     fallback only — never a mid-sentence mix */
  function ghostMsg(k, fb) {
    try { if (window.__tr) { const v = window.__tr(k); if (typeof v === 'string' && v.trim()) return v; } } catch {}
    return fb;
  }
  function toastOnce(m) {
    if (toasted) return; toasted = true;
    try {
      const d = document.createElement('div');
      d.textContent = m;
      d.style.cssText = 'position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:#1C2130;color:#FFE9B8;padding:.7rem 1.2rem;border-radius:999px;z-index:200;font-size:.88rem;border:2px solid #FFD66B';
      document.body.appendChild(d); setTimeout(() => d.remove(), 2800);
    } catch {}
    setTimeout(() => { toasted = false; }, 8000);
  }
  function syncSelects() {
    const s = document.getElementById('inLang');
    if (s && ['en', 'hi', 'bn', 'mr'].includes(window.GW.lang)) s.value = window.GW.lang;
  }
  function buildSwitcher() {
    const bar = document.querySelector('.topbar-in');
    if (!bar || document.getElementById('langBtn')) return;
    const b = document.createElement('button');
    b.id = 'langBtn';
    b.className = 'btn btn-paper btn-sm';
    b.setAttribute('data-keep', '1');
    b.setAttribute('title', 'Change language');
    b.setAttribute('aria-label', 'Change language');
    b.innerHTML = `🌐 <b>${byCode(window.GW.lang).n}</b>`;
    b.addEventListener('click', () => openGate(true));
    bar.appendChild(b);
  }
  function updateSwitcher() {
    const b = document.getElementById('langBtn');
    if (b) b.querySelector('b').textContent = byCode(window.GW.lang).n;
  }

  window.translateNode = translateNode;
  window.translateTexts = translateTexts;
  try { window.gwAudit = auditPage; } catch {}
  window.applyLang = applyLang;
  window.openLangGate = (changing) => openGate(!!changing);
  window.supportedLang = (c) => (LANGS.some(l => l.c === c) ? c : null);
  window.langNativeName = (c) => ((LANGS.find(l => l.c === c) || {}).n || c);
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('#langChange');
    if (t) { e.preventDefault(); openGate(true); }
  });
  // the header/tab selector drives the SAME global state as the ghost
  document.addEventListener('change', (e) => {
    const t = e.target && e.target.closest ? e.target.closest('#inLang') : null;
    if (!t || !t.value) return;
    try { const r = applyLang(t.value, true); if (r && r.catch) r.catch(() => {}); } catch {}
  });

  function initI18n() {
    buildGate();
    buildSwitcher();
    const isFront = /(\/|\/index\.html?)$/.test(location.pathname);
    let stored = 'en';
    try { stored = localStorage.getItem('gw_lang') || 'en'; } catch {}
    if (!byCode(stored)) stored = 'en';
    window.GW.lang = stored;
    document.documentElement.lang = stored;
    syncSelects();
    // the ghost owns first-run language selection: the gate opens ONLY on an
    // explicit change request (header control / ghost menu), never stacked behind
    // the ghost popup — exactly one language UI is ever visible
    closeGate();
    // Announce the stored language only after its dictionary is in memory, so the
    // Ghost renders the real translation instead of English on the first paint.
    (async () => {
      if (stored !== 'en') { try { await ensureDict(stored); } catch {} }
      try { window.dispatchEvent(new CustomEvent('gw-lang', { detail: { lang: stored } })); } catch {}
      if (stored !== 'en') {
        gwWait(true);
        translateNode(document).finally(() => gwWait(false));
      } else {
        gwWait(false);
      }
      scheduleAudit();
    })();
  }
  window.addEventListener('gw-lang', () => scheduleAudit());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initI18n);
  else initI18n();
})();
