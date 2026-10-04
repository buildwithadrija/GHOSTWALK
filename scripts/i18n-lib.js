/* Shared GHOSTWALK i18n helpers: unit collection, key normalisation, validation.
   Used by scripts/i18n-build.js (generate dictionaries) and scripts/i18n-check.js
   (verify completeness + detect English leaks). */
'use strict';
const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const PUB = require('path').join(__dirname, '..', 'public') + require('path').sep;

const LANGS = [
  { c: 'en', n: 'English', m: 'en' },
  { c: 'as', n: 'অসমীয়া', m: 'as' },
  { c: 'bn', n: 'বাংলা', m: 'bn' },
  { c: 'brx', n: 'बड़ो', m: 'brx' },
  { c: 'doi', n: 'डोगरी', m: 'doi' },
  { c: 'gu', n: 'ગુજરાતી', m: 'gu' },
  { c: 'hi', n: 'हिन्दी', m: 'hi' },
  { c: 'kn', n: 'ಕನ್ನಡ', m: 'kn' },
  { c: 'ks', n: 'کٲشُر', m: 'ks' },
  { c: 'kok', n: 'कोंकणी', m: 'kok' },
  { c: 'mai', n: 'मैथिली', m: 'mai' },
  { c: 'ml', n: 'മലയാളം', m: 'ml' },
  { c: 'mni', n: 'মণিপুরী', m: 'mni' },
  { c: 'mr', n: 'मराठी', m: 'mr' },
  { c: 'ne', n: 'नेपाली', m: 'ne' },
  { c: 'or', n: 'ଓଡ଼ିଆ', m: 'or' },
  { c: 'pa', n: 'ਪੰਜਾਬੀ', m: 'pa' },
  { c: 'sa', n: 'संस्कृतम्', m: 'sa' },
  { c: 'sat', n: 'संताली', m: 'sat' },
  { c: 'sd', n: 'سنڌي', m: 'sd' },
  { c: 'ta', n: 'தமிழ்', m: 'ta' },
  { c: 'te', n: 'తెలుగు', m: 'te' },
  { c: 'ur', n: 'اردو', m: 'ur' },
];
const TARGET = LANGS.filter(l => l.c !== 'en');

const PAGES = ['index.html', 'message.html', 'ghost.html', 'qr.html', 'trusted.html', 'recovery.html'];

/* The scam-warning marquee. This copy is assembled in JavaScript (public/common.js), so it
   cannot be discovered by walking the HTML and must be baked separately. Keep this list in
   sync with GW_MARQUEE_EN in public/common.js. */
const MARQUEE_SRC = ['GUARANTEED RETURNS', '"UNLOCK FEE" BEFORE WITHDRAWAL', 'LIMITED SLOTS',
  "DON'T TELL ANYONE", 'FAKE PROFIT SCREENSHOTS', 'TELEGRAM VIP GROUP', 'APK INSTALL PUSH',
  'SCREEN-SHARE REQUEST', 'UPI TO A PERSONAL NAME', 'REDIRECT \u2192 DIFFERENT SITE'];

/* Terms allowed to stay in Latin script inside a translated page. */
const ALLOW = ['ghostwalk', 'sangyan', 'qr', 'upi', 'otp', 'pan', 'apk', 'url', 'pdf', 'jpg', 'jpeg', 'png', 'webp',
  'whatsapp', 'telegram', 'sebi', 'vip', 'chrome', 'edge', '1930', 'cybercrime.gov.in', 'not verified',
  'english', 'hinglish', 'hindi', 'bengali', 'marathi', 'tamil', 'telugu', 'nepali', 'urdu', 'gujarati',
  'kannada', 'malayalam', 'punjabi', 'assamese', 'odia', 'bodo', 'dogri', 'kashmiri', 'konkani', 'maithili',
  'manipuri', 'sanskrit', 'santali', 'sindhi'];

/* Unicode ranges per target script. Multiple ranges where a language legitimately
   mixes scripts (Manipuri: Bengali + Meitei Mayek; Kashmiri/Sindhi: Arabic + Devanagari).
   Note Gujarati is U+0A80-0AFF; U+0A00-0A7F is Gurmukhi (Punjabi). */
const R = (...a) => a.map(x => new RegExp('[' + x + ']', 'u'));
const SCRIPT_RX = {
  as: R('ঀ-৿'),
  bn: R('ঀ-৿'),
  brx: R('ऀ-ॿ'),
  doi: R('ऀ-ॿ'),
  hi: R('ऀ-ॿ'),
  kok: R('ऀ-ॿ'),
  mai: R('ऀ-ॿ'),
  mr: R('ऀ-ॿ'),
  ne: R('ऀ-ॿ'),
  sa: R('ऀ-ॿ'),
  sat: R('ऀ-ॿ'),
  mni: R('ঀ-৿', '\uABC0-\uABFF'),
  gu: R('઀-૿'),
  pa: R('਀-੿'),
  or: R('଀-୿'),
  ta: R('஀-௿'),
  te: R('ఀ-౿'),
  kn: R('ಀ-೿'),
  ml: R('ഀ-ൿ'),
  ks: R('؀-ۿ', 'ऀ-ॿ'),
  sd: R('؀-ۿ', 'ऀ-ॿ'),
  ur: R('؀-ۿ'),
};
const hasTargetScript = (s, mtl) => {
  const rx = SCRIPT_RX[mtl];
  return !rx || rx.some(r => r.test(s));
};

function normKey(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim()
    .replace(/^[^\p{L}\p{N}]+/u, '').replace(/^\d+\.\s*/, '').replace(/^ghost saw:\s*/i, '')
    .toLowerCase();
}

const BLOCKKIDS = /^(DIV|SECTION|HEADER|FOOTER|FORM|OL|UL|TABLE|NAV|MAIN|ARTICLE|ASIDE)$/;
const SYMONLY = /^[0-9\s₹.,:;!?()\-–—'"“”‘’→↓↑•·|/\\👻💬📷👪🆘🔊🔎⏹⤴◦✓✗★☆◀▶+×=]+$/u;
const letters = (s) => (String(s).match(/\p{L}/gu) || []).length;
const latin = (s) => (String(s).match(/[A-Za-z]/g) || []).length;
const FUNCTAG = /<(input|select|textarea|button|option|optgroup|a)\b[^>]*\s(id|class|data-|href|src|for|type|name|value|placeholder|action|role|tabindex)=/i;

function eligibleText(t) {
  t = String(t || '');
  if (!t.trim() || t.trim().length < 2) return false;
  if (SYMONLY.test(t)) return false;
  if (letters(t) > 4 && latin(t) / letters(t) < 0.45) return false;
  return true;
}
function baseEligible(el) {
  const tag = el.tagName;
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE' || tag === 'PRE' || tag === 'NOSCRIPT') return false;
  if (el.closest('[data-keep]')) return false;
  if (el.closest('#langGate')) return false;
  for (const c of el.children) if (BLOCKKIDS.test(c.tagName)) return false;
  return eligibleText(el.textContent || '');
}
function hasEligDesc(el) {
  for (const c of el.children) {
    if (c.closest('[data-keep]')) continue;
    if (BLOCKKIDS.test(c.tagName)) continue;
    if (baseEligible(c)) return true;
    if (hasEligDesc(c)) return true;
  }
  return false;
}
function textKids(el, units) {
  for (const n of el.childNodes) {
    if (n.nodeType !== 3) continue;
    if (eligibleText(n.nodeValue || '')) units.push({ src: n.nodeValue });
  }
}

/* Mirrors public/i18n.js collectUnits() exactly — if these drift, coverage lies. */
function collectUnits(doc) {
  const units = [];
  const all = [...doc.body.querySelectorAll('*')];
  all.reverse();
  for (const el of all) {
    if (el.hasAttribute('data-tdone') || el.closest('[data-tdone]')) continue;
    if (!baseEligible(el)) continue;
    const html = el.innerHTML || '';
    if (el.querySelector('[data-keep]') || FUNCTAG.test(html)) {
      if (!el.hasAttribute('data-torig')) el.setAttribute('data-torig', html);
      textKids(el, units);
      el.setAttribute('data-tdone', '1');
      continue;
    }
    if (hasEligDesc(el)) {
      const clean = html.replace(/\sdata-(tdone|torig|pdone|porig|ldone|lorig)="[^"]*"/g, '');
      units.push({ src: clean, whole: true });
      for (const n of el.childNodes) {
        if (n.nodeType !== 3) continue;
        if (eligibleText(n.nodeValue || '')) units.push({ src: n.nodeValue });
      }
      if (!el.hasAttribute('data-torig')) el.setAttribute('data-torig', html);
      el.setAttribute('data-tdone', '1');
      continue;
    }
    units.push({ src: html });
    el.setAttribute('data-tdone', '1');
  }
  for (const inp of doc.querySelectorAll('input[placeholder],textarea[placeholder]')) {
    if (inp.closest('[data-keep]') || inp.hasAttribute('data-pdone')) continue;
    const ph = inp.getAttribute('placeholder') || '';
    if (!eligibleText(ph)) continue;
    inp.setAttribute('data-pdone', '1');
    units.push({ src: ph, attr: 'placeholder' });
  }
  for (const attr of ['aria-label', 'title']) {
    for (const e of doc.querySelectorAll(`[${attr}]`)) {
      if (e.closest('[data-keep]') || e.hasAttribute('data-ldone')) continue;
      const v = e.getAttribute(attr) || '';
      if (!eligibleText(v)) continue;
      e.setAttribute('data-ldone', '1');
      units.push({ src: v, attr });
    }
  }
  if (eligibleText(doc.title)) units.push({ src: doc.title, attr: 'title' });
  return units;
}

/* Every static translatable unit across all pages, de-duplicated by normalised key. */
const NATIVE = new Set(LANGS.flatMap(l => [normKey(l.n), normKey(l.sub)]));
function harvestStatic() {
  const seen = new Map();
  for (const p of PAGES) {
    const dom = new JSDOM(fs.readFileSync(PUB + p, 'utf8'), { url: 'http://localhost/' + p });
    for (const u of collectUnits(dom.window.document)) {
      const k = normKey(u.src.length > 450 ? u.src.slice(0, 450) : u.src);
      if (!k || seen.has(k)) continue;
      if (ALLOW.includes(k) || NATIVE.has(k)) continue;
      // a unit that is nothing but URLs, API paths, abbreviations or punctuation is
      // deliberately left in English — it must not be reported as an untranslated string
      const rest = stripAllow(String(u.src).replace(/<[^>]+>/g, ' '))
        .replace(/\/api\/[a-z*/_-]+/gi, ' ').replace(/[^\p{L}\p{N}]+/gu, '');
      if (rest.length < 4) continue;
      seen.set(k, { src: u.src, page: p, attr: u.attr, whole: !!u.whole });
    }
  }
  return [...seen.values()];
}

/* The Ghost dictionary lives inline in assistant.js; pull the object literal out
   without executing the file (it touches the DOM at load time). */
function extractGhostDict() {
  const src = fs.readFileSync(PUB + 'assistant.js', 'utf8');
  const start = src.indexOf('const G = {');
  if (start < 0) throw new Error('cannot find G in assistant.js');
  let depth = 0, i = src.indexOf('{', start);
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) { i = k; break; } }
  }
  const literal = src.slice(src.indexOf('{', start), i + 1);
  const sb = {};
  vm.createContext(sb);
  return vm.runInContext('(' + literal + ')', sb);
}

function tags(s) {
  return (String(s).match(/<\s*([a-zA-Z][a-zA-Z0-9]*)/g) || []).map(t => t.replace(/<\s*/, '').toLowerCase()).sort().join(',');
}
function stripAllow(s) {
  let t = String(s || '');
  t = t.replace(/https?:\/\/\S+|www\.\S+|[\w.%-]+@[\w.-]+\.[A-Za-z]{2,}|[\w-]+\.[a-z]{2,}(\/\S*)?/gi, ' ');
  // word-boundary match: "company" must not lose its "pan", and "PAN" must be allowed
  for (const w of ALLOW) t = t.replace(new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), ' ');
  return t;
}
/* Returns null when acceptable, otherwise a reason string. */
function validate(src, out, mtl) {
  if (out == null || !String(out).trim()) return 'empty';
  if (String(out).trim() === String(src).trim()) return 'identical';
  if (/[A-Za-z]/.test(src) && !hasTargetScript(out, mtl)) return 'no-target-script';
  // quoted example names ("ABC Finserv", "Ravi K") are proper nouns by design: they must
  // not count as untranslated interface copy in the partial-translation ratio.
  const stripped = stripAllow(String(out).replace(/<[^>]+>/g, ' ').replace(/["“”][^"“”]{1,60}["“”]/g, ' '));
  const L = letters(stripped), LA = latin(stripped);
  if (L > 10 && LA / L > 0.25) return 'partial-translation';
  if (FUNCTAG.test(src)) return 'functional-tags';
  if (tags(src) && tags(src) !== tags(out)) return 'tags-changed';
  const sp = (String(src).match(/\{[a-z]+\}/g) || []).sort().join(',');
  const op = (String(out).match(/\{[a-z]+\}/g) || []).sort().join(',');
  if (sp !== op) return 'placeholder-changed';
  if (/MYMEMORY|INVALID|QUERY LENGTH/i.test(String(out))) return 'provider-warning';
  return null;
}

/* Content that must stay in English by design: API paths, code samples, URLs, e-mail,
   placeholders. Masked out before any leak analysis or machine translation so that
   "calls POST /api/ghost live" is not mistaken for an untranslated interface string. */
const SENT0 = '\uE000', SENT1 = '\uE001';
/* Sentinel characters are private-use code points derived from the token index, so they
   contain no letters and no digits. That matters: the currency/digit rules below run after
   the earlier rules, and a decimal sentinel like "\uE0002\uE001" would be matched again by
   the digit rule and renumber the token. */
function maskTokens(s) {
  let t = String(s || '');
  const values = [];
  const put = (v) => { const i = values.push(v) - 1; return String.fromCharCode(0xE100 + i) + String.fromCharCode(0xE200 + i); };
  t = t.replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, put);
  t = t.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, put);
  t = t.replace(/https?:\/\/\S+/g, put);
  t = t.replace(/www\.\S+/g, put);
  t = t.replace(/[\w.%-]+@[\w.-]+\.[A-Za-z]{2,}/g, put);
  t = t.replace(/\/api\/[a-z*/_-]+/g, put);
  t = t.replace(/\b[a-z0-9-]+\.(?:js|css|html|json|php|asp|com|net|org|in|co)\b(?:\/\S*)?/gi, put);
  t = t.replace(/\{[a-z]+\}/g, put);
  t = t.replace(/[""][^""]{1,60}[""]/g, put);
  t = t.replace(/\p{Sc}/gu, put);
  t = t.replace(/\d[\d,.]*/g, put);
  return { masked: t, values };
}

/* Leak analysis only: swaps protected content for inert tokens so a Latin run is never
   assembled out of an API path, a code sample or a currency amount. */
function maskTechnical(s) { return maskTokens(s).masked; }

/* Restores every masked token to its exact original text. */
function unmask(s, tokens) {
  let t = String(s == null ? '' : s);
  if (!tokens || !Array.isArray(tokens.values)) return t;
  for (let i = 0; i < tokens.values.length; i++) {
    const sent = String.fromCharCode(0xE100 + i) + String.fromCharCode(0xE200 + i);
    t = t.split(sent).join(tokens.values[i]);
  }
  return t;
}

/* Runs of >= 3 Latin words that survived translation, ignoring allowed terms. */
function latinRunsOf(value) {
  let t = maskTechnical(value).replace(/<[^>]+>/g, ' ');
  t = stripAllow(t);
  // Split on anything that is not a letter in any script. Keeping only letters means a run
  // can never span a script boundary, so a run is genuinely untranslated Latin text.
  t = t.replace(/[^\p{L}]+/gu, ' ').trim();
  const words = t.split(' ').filter(Boolean);
  const runs = [];
  let cur = [];
  for (const w of words) {
    if (/[A-Za-z]/.test(w)) cur.push(w);
    else { if (cur.length >= 3) runs.push(cur.join(' ')); cur = []; }
  }
  if (cur.length >= 3) runs.push(cur.join(' '));
  return runs;
}

/* English-leak check for a rendered value: returns the offending run or null. */
function leakRun(value) {
  const r = latinRunsOf(value);
  return r.length ? r[0] : null;
}

module.exports = { MARQUEE_SRC, maskTokens, LANGS, TARGET, PAGES, ALLOW, SCRIPT_RX, hasTargetScript, PUB, normKey, collectUnits, harvestStatic, extractGhostDict, validate, leakRun, latinRunsOf, maskTechnical, unmask, letters, latin, stripAllow };