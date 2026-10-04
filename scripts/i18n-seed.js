/* Reviewed translations for interface copy that has no entry in a curated dictionary at all.

   Two kinds of unit land here:
     - page titles. The browser tab is interface copy, and the runtime deliberately does not
       machine-translate document.title, so a missing entry stays English until it is seeded.
     - whole footer strips that the machine translator keeps returning in English because
       they are built from API paths, currency amounts and product names.

   Everything here is hand-written, so it is safe from provider rate limits and can be
   reviewed as prose. Run `node scripts/i18n-seed.js` to upsert it into the curated files.

   Each dictionary holds more than one array: the plain pair list plus a `*_TPL` list of
   [RegExp, replacement] rewrite rules. Seeding has to hit the pair list, so the target is
   named explicitly per language. The script also removes any copy of a seeded pair that is
   sitting in the wrong array, which keeps it safe to re-run after a partial write. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PUB = path.join(__dirname, '..', 'public');

/* Where the [source, translation] pairs live for each curated language. */
const TARGET = {
  hi: { header: /window\.DICT_HI_SRC\s*=\s*\[/, read: sb => sb.window.DICT_HI_SRC },
  bn: { header: /window\.DICT_PRE\["bn"\]\s*=\s*\[/, read: sb => sb.window.DICT_PRE.bn },
  mr: { header: /window\.DICT_PRE\["mr"\]\s*=\s*\[/, read: sb => sb.window.DICT_PRE.mr },
  ta: { header: /window\.DICT_PRE\["ta"\]\s*=\s*\[/, read: sb => sb.window.DICT_PRE.ta },
  te: { header: /window\.DICT_PRE\["te"\]\s*=\s*\[/, read: sb => sb.window.DICT_PRE.te }
};

/* Page titles, keyed by the exact <title> text in the HTML (em dash, U+2014). */
const TITLES = {
  'GHOSTWALK — Send a dummy. Not yourself.': {
    hi: 'GHOSTWALK — डमी भेजें, खुद को नहीं।',
    bn: 'GHOSTWALK — নকল পাঠান, নিজেকে নয়।',
    mr: 'GHOSTWALK — फक्त नक्कल पाठवा, स्वतःला नको.',
    ta: 'GHOSTWALK — போலியை அனுப்புங்கள், உங்களை அல்ல.',
    te: 'GHOSTWALK — బట్టాను పంపండి, మిమ్మల్ని కాదు.'
  },
  'Check a message — GHOSTWALK': {
    hi: 'संदेश जाँचें — GHOSTWALK',
    bn: 'বার्ता যাচাই करুন — GHOSTWALK',
    mr: 'संदेश तपासा — GHOSTWALK',
    ta: 'செய்தியைச் சரிபார்க்கவும் — GHOSTWALK',
    te: 'సందేశాన్ని తనిఖీ చేయండి — GHOSTWALK'
  },
  'Walk a link — GHOSTWALK': {
    hi: 'लिंक चलें — GHOSTWALK',
    bn: 'লিঙ্কে হেঁটে দেখুন — GHOSTWALK',
    mr: 'लिंकवर चला — GHOSTWALK',
    ta: 'இணைப்பைப் பின்தொடரவும் — GHOSTWALK',
    te: 'లింక్‌పై నడక — GHOSTWALK'
  },
  'Decode QR / UPI — GHOSTWALK': {
    hi: 'QR / UPI डिकोड करें — GHOSTWALK',
    bn: 'QR / UPI ডিকোড করুন — GHOSTWALK',
    mr: 'QR / UPI डिकोड करा — GHOSTWALK',
    ta: 'QR / UPI டிகோட் செய்யவும் — GHOSTWALK',
    te: 'QR / UPI డీకోడ్ చేయండి — GHOSTWALK'
  },
  'Alert someone I trust — GHOSTWALK': {
    hi: 'किसी भरोसेमंद को चेतावनी दें — GHOSTWALK',
    bn: 'বিশ্বস্ত কাউকে সতর্ক করুন — GHOSTWALK',
    mr: 'विश्वासार्ह व्यक्तीला सावध करा — GHOSTWALK',
    ta: 'நம்பியவரிடம் எச்சரிக்கவும் — GHOSTWALK',
    te: 'నమ్మకమైన వ్యక్తికి హెచ్చరించండి — GHOSTWALK'
  },
  'I already paid — GHOSTWALK Recovery': {
    hi: 'मैंने भुगतान कर दिया — GHOSTWALK रिकवरी',
    bn: 'আমি টাকা দিয়ে ফেলেছি — GHOSTWALK রিকভারি',
    mr: 'मी पैसे दिले — GHOSTWALK रिकव्हरी',
    ta: 'நான் பணம் செலுத்திவிட்டேன் — GHOSTWALK மீட்பு',
    te: 'నేను డబ్బు చెల్లించేశాను — GHOSTWALK రికవరీ'
  }
};

/* Strips the translator leaves in English. <code>/api/*</code> and the rupee amount are kept
   exactly as they appear in the page. */
const STRIPS = {
  ta: {
    'SANGYAN Investor Resilience · Pages call live <code>/api/*</code> on this server. Demo: ₹25,000 unlock-fee trap.':
      'சாங்யன் நரம்புறக்கட்டி · இந்தச் சர்வரில் <code>/api/*</code> நேரடியாக அழைக்கப்படுகிறது. டெமோ: ₹25,000 அன்லாக் கட்டண வழி.'
  }
};

/* Index of the ] that closes the array opened by `header`, ignoring brackets inside strings. */
function arrayEnd(text, header) {
  const m = text.match(header);
  if (!m) throw new Error('array header not found: ' + header);
  let i = m.index + m[0].length - 1;
  let depth = 0;
  let quote = null;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) return i; }
  }
  throw new Error('unterminated array: ' + header);
}

function seedFor(code) {
  const out = [];
  for (const [src, byLang] of Object.entries(TITLES)) if (byLang[code]) out.push([src, byLang[code]]);
  for (const [src, val] of Object.entries(STRIPS[code] || {})) out.push([src, val]);
  return out;
}

function readKeys(text, code) {
  const sb = { window: {} };
  vm.createContext(sb);
  vm.runInContext(text, sb);
  const pairs = TARGET[code].read(sb) || [];
  return new Set(pairs.map(p => String(p[0])));
}

let added = 0, kept = 0, moved = 0;
for (const code of Object.keys(TARGET)) {
  const file = path.join(PUB, `dict-${code}.js`);
  if (!fs.existsSync(file)) { console.log(`skip ${code}: no dictionary file`); continue; }
  let text = fs.readFileSync(file, 'utf8');
  const wanted = seedFor(code);
  if (!wanted.length) continue;

  // 1. relocate any copy of a seeded pair that is sitting in a different array (a *_TPL
  //    list). Only the text outside the target array is touched, so an entry that is
  //    already correctly placed is never removed and rewritten.
  const at = arrayEnd(text, TARGET[code].header);
  const m = text.match(TARGET[code].header);
  const arrStart = m.index + m[0].length - 1;
  const inner = text.slice(arrStart, at);
  let before = text.slice(0, arrStart);
  let after = text.slice(at);
  for (const [a, b] of wanted) {
    const line = `[${JSON.stringify(a)}, ${JSON.stringify(b)}],`;
    const pb = before.split(line);
    if (pb.length > 1) { before = pb.join(''); moved += pb.length - 1; }
    const pa = after.split(line);
    if (pa.length > 1) { after = pa.join(''); moved += pa.length - 1; }
  }
  text = before + inner + after;

  const have = readKeys(text, code);
  const missing = wanted.filter(([src]) => !have.has(src));
  kept += wanted.length - missing.length;

  if (missing.length) {
    const end = arrayEnd(text, TARGET[code].header);
    const block = missing.map(([a, b]) => `\n  [${JSON.stringify(a)}, ${JSON.stringify(b)}],`).join('');
    const head = text.slice(0, end).replace(/,?\s*$/, '');
    text = head + ',' + block + '\n' + text.slice(end);
  }
  fs.writeFileSync(file, text, 'utf8');
  added += missing.length;
  console.log(`${code}: +${missing.length} seeded, ${wanted.length - missing.length} already present`);
}
console.log(`\nadded ${added}, already present ${kept}, misplaced entries relocated ${moved}`);