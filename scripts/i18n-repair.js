/* Repair partially-translated entries in the hand-curated dictionaries.

   A whole-block entry such as

     <p class="kicker">The Ghost ... </p><h1>...</h1>

   can come back from the translator with one clause still in English. Because a
   whole-block value replaces its whole subtree, that single untranslated clause is
   what a user sees as a bilingual page. This script finds every dictionary value
   that still contains an unexpected run of English and re-translates it with the
   finer-grained strategies, replacing it in place. Regex (_TPL) sections are
   left untouched.

   Run: node scripts/i18n-repair.js [lang ...]      (default: all curated)
*/
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./i18n-lib');

const CURATED = ['hi', 'bn', 'mr', 'ta', 'te'];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let throttledUntil = 0;

/* Human-reviewed translations win over machine output. Several product kickers contain
   status wording ("The Ghost", "Payment-intent", "NOT VERIFIED") that the translator
   copies through verbatim; those are reviewed by hand here so a repair never depends on
   the provider being reachable. */
const REVIEWED = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'reviewed.json'), 'utf8')); }
  catch { return {}; }
})();
const reviewedFor = (mtl, text) => REVIEWED[`${mtl}|${text}`] || null;

async function gtx(text, mtl) {
  if (Date.now() < throttledUntil) return null;
  const one = text.length > 450 ? text.slice(0, 450) : text;
  const p = new URLSearchParams({ client: 'gtx', sl: 'en', tl: mtl, dt: 't' });
  p.append('q', one);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch('https://translate.googleapis.com/translate_a/single?' + p.toString(),
      { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const body = await r.text();
    if (!r.ok || body.startsWith('<')) { throttledUntil = Date.now() + 20000; return null; }
    const j = JSON.parse(body);
    return ((j[0] || []).map(r2 => (r2 && r2[0]) || '').join('')).trim() || null;
  } catch { return null; } finally { clearTimeout(to); }
}

/* tag-preserving + sentence-level fallbacks (mirrors scripts/i18n-build.js) */
function splitTags(src) {
  const parts = []; const re = /(<[^>]+>)/g; let last = 0, m;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) parts.push({ tag: false, s: src.slice(last, m.index) });
    parts.push({ tag: true, s: m[0] }); last = m.index + m[0].length;
  }
  if (last < src.length) parts.push({ tag: false, s: src.slice(last) });
  return parts;
}
const splitSentences = (s) => s.split(/(?<=[.!?।])\s+/).filter(Boolean);
const textIdx = (parts) => parts.map((p, i) => (p.tag ? -1 : i)).filter(i => i >= 0 && parts[i].s.trim());

async function translateMasked(text, mtl, tries) {
  const rev = reviewedFor(mtl, text);
  if (rev) return rev;
  const tok = L.maskTokens(text);
  for (let a = 0; a < (tries || 3); a++) {
    const got = await gtx(tok.masked, mtl);
    if (got != null) return L.unmask(got, tok);
    await sleep(1200 * (a + 1));
  }
  return null;
}

/* Strategy 1 (surgical, preferred): the block already translated correctly except for one
   clause. Source and value share an identical tag sequence, so the leaking text segments
   line up 1:1 — re-translate only those and splice them back. Everything already correct
   in the value is preserved byte-for-byte. */
async function repairSegments(src, val, mtl) {
  const S = splitTags(src), V = splitTags(val);
  const si = textIdx(S), vi = textIdx(V);
  if (si.length !== vi.length || !si.length) return null;
  let changed = false;
  for (let k = 0; k < vi.length; k++) {
    const vseg = V[vi[k]].s;
    if (!L.leakRun(vseg)) continue;
    let guard = 0;
    while (Date.now() < throttledUntil && guard++ < 40) await sleep(1000);
    const t = await translateMasked(S[si[k]].s, mtl, 4);
    await sleep(300);
    if (t && !L.leakRun(t) && !L.validate(S[si[k]].s, t, mtl)) {
      V[vi[k]] = { tag: false, s: t };
      changed = true;
    }
  }
  if (!changed) return null;
  const joined = V.map(p => p.s).join('');
  return L.validate(src, joined, mtl) ? null : joined;
}

/* Strategy 2: translate every text segment, keeping markup exactly. */
async function repair(src, mtl) {
  const direct = await translateMasked(src, mtl, 2);
  if (direct && !L.validate(src, direct, mtl) && !L.leakRun(direct)) return direct;

  if (/<[^>]+>/.test(src)) {
    const parts = splitTags(src); const out = []; let bad = false;
    for (const p of parts) {
      if (p.tag || !p.s.trim()) { out.push(p.s); continue; }
      const t = await translateMasked(p.s, mtl, 3);
      if (t == null) { bad = true; break; }
      out.push(t); await sleep(250);
    }
    if (!bad) {
      const joined = out.join('');
      if (!L.validate(src, joined, mtl) && !L.leakRun(joined)) return joined;
    }
  }

  const sents = splitSentences(String(src));
  if (sents.length > 1) {
    const out = []; let bad = false;
    for (const s of sents) {
      const t = await translateMasked(s, mtl, 3);
      if (t == null) { bad = true; break; }
      out.push(t); await sleep(250);
    }
    if (!bad) {
      const joined = out.join(' ');
      if (!L.validate(src, joined, mtl) && !L.leakRun(joined)) return joined;
    }
  }
  return null;
}

function readEntries(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*\["((?:[^"\\]|\\.)*)",\s*(.*)\],?\s*$/);
    if (!m) continue;
    let src;
    try { src = JSON.parse('"' + m[1] + '"'); } catch { continue; }
    let val = null;
    try { val = JSON.parse(m[2].replace(/,\s*$/, '')); } catch { /* non-JSON value, skip */ }
    if (val != null) out.push({ line: i, src, val });
  }
  return { lines, entries: out };
}

(async () => {
  const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const langs = only.length ? only : CURATED;
  const { LANGS } = L;
  let fixedTotal = 0, stuckTotal = 0;

  for (const code of langs) {
    const meta = LANGS.find(x => x.c === code);
    if (!meta) { console.log('unknown language ' + code); continue; }
    const file = path.join(L.PUB, `dict-${code}.js`);
    if (!fs.existsSync(file)) { console.log('no dict file for ' + code); continue; }

    const { lines, entries } = readEntries(file);
    const leaking = entries.filter(e => L.leakRun(e.val));
    console.log(`\n=== ${code}: ${entries.length} entries, ${leaking.length} with English leaks ===`);
    if (!leaking.length) continue;

    let fixed = 0; const stuck = [];
    for (const e of leaking) {
      let guard = 0;
      while (Date.now() < throttledUntil && guard++ < 40) await sleep(1000);
      let got = await repairSegments(e.src, e.val, meta.m);
      if (!got) got = await repair(e.src, meta.m);
      if (got && !L.leakRun(got)) {
        lines[e.line] = lines[e.line].replace(/(\[\s*"(?:[^"\\]|\\.)*",\s*)(.*)(\],?\s*)$/, (s, a, _b, c) => a + JSON.stringify(got) + c);
        fixed++;
        console.log(`  fixed: ${e.src.slice(0, 60).replace(/\s+/g, ' ')}`);
      } else {
        stuck.push(e);
        console.log(`  STUCK: [${(L.leakRun(e.val) || '').slice(0, 40)}] ${e.src.slice(0, 60).replace(/\s+/g, ' ')}`);
      }
      await sleep(400);
    }
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log(`  ${code}: fixed ${fixed}, stuck ${stuck.length}`);
    fixedTotal += fixed; stuckTotal += stuck.length;
  }
  console.log(`\nREPAIR DONE. fixed ${fixedTotal}, still leaking ${stuckTotal}`);
})().catch(e => { console.error('REPAIR FAILED', e); process.exit(1); });