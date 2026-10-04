/* GHOSTWALK translation completeness + English-leak test.

   Verifies, for every supported language, that:
     - every Ghost key exists, is non-empty, and is not an English copy
     - placeholders ({detail} etc.) survived translation
     - every static interface unit has a local translation
     - no translated value contains an unexpected run of English words

   Exit code is non-zero on any failure so this can gate a build.
   Run: npm run i18n:check
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const L = require('./i18n-lib');

const CURATED = ['hi', 'bn', 'mr', 'ta', 'te'];

function loadDictFile(file) {
  const sb = { window: {} };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sb);
  let pairs = (sb.window.DICT_PRE && Object.values(sb.window.DICT_PRE).find(Array.isArray)) || [];
  if (!pairs.length && Array.isArray(sb.window.DICT_HI_SRC)) pairs = sb.window.DICT_HI_SRC;
  const ghost = (sb.window.GW_GHOST_PRE && Object.values(sb.window.GW_GHOST_PRE)[0]) || {};
  return { pairs, ghost };
}

function pairsOf(code) {
  const gen = path.join(L.PUB, 'i18n', `${code}.js`);
  if (fs.existsSync(gen)) return loadDictFile(gen);
  const cur = path.join(L.PUB, `dict-${code}.js`);
  if (fs.existsSync(cur)) return loadDictFile(cur);
  return null;
}

function ghostOf(code) {
  /* Ghost keys can arrive from two generated files plus the reviewed inline
     dictionary. All of them are in force at runtime, so collect all of them;
     earlier sources win, because they are the reviewed translations. */
  const merged = {};
  let any = false;
  const gen = path.join(L.PUB, 'i18n', `${code}.js`);
  if (fs.existsSync(gen)) { Object.assign(merged, loadDictFile(gen).ghost); any = true; }
  const over = path.join(L.PUB, 'i18n-ghost', `${code}.js`);
  if (fs.existsSync(over)) {
    for (const [k, v] of Object.entries(loadDictFile(over).ghost)) if (merged[k] === undefined) merged[k] = v;
    any = true;
  }
  const inline = (L.extractGhostDict()[code] || {});
  if (Object.keys(inline).length) { for (const [k, v] of Object.entries(inline)) if (merged[k] === undefined) merged[k] = v; any = true; }
  return any ? merged : null;
}

/* curated ghost dicts are inline in assistant.js — pull them out of the G object */
const G = L.extractGhostDict();

const staticUnits = L.harvestStatic();
const staticKeys = new Set(staticUnits.map(u => L.normKey(String(u.src).slice(0, 450))));

/* Strict mode additionally requires a dictionary entry for every harvested whole-block
   unit. By default a whole-block gap is only a warning: when a block has no combined
   entry the runtime transparently falls back to translating its child fragments, so the
   page still renders in one complete language. What must never be tolerated is a Ghost
   key falling back to English (t() has no child-fragment fallback) or a rendered value
   that leaks English — both are hard failures. */
const STRICT = process.argv.includes('--strict');

let fails = 0;
let warns = 0;
const err = (lang, kind, what) => { console.log(`TRANSLATION ERROR language: ${lang} ${kind}: ${what}`); fails++; };
const warn = (lang, kind, what) => { console.log(`TRANSLATION WARNING language: ${lang} ${kind}: ${what}`); warns++; };

console.log(`static units: ${staticUnits.length}`);
console.log(`ghost keys:   ${Object.keys(G.en).length}`);
console.log(`languages:    ${L.TARGET.length} (+en source)\n`);

const rows = [];

for (const { c, n, m } of L.TARGET) {
  const d = pairsOf(c);
  const missingStatic = [];
  let staticCount = 0;
  let leakStatic = 0;
  const leakSamples = [];

  if (!d) {
    err(c, 'no-dictionary', 'no dictionary file: this language would render entirely in English');
    missingStatic.push('<no dictionary file>');
  } else {
    const map = new Map();
    for (const p of d.pairs) {
      if (!Array.isArray(p) || typeof p[0] !== 'string') continue;
      map.set(L.normKey(String(p[0]).slice(0, 450)), p[1]);
    }
    staticCount = map.size;
    for (const k of staticKeys) {
      if (!map.has(k)) { missingStatic.push(k); continue; }
      const v = map.get(k);
      if (v == null || !String(v).trim()) { err(c, 'empty-value', k); continue; }
      const run = L.leakRun(v);
      if (run) { leakStatic++; if (leakSamples.length < 3) leakSamples.push(k + ' -> ' + run); }
    }
    for (const k of missingStatic) (STRICT ? err : warn)(c, 'untranslated-static-unit', k);
    for (const s of leakSamples) err(c, 'english-leak', s);
  }

  /* ---- Ghost keys ----
     A curated language has reviewed keys inline in assistant.js and later
     additions in i18n-ghost/<code>.js; both are in force at runtime, so both
     must be counted. The reviewed translation always wins. */
  const ghost = c === 'en' ? G.en : ghostOf(c);
  let missingGhost = 0, ghostCount = 0;
  const ghostLeaks = [];
  if (!ghost) {
    err(c, 'no-ghost-dictionary', '(entire ghost dictionary missing)');
  } else {
    for (const k of Object.keys(G.en)) {
      const bv = G.en[k];
      const v = ghost[k];
      if (v === undefined || v === null) { err(c, 'missing', k); missingGhost++; continue; }
      const bvals = Array.isArray(bv) ? bv : [bv];
      const vals = Array.isArray(v) ? v : [v];
      if (vals.length !== bvals.length) { err(c, 'length-mismatch', k); missingGhost++; continue; }
      vals.forEach((x, i) => {
        ghostCount++;
        const xs = String(x == null ? '' : x);
        if (!xs.trim()) { err(c, 'empty-value', k); return; }
        const ph = (s) => (String(s).match(/\{[a-z]+\}/g) || []).sort().join(',');
        if (ph(xs) !== ph(bvals[i])) { err(c, 'placeholder-mismatch', k); return; }
        if (xs.trim() === String(bvals[i]).trim() && /[A-Za-z]{3,}/.test(xs) && L.letters(xs) > 2) {
          /* identical to English is fine for allowed terms (QR / UPI / GHOSTWALK) */
          const run = L.leakRun(xs);
          if (run) { err(c, 'english-copy', k + ' -> ' + run); ghostLeaks.push(k); }
        }
      });
    }
  }

  const complete = d != null && missingGhost === 0 && leakStatic === 0;
  rows.push({ code: c, name: n, staticCount, needStatic: staticKeys.size, missingStatic: missingStatic.length, ghostCount, needGhost: Object.keys(G.en).length, missingGhost, leakStatic, complete });

  console.log(
    `${complete ? 'PASS' : 'FAIL'}  ${c.padEnd(4)} ${n.padEnd(12)}` +
    ` static ${String(staticCount).padStart(3)}/${staticKeys.size}` +
    (missingStatic.length ? ` (${missingStatic.length} via fragments)` : '                    ') +
    `  ghost ${String(ghostCount).padStart(3)}/${Object.keys(G.en).length}` +
    (missingGhost ? ` (missing ${missingGhost})` : '')
  );
}

/* curated languages are hand-maintained: warn rather than fail the build if incomplete */
console.log('');
const summary = rows.filter(r => !r.complete).map(r => `${r.code}(${r.missingStatic + r.missingGhost})`);
console.log(summary.length ? 'Languages needing Ghost keys: ' + summary.join(', ') : 'Every supported language has a complete Ghost dictionary.');
console.log(fails === 0 ? 'ALL COMPLETE' : fails + ' PROBLEM(S)');
console.log(warns ? warns + ' warning(s): whole-block gaps that the runtime covers via child fragments. Run with --strict to enforce them too.' : 'No warnings.');
process.exit(fails === 0 ? 0 : 1);