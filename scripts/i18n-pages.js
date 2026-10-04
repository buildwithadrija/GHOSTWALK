/* Rendered-page leak audit.
   Loads each real page in jsdom with every network call blocked, lets the production
   scripts apply the selected language, then walks the rendered text and reports any run of
   untranslated Latin words using the same detector as the dictionary tooling.

   The script list is read out of each HTML file and the allow-list comes from i18n-lib, so
   this test cannot drift away from what the site actually ships.

   Usage:  node scripts/i18n-pages.js [lang ...]      (default: every supported language) */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const L = require('./i18n-lib');

const PUB = L.PUB;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const VERBOSE = process.argv.includes('--verbose');
/* Shown only because this test blocks every request, including the page's own /api probe.
   It is an English server-status notice, not translated interface copy. */
const HARNESS_ARTIFACT = 'offline preview mode';

const scriptSrcs = (html) =>
  [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)]
    .map(m => m[1])
    // third-party CDN bundles are not part of the translation surface and are not on disk
    .filter(src => !/^https?:/i.test(src));
const inlineScripts = (html) =>
  [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]).filter(s => s.trim());

async function render(lang, page) {
  const file = path.join(PUB, page);
  const html = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost:3000/' + page + '?gwaudit=1',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  });
  const { window } = dom;
  window.localStorage.setItem('gw_lang', lang);
  window.localStorage.setItem('gw_haslang', '1');
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.speechSynthesis = { getVoices: () => [], speak() {}, cancel() {} };
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  // no translation provider, no API: a passing run must be produced by baked dictionaries
  window.fetch = async () => { throw new Error('BLOCKED'); };

  const errs = [];
  // Classic scripts share one global lexical scope, so `const $` in common.js is visible to
  // later scripts. Separate eval() calls would each get their own scope and every inline
  // handler would fail with "$ is not defined", so evaluate the page's scripts as one unit.
  const parts = [];
  for (const src of scriptSrcs(html)) {
    const p = path.join(PUB, src);
    if (!fs.existsSync(p)) { errs.push('missing script ' + src); continue; }
    parts.push(fs.readFileSync(p, 'utf8'));
  }
  for (const code of inlineScripts(html)) parts.push(code);
  const quiet = window.console.log;
  const audit = [];
  const record = (...a) => {
    if (!VERBOSE) return;
    const s = a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
    if (s.includes('gwaudit')) audit.push(s);
  };
  window.console.log = record;
  window.console.warn = record;
  try { window.eval(parts.join('\n;\n')); } catch (e) { errs.push('scripts: ' + e.message); }
  window.console.log = quiet;
  try { await window.eval('(async () => { try { await translateNode(document); } catch (e) {} })()'); } catch {}
  await sleep(400);
  // the translation pass records every unit it had to leave in English
  let miss = [];
  try { miss = window.eval('window._gwMiss ? Array.from(window._gwMiss) : []'); } catch {}
  // regions that have no translation on purpose
  try { window.eval("document.querySelectorAll('script,style,noscript,code,pre,[data-keep]').forEach(n => n.remove())"); } catch {}

  const texts = window.eval(`(function () {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = (n.nodeValue || '').replace(/\\s+/g, ' ').trim();
      if (t) out.push(t);
    }
    return out;
  })()`);
  dom.window.close();
  return { errs, texts, audit, miss };
}

(async () => {
  const langs = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const list = langs.length ? langs : L.TARGET.map(t => t.c);
  let leaks = 0;
  let scriptErrs = 0;
  const missed = new Map();

  for (const c of list) {
    const meta = L.TARGET.find(t => t.c === c);
    const name = meta ? meta.n : c;
    const rows = [];
    for (const page of L.PAGES) {
      const { errs, texts, audit, miss } = await render(c, page);
      if (errs.length) { scriptErrs += errs.length; console.log(`  !! ${page}: ${errs.join(' | ')}`); }
      for (const k of (miss || [])) {
        if (!missed.has(c)) missed.set(c, new Set());
        missed.get(c).add(String(k));
      }
      const bad = [];
      for (const t of texts) {
        if (t.toLowerCase().includes(HARNESS_ARTIFACT)) continue;
        const run = L.leakRun(t);
        if (run) bad.push(run);
      }
      const uniq = [...new Set(bad)];
      if (uniq.length) leaks += uniq.length;
      rows.push({ page, ok: !uniq.length, uniq });
    }
    const failed = rows.filter(r => !r.ok);
    console.log(`${failed.length ? 'FAIL' : 'PASS'}  ${c.padEnd(4)} ${name.padEnd(12)} ${rows.length - failed.length}/${rows.length} pages clean`);
    for (const f of failed) console.log(`        ${f.page}: ${f.uniq.slice(0, 4).map(u => JSON.stringify(u)).join(', ')}`);
  }

  if (VERBOSE && missed.size) {
    console.log('\nunits with no local translation:');
    for (const [c, set] of missed) {
      console.log(`  ${c}:`);
      for (const k of set) console.log(`    ${JSON.stringify(k)}`);
    }
  }
  console.log('');
  if (scriptErrs) console.log(`${scriptErrs} script error(s) while loading pages.`);
  console.log(leaks === 0 ? 'NO ENGLISH LEAKS' : leaks + ' LEAK GROUP(S)');
  process.exit(leaks === 0 && scriptErrs === 0 ? 0 : 1);
})();