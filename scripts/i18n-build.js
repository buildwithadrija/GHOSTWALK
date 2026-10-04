/* Build complete, local, offline dictionaries for every supported GHOSTWALK language.

   Why this exists
   ----------------
   Static interface copy must be deterministic and available immediately. It used to be
   machine-translated in the browser at render time, so a failed/slow request left English
   fragments inside an otherwise translated page. All fixed copy is now translated ONCE,
   here, validated, and written to disk. The browser only ever reads local files.

   The 5 hand-curated languages (hi, bn, mr, ta, te) keep their existing dict-<lang>.js,
   which is loaded directly. This script generates dict files for the remaining 17.

   Usage:  node scripts/i18n-build.js [lang ...]      (default: all pending)
          node scripts/i18n-build.js --force           (re-translate everything)
*/
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./i18n-lib');

const OUT_DIR = path.join(L.PUB, 'i18n');
const CURATED = ['hi', 'bn', 'mr', 'ta', 'te'];
const POOL = 3;
const GAP = 500;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* Hand-reviewed strings win over machine output everywhere, not just in the repair script:
   a reviewed translation is never overwritten by (or blocked on) the provider. */
const REVIEWED = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'reviewed.json'), 'utf8')); }
  catch { return {}; }
})();
const reviewedFor = (mtl, text) => REVIEWED[`${mtl}|${text}`] || null;

/* Google throttles hard under concurrency and answers with an HTML "Sorry..." page.
   Detect that explicitly instead of letting JSON.parse throw. */
let throttledUntil = 0;
async function gtx(text, mtl) {
  if (Date.now() < throttledUntil) return null;
  const one = text.length > 450 ? text.slice(0, 450) : text;
  const p = new URLSearchParams({ client: 'gtx', sl: 'en', tl: mtl, dt: 't' });
  p.append('q', one);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch('https://translate.googleapis.com/translate_a/single?' + p.toString(), {
      signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const body = await r.text();
    if (!r.ok || body.startsWith('<')) {
      // back the whole run off so we stop hammering while Google is unhappy
      throttledUntil = Date.now() + 20000;
      return null;
    }
    const j = JSON.parse(body);
    const t = ((j[0] || []).map(row => (row && row[0]) || '').join('')).trim();
    return t || null;
  } catch { return null; } finally { clearTimeout(to); }
}

async function translateAll(items, mtl, label) {
  const out = new Array(items.length).fill(null);
  let done = 0;
  for (let i = 0; i < items.length; i += POOL) {
    // honour a global cooldown from a previous throttled round
    let guard = 0;
    while (Date.now() < throttledUntil && guard++ < 40) await sleep(1000);

    const idx = [];
    for (let k = i; k < Math.min(i + POOL, items.length); k++) idx.push(k);
    await Promise.all(idx.map(async k => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const t = await gtx(items[k], mtl);
        if (t) { out[k] = t; return; }
        await sleep(900 * (attempt + 1));
      }
    }));
    done += idx.length;
    process.stdout.write(`  ${label} ${done}/${items.length}\r`);
    await sleep(GAP);
  }
  process.stdout.write('\n');
  return out;
}

/* --- repair strategies -------------------------------------------------
   A single pass over a long mixed-markup string frequently comes back partially
   translated, with a tag dropped, or with a {placeholder} mangled. Rather than
   accepting an English fragment (which is what produces a bilingual page), retry
   with progressively finer granularity until the result validates. */
function splitTags(src) {
  const parts = [];
  const re = /(<[^>]+>)/g;
  let last = 0, m;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) parts.push({ tag: false, s: src.slice(last, m.index) });
    parts.push({ tag: true, s: m[0] });
    last = m.index + m[0].length;
  }
  if (last < src.length) parts.push({ tag: false, s: src.slice(last) });
  return parts;
}
const splitSentences = (s) => s.split(/(?<=[.!?।])\s+/).filter(Boolean);

async function translateMasked(text, mtl) {
  const tok = L.maskTokens(text);
  const got = await gtx(tok.masked, mtl);
  return got == null ? null : L.unmask(got, tok);
}

/* Returns {ok:true, out} or {ok:false, err} */
async function translateUnit(src, mtl, direct) {
  const rev = reviewedFor(mtl, src);
  if (rev && !L.validate(src, rev, mtl)) return { ok: true, out: rev };
  if (direct != null && !L.validate(src, direct, mtl)) return { ok: true, out: direct };

  // strategy 2: keep markup exactly, translate only the text between tags
  if (/<[^>]+>/.test(src)) {
    const parts = splitTags(src);
    const out = [];
    let bad = false;
    for (const p of parts) {
      if (p.tag) { out.push(p.s); continue; }
      if (!p.s.trim()) { out.push(p.s); continue; }
      const t = await translateMasked(p.s, mtl);
      if (t == null) { bad = true; break; }
      out.push(t);
    }
    if (!bad) {
      const joined = out.join('');
      if (!L.validate(src, joined, mtl)) return { ok: true, out: joined };
    }
  }

  // strategy 3: sentence by sentence, so one stubborn clause cannot spoil the rest
  const sents = splitSentences(String(src));
  if (sents.length > 1) {
    const out = [];
    let bad = false;
    for (const s of sents) {
      const t = await translateMasked(s, mtl);
      if (t == null) { bad = true; break; }
      out.push(t);
    }
    if (!bad) {
      const joined = out.join(' ');
      if (!L.validate(src, joined, mtl)) return { ok: true, out: joined };
    }
  }

  return { ok: false, err: direct == null ? 'provider-failed' : (L.validate(src, direct, mtl) || 'untranslated') };
}

(async () => {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  /* Ghost-only mode fills in keys added to the Ghost dictionary after a
     language's hand-maintained file was written (the Ghost AI packs, for
     example). It writes to a separate file that only carries GW_GHOST_PRE, so
     it can never override the hand-curated static dictionary. */
  const ghostOnly = args.includes('--ghost-only');
  const only = args.filter(a => !a.startsWith('--'));

  const staticUnits = L.harvestStatic();
  const G = L.extractGhostDict();
  const ghostStrings = [];
  for (const k of Object.keys(G.en)) {
    const v = G.en[k];
    if (typeof v === 'string') ghostStrings.push({ kind: 's', key: k, src: v });
    else if (Array.isArray(v)) v.forEach((s, i) => { if (typeof s === 'string') ghostStrings.push({ kind: 'a', key: k, i, src: s }); });
  }

  console.log(`static units: ${staticUnits.length}`);
  console.log(`ghost strings: ${ghostStrings.length} (keys: ${Object.keys(G.en).length})`);

  const outDir = ghostOnly ? path.join(L.PUB, 'i18n-ghost') : OUT_DIR;
  fs.mkdirSync(outDir, { recursive: true });

  const langs = L.TARGET.filter(l => only.length
    ? only.includes(l.c)
    : ghostOnly || !CURATED.includes(l.c));
  if (!langs.length) { console.log('nothing to build (curated languages are hand-maintained; use --ghost-only for new Ghost keys)'); return; }

  let failedTotal = 0;

  for (const { c, n, m } of langs) {
    const file = path.join(outDir, `${c}.js`);
    let prev = { pairs: [], ghost: {}, marquee: [] };
    if (!force && fs.existsSync(file)) {
      try {
        const sb = { window: {} };
        require('vm').createContext(sb);
        require('vm').runInContext(fs.readFileSync(file, 'utf8'), sb);
        prev.pairs = (sb.window.DICT_PRE || {})[c] || [];
        prev.ghost = (sb.window.GW_GHOST_PRE || {})[c] || {};
        prev.marquee = (sb.window.MARQUEE_PRE || {})[c] || [];
      } catch (e) {
        /* a previous file that cannot even be parsed is reported, never
           silently treated as empty: rebuilding from scratch over it would
           machine-translate hundreds of already-reviewed units */
        console.log(`  warning: could not read previous ${path.basename(file)} (${e && e.message}); will not overwrite it blindly`);
        prev.broken = true;
      }
    }

    const haveStatic = new Set(prev.pairs.map(p => L.normKey(String(p[0]).slice(0, 450))));
    const todoStatic = ghostOnly ? [] : staticUnits.filter(u => !haveStatic.has(L.normKey(String(u.src).slice(0, 450))));
    /* per-unit resume identity: each ghost unit is kind+key+index, so an array
       entry counts per filled slot. Comparing raw map keys against composite
       ids (as before) never matched, silently re-translating everything. */
    const gid = (kind, key, i) => kind + ':' + key + ':' + (i == null ? '-' : i);
    const haveGhost = new Set();
    for (const [kk, vv] of Object.entries(prev.ghost)) {
      if (Array.isArray(vv)) vv.forEach((x, i) => { if (x) haveGhost.add(gid('a', kk, i)); });
      else if (vv) haveGhost.add(gid('s', kk));
    }
    const todoGhost = ghostStrings.filter(g => !haveGhost.has(gid(g.kind, g.key, g.i)));
    // JS-assembled marquee copy: resumed from the previous file exactly like the rest
    const marquee = (prev.marquee || []).slice();
    const todoMarquee = ghostOnly ? [] : L.MARQUEE_SRC.map((s, i) => i).filter(i => !marquee[i]);

    const total = todoStatic.length + todoGhost.length + todoMarquee.length;
    console.log(`\n=== ${c} (${n}) : ${total} to translate (have ${prev.pairs.length} static, ${Object.keys(prev.ghost).length} ghost, ${marquee.filter(Boolean).length} marquee) ===`);
    if (!total) { console.log('  complete'); continue; }

    const results = await translateAll(
      todoStatic.map(u => u.src).concat(todoGhost.map(g => g.src), todoMarquee.map(i => L.MARQUEE_SRC[i])), m, c);

    const pairs = prev.pairs.slice();
    const ghost = Object.assign({}, prev.ghost);
    const skipped = [];

    // direct pass first, then repair only the units that failed validation
    const needRepair = [];
    const acceptDirect = (src, got, label) => {
      const rev = reviewedFor(m, src);
      if (rev && !L.validate(src, rev, m)) return rev;
      if (got != null && !L.validate(src, got, m)) return got;
      needRepair.push({ src, got, label });
      return null;
    };

    todoStatic.forEach((u, i) => {
      const t = acceptDirect(u.src, results[i], 'static');
      if (t != null) pairs.push([u.src, t]);
    });
    todoGhost.forEach((g, k) => {
      const t = acceptDirect(g.src, results[todoStatic.length + k], 'ghost');
      if (t != null) {
        if (g.kind === 's') ghost[g.key] = t;
        else { if (!Array.isArray(ghost[g.key])) ghost[g.key] = []; ghost[g.key][g.i] = t; }
      }
    });
    todoMarquee.forEach((mi, k) => {
      const src = L.MARQUEE_SRC[mi];
      const t = acceptDirect(src, results[todoStatic.length + todoGhost.length + k], 'marquee');
      if (t != null) marquee[mi] = t;
    });

    if (needRepair.length) {
      console.log(`  repairing ${needRepair.length} unit(s) with finer segmentation...`);
      for (const r of needRepair) {
        const res = await translateUnit(r.src, m, r.got);
        if (!res.ok) { skipped.push({ label: r.label, err: res.err, src: String(r.src).slice(0, 70).replace(/\s+/g, " ") }); continue; }
        if (r.label === 'static') pairs.push([r.src, res.out]);
        else if (r.label === 'marquee') { const mi = L.MARQUEE_SRC.indexOf(r.src); if (mi >= 0) marquee[mi] = res.out; }
        else {
          const g = todoGhost.find(x => x.src === r.src);
          if (g) { if (g.kind === 's') ghost[g.key] = res.out; else { if (!Array.isArray(ghost[g.key])) ghost[g.key] = []; ghost[g.key][g.i] = res.out; } }
        }
      }
    }

    const body = pairs.map(([a, b]) => `[${JSON.stringify(a)}, ${JSON.stringify(b)}],`).join('\n');
    const ghostBody = JSON.stringify(ghost, null, 0);
    /* monotonicity: a generated file may only ever gain keys, never lose
       them. If the previous file cannot be read, or this run produced fewer
       keys than it had (mass machine-translation failure), keep the old file
       and report instead of publishing a regression. */
    const prevCount = Object.keys(prev.ghost).length;
    const newCount = Object.keys(ghost).length;
    if (prev.broken) { console.log(`  kept previous ${c}.js (unreadable prev file; refusing blind rewrite)`); failedTotal++; continue; }
    if (newCount < prevCount) {
      console.log(`  kept previous ${c}.js (${prevCount} -> ${newCount} keys would be a regression)`);
      failedTotal++;
      continue;
    }
    if (ghostOnly) {
      /* Ghost keys only. Keeping this in a file of its own means a generated
         string can never reach the hand-curated static dictionary. */
      if (!Object.keys(ghost).length) { console.log('  no ghost keys'); continue; }
      fs.writeFileSync(file, `/* GHOSTWALK ${n} (${c}) — generated Ghost keys by scripts/i18n-build.js --ghost-only. Do not edit by hand. */
window.GW_GHOST_PRE = window.GW_GHOST_PRE || {};
window.GW_GHOST_PRE[${JSON.stringify(c)}] = ${ghostBody};
`, 'utf8');
      console.log(`  wrote ${path.relative(process.cwd(), file)} — ${Object.keys(ghost).length} ghost`);
      if (skipped.length) failedTotal += skipped.length;
      continue;
    }
    // only emit the marquee table when every item translated, otherwise common.js would
    // render a half-translated strip
    const marqueeBody = marquee.length === L.MARQUEE_SRC.length && marquee.every(Boolean)
      ? JSON.stringify(marquee) : '';
    if (!marqueeBody) console.log(`  marquee incomplete (${marquee.filter(Boolean).length}/${L.MARQUEE_SRC.length}) — MARQUEE_PRE omitted`);
    const out = `/* GHOSTWALK ${n} (${c}) — generated by scripts/i18n-build.js. Do not edit by hand. */
/* Static interface units: ${pairs.length} · Ghost keys: ${Object.keys(ghost).length} */
window.DICT_PRE = window.DICT_PRE || {};
window.DICT_PRE[${JSON.stringify(c)}] = [
${body}
];
window.GW_GHOST_PRE = window.GW_GHOST_PRE || {};
window.GW_GHOST_PRE[${JSON.stringify(c)}] = ${ghostBody};
${marqueeBody ? `window.MARQUEE_PRE = window.MARQUEE_PRE || {};
window.MARQUEE_PRE[${JSON.stringify(c)}] = ${marqueeBody};
` : ''}`;
    fs.writeFileSync(file, out, 'utf8');
    console.log(`  wrote ${path.relative(process.cwd(), file)} — ${pairs.length} static, ${Object.keys(ghost).length} ghost`);
    if (skipped.length) {
      failedTotal += skipped.length;
      console.log(`  ${skipped.length} rejected:`);
      for (const s of skipped.slice(0, 12)) console.log(`    [${s.err}] ${s.label}: ${s.src}`);
      if (skipped.length > 12) console.log(`    ... +${skipped.length - 12} more`);
    }
  }

  console.log(`\nBUILD DONE. rejected units: ${failedTotal}`);
  if (failedTotal) console.log('Re-run the same command to retry only the rejected units (existing pairs are kept).');
})().catch(e => { console.error('BUILD FAILED', e); process.exit(1); });