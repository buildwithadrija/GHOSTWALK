/* GHOSTWALK server — investor-protection infrastructure. No investment advice. */
const express = require('express');
const cors = require('cors');
const path = require('path');
const tls = require('tls');
const net = require('net');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ── 1. CONVERSATION INTELLIGENCE: deterministic behavioural rule engine ── */
const PATTERNS = [
  { id: 'guaranteed_returns', label: 'Guaranteed / unusually high returns', severity: 'high',
    rx: /(guarantee\w*|assured|risk[\s-]?free|double (your|money)|2x|3x|5x|\b\d{2,3}\s?%\s?(return|profit|daily|weekly|monthly)|daily profit|fixed profit|sure profit|profit 100%|no loss)/i,
    explain: 'Promises of guaranteed or very high returns. Genuine investments always carry risk and never guarantee profit.' },
  { id: 'unlock_withdrawal', label: 'Payment demanded to “unlock” withdrawal', severity: 'critical',
    rx: /(unlock (your |the )?withdraw|pay .* to withdraw|withdrawal (fee|tax|charge|unlocked)|deposit .* to (withdraw|release|unlock)|release your (fund|profit|amount)|pay .* security fee|pay .* tax .* withdraw)/i,
    explain: 'Another payment is being requested before you can withdraw your own money. This is a classic escalation trap — do not send more money.' },
  { id: 'advance_fee', label: 'Advance fee / tax / security charge', severity: 'critical',
    rx: /(advance fee|processing fee|security fee|gst.*pay|income tax.*pay|tds.*pay|pay.*verification fee|refundable.*fee|pay.*first.*then.*withdraw)/i,
    explain: 'Upfront “fee / tax” demanded before you receive anything. Real withdrawals deduct charges, they don’t ask for fresh payment.' },
  { id: 'urgency', label: 'Urgency / pressure to act now', severity: 'high',
    rx: /(urgent|immediately|right now|act fast|hurry|last chance|today only|offer ends|expire|within \d+ (min|hour)|do it now|don't delay|slot.*closing)/i,
    explain: 'Artificial urgency to stop you thinking or asking someone you trust. Pressure itself is a warning sign.' },
  { id: 'limited_slots', label: '“Limited slots / VIP / exclusive” lure', severity: 'medium',
    rx: /(limited slots?|only \d+ (slots?|seats?|left)|vip|exclusive|special access|selected (investors?|members?)|premium group|institutional access)/i,
    explain: '“Exclusive / limited” framing makes a stranger’s offer feel privileged. Real regulated offers are not distributed this way.' },
  { id: 'escalation', label: 'Small → large deposit escalation', severity: 'high',
    rx: /(start with.*\d+.*then|upgrade.*plan|invest more|add (more|funds?)|top[\s-]?up|increase.*deposit|level ?2|next level|bigger (plan|profit)|recharge)/i,
    explain: 'Journey moves from a small test amount to bigger deposits. Each “next step” raises what you stand to lose.' },
  { id: 'secrecy', label: 'Secrecy / don’t tell anyone', severity: 'high',
    rx: /(don'?t tell|keep (it |this )?secret|between us|don'?t share|don'?t inform|confidential opportunity|only for you)/i,
    explain: 'Asking you to keep it secret cuts off the one protection that works — a second opinion from family.' },
  { id: 'off_channel', label: 'Move away from official channels', severity: 'high',
    rx: /(telegram|whatsapp.*group|join.*private|personal (number|chat)|off.?platform|download.*teamviewer|anydesk|screenshare|screen[\s-]?shar|remote access|share.*screen)/i,
    explain: 'Being pulled into private chats or screen-sharing removes records and lets the other person control what you see.' },
  { id: 'testimonial', label: 'Testimonials / fake social proof', severity: 'medium',
    rx: /(testimon|profit screenshot|payout proof|withdrawal proof|my (client|student|member) earned|see.*profit|5 star|review.*profit|everyone.*earning)/i,
    explain: 'Screenshots and stories of “others earning” are easy to fake and are shown to build borrowed trust.' },
  { id: 'upi_qr_push', label: 'Direct UPI / QR / account push', severity: 'high',
    rx: /(upi|gpay|phonepe|paytm|qr|scan.*pay|send.*screenshot.*payment|account (no|number).*ifsc|pay to.*@|upi id)/i,
    explain: 'Payment pushed to a personal UPI ID or QR instead of a verifiable official channel. The name on the account matters — check it.' },
  { id: 'impersonation', label: 'Authority / brand impersonation cue', severity: 'medium',
    rx: /(sebi.*approv|govt.*approv|rbi.*approv|nse|bse|zerodha|groww|upstox|official.*scheme|licensed.*advisor|registration no)/i,
    explain: 'Big names are mentioned to borrow trust. A name-drop is not proof — verify independently, never inside the same chat.' },
  { id: 'repeat_deposit', label: 'Repeated deposit requests', severity: 'high',
    rx: /(send.*again|pay.*again|one more (payment|deposit)|next (deposit|payment)|pending.*amount|balance.*stuck|account.*frozen)/i,
    explain: 'Money already sent is now called “stuck / frozen” until you send more. Each new demand is the pattern repeating.' },
];

const URL_RX = /(https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+|upi:\/\/[^\s<>"')\]]+)/gi;

/* Human-written Hindi for every manipulation pattern (no machine translation). */
const HI_PATTERNS = {
  guaranteed_returns: { label: 'गारंटीड / असामान्य रूप से ज़्यादा रिटर्न का वादा', explain: 'गारंटीड या बहुत ज़्यादा मुनाफ़े का वादा किया जा रहा है। असली निवेश में हमेशा जोखिम होता है — मुनाफ़े की गारंटी कभी नहीं मिलती।' },
  unlock_withdrawal: { label: 'निकासी खोलने के लिए पैसे माँगे जा रहे हैं', explain: 'आपके अपने पैसे निकालने से पहले एक और भुगतान माँगा जा रहा है। यह क्लासिक जाल है — और पैसे न भेजें।' },
  advance_fee: { label: 'एडवांस फीस / टैक्स / सिक्योरिटी चार्ज', explain: 'कुछ मिलने से पहले ही “फीस / टैक्स” माँगा जा रहा है। असली निकासी में चार्ज काटा जाता है, नया भुगतान नहीं मँगवाया जाता।' },
  urgency: { label: 'जल्दबाज़ी / तुरंत कार्रवाई का दबाव', explain: 'सोचने या किसी अपने से पूछने का मौका न देने के लिए बनावटी जल्दबाज़ी बनाई जा रही है। दबाव खुद एक चेतावनी है।' },
  limited_slots: { label: '“सीमित स्लॉट / VIP / खास” का लालच', explain: '“खास / सीमित” बताकर अजनबी की पेशकश को विशेष महसूस कराया जा रहा है। असली रेगुलेटेड पेशकशें ऐसे नहीं बाँटी जातीं।' },
  escalation: { label: 'छोटी रकम से बड़ी रकम की ओर बढ़ाना', explain: 'छोटी जाँच-रकम से शुरू करके बड़े जमा की ओर ले जाया जा रहा है। हर “अगला कदम” आपका जोखिम बढ़ाता है।' },
  secrecy: { label: 'गोपनीयता / “किसी को मत बताना”', explain: 'इसे गुप्त रखने को कहा जा रहा है — ताकि आपको सबसे असरदार सुरक्षा न मिल सके: परिवार की दूसरी राय।' },
  off_channel: { label: 'आधिकारिक माध्यम से हटकर बात करना', explain: 'प्राइवेट चैट या स्क्रीन-शेयरिंग में ले जाया जा रहा है — जहाँ कोई रिकॉर्ड और कोई निगरानी नहीं रहती।' },
  testimonial: { label: 'नकली तारीफ़ें / फ़र्ज़ी कमाई के सबूत', explain: '“औरों की कमाई” के स्क्रीनशॉट और कहानियाँ आसानी से बनाई जा सकती हैं — ये उधार का भरोसा बनाने के लिए दिखाई जाती हैं।' },
  upi_qr_push: { label: 'सीधे UPI / QR पर भुगतान का दबाव', explain: 'आधिकारिक माध्यम के बजाय निजी UPI ID या QR पर पैसा भेजने को कहा जा रहा है। खाते पर लिखा नाम ध्यान से देखें।' },
  impersonation: { label: 'बड़े नामों की आड़ (SEBI / RBI / बैंक)', explain: 'भरोसा उधार लेने के लिए बड़े नाम लिए जा रहे हैं। नाम लेना सबूत नहीं — इसी चैट के बाहर, स्वतंत्र रूप से जाँचें।' },
  repeat_deposit: { label: 'बार-बार जमा की माँग', explain: 'पहले भेजा पैसा अब “अटका / फ्रीज़” बताकर और माँगा जा रहा है। हर नई माँग उसी जाल की दोहराई है।' },
};

function extractUrls(text = '') {
  const m = (text || '').match(URL_RX) || [];
  return [...new Set(m.map(u => u.trim().replace(/[.,;!?)]+$/, '')))].slice(0, 8);
}

function analyzeConversation(text = '') {
  const t = (text || '').trim();
  const hits = [];
  for (const p of PATTERNS) {
    const m = t.match(p.rx);
    if (m) {
      const idx = Math.max(0, m.index || 0);
      hits.push({
        id: p.id, label: p.label, severity: p.severity,
        explain: p.explain,
        evidence: t.slice(Math.max(0, idx - 60), idx + m[0].length + 60).replace(/\s+/g, ' ').trim()
      });
    }
  }
  const urls = extractUrls(t);
  const critical = hits.filter(h => h.severity === 'critical').length;
  const high = hits.filter(h => h.severity === 'high').length;
  // SAFETY CONTRACT: never green. Only RED (observed danger) or YELLOW (not verified).
  let verdict = 'YELLOW';
  if (critical >= 1 || high >= 2 || hits.length >= 3) verdict = 'RED';
  else if (hits.length >= 1) verdict = 'RED'; // any single manipulation cue + money context => treat as observed danger
  return { hits, urls, verdict, chars: t.length };
}

/* ── Simple multilingual plain-language layer (server provides; voice is client-side) ── */
const I18N = {
  en: {
    red_title: 'STOP — Do not pay yet.',
    yellow_title: 'NOT VERIFIED — Do not pay yet.',
    red_sub: 'Dangerous behaviour was observed in what you forwarded. Do not send money or share OTP / bank details.',
    yellow_sub: 'We could not establish enough to trust this. Automated checks cannot see everything. Do not send money until independently verified.',
    ask_trusted: 'Would you like someone you trust to look at this with you?'
  },
  hi: {
    red_title: 'रुकें — अभी पैसे न भेजें।',
    yellow_title: 'सत्यापित नहीं — अभी पैसे न भेजें।',
    red_sub: 'आपने जो भेजा उसमें खतरनाक संकेत दिखे हैं। पैसे, OTP या बैंक जानकारी न भेजें।',
    yellow_sub: 'हम इसे भरोसेमंद साबित नहीं कर सके। मशीन जाँच सब कुछ नहीं देख सकती। स्वतंत्र रूप से जाँच तक पैसे न भेजें।',
    ask_trusted: 'क्या आप किसी भरोसेमंद व्यक्ति से इसे दिखाना चाहेंगे?'
  },
  bn: {
    red_title: 'থামুন — এখন টাকা পাঠাবেন না।',
    yellow_title: 'যাচাই হয়নি — এখন টাকা পাঠাবেন না।',
    red_sub: 'আপনি যা পাঠিয়েছেন তাতে বিপজ্জনক আচরণ দেখা গেছে। টাকা, OTP বা ব্যাংক তথ্য দেবেন না।',
    yellow_sub: 'এটি বিশ্বাসযোগ্য প্রমাণ করতে পারিনি। স্বয়ংক্রিয় পরীক্ষা সব দেখতে পায় না। স্বাধীনভাবে যাচাই না করে টাকা পাঠাবেন না।',
    ask_trusted: 'আপনি কি বিশ্বস্ত কাউকে এটি দেখাতে চান?'
  },
  mr: {
    red_title: 'थांबा — आत्ता पैसे पाठवू नका.',
    yellow_title: 'पडताळणी नाही — आत्ता पैसे पाठवू नका.',
    red_sub: 'तुम्ही पाठवलेल्यात धोकादायक वर्तन आढळले आहे. पैसे, OTP किंवा बँक माहिती देऊ नका.',
    yellow_sub: 'हे विश्वासार्ह आहे हे आम्ही सिद्ध करू शकलो नाही. यंत्रणा सर्व काही पाहू शकत नाही. स्वतंत्र खात्री होईपर्यंत पैसे नका पाठवू.',
    ask_trusted: 'तुम्हाला विश्वासू व्यक्तीला हे दाखवायचे आहे का?'
  },
  ta: {
    red_title: 'நிறுத்துங்கள் — இப்போது பணம் அனுப்ப வேண்டாம்.',
    yellow_title: 'சரிபார்க்கப்படவில்லை — இப்போது பணம் அனுப்ப வேண்டாம்.',
    red_sub: 'நீங்கள் அனுப்பியதில் ஆபத்தான நடத்தை காணப்பட்டது. பணம், OTP அல்லது வங்கி விவரங்களைப் பகிர வேண்டாம்.',
    yellow_sub: 'இது நம்பகமானது என்று நிரூபிக்க முடியவில்லை. தானியங்கி சோதனைகள் அனைத்தையும் பார்க்க முடியாது. தனியாகச் சரிபார்க்கும் வரை பணம் அனுப்ப வேண்டாம்.',
    ask_trusted: 'நம்பிக்கையான ஒருவரை இதைப் பார்க்கச் சொல்ல விரும்புகிறீர்களா?'
  },
  te: {
    red_title: 'ఆపండి — ఇప్పుడు డబ్బు పంపవద్దు.',
    yellow_title: 'ధృవీకరించలేదు — ఇప్పుడు డబ్బు పంపవద్దు.',
    red_sub: 'మీరు పంపినదాంట్లో ప్రమాదకర ప్రవర్తన కనిపించింది. డబ్బు, OTP లేదా బ్యాంక్ వివరాలు పంచవద్దు.',
    yellow_sub: 'ఇది నమ్మదగినదని నిరూపించలేకపోయాం. ఆటోమేటిక్ తనిఖీలు అన్నీ చూడలేవు. స్వతంత్రంగా ధృవీకరించే వరకు డబ్బు పంపవద్దు.',
    ask_trusted: 'నమ్మకమైన వారిని దీన్ని చూడమని అడగాలనుకుంటున్నారా?'
  }
};

/* ── 2. THE GHOST: real server-side journey observation (redirects + DOM cues) ── */
/* Every check below produces concrete, quoted evidence — never vague "suspicious behaviour". */
const OFFICIAL = [
  { kw: 'sbi', dom: ['sbi.co.in', 'onlinesbi.com', 'sbicard.com'] },
  { kw: 'hdfc', dom: ['hdfcbank.com', 'hdfc.com'] },
  { kw: 'icici', dom: ['icicibank.com'] },
  { kw: 'axis', dom: ['axisbank.com'] },
  { kw: 'kotak', dom: ['kotak.com'] },
  { kw: 'zerodha', dom: ['zerodha.com'] },
  { kw: 'groww', dom: ['groww.in'] },
  { kw: 'upstox', dom: ['upstox.com'] },
  { kw: 'rbi', dom: ['rbi.org.in'] },
  { kw: 'sebi', dom: ['sebi.gov.in'] },
  { kw: 'npci', dom: ['npci.org.in'] },
  { kw: 'upi', dom: ['npci.org.in', 'bhimupi.org.in'] },
  { kw: 'paytm', dom: ['paytm.com'] },
  { kw: 'phonepe', dom: ['phonepe.com'] },
  { kw: 'kyc', dom: [] },
  { kw: 'aadhaar', dom: [] },
  { kw: 'aadhar', dom: [] },
];
function brandHit(host) {
  for (const b of OFFICIAL) {
    if (b.dom.some(d => host === d || host.endsWith('.' + d))) continue;
    if (host.split(/[.-]/).includes(b.kw)) return b;
  }
  return null;
}
function wildMatch(pat, host) {
  pat = (pat || '').toLowerCase(); host = (host || '').toLowerCase();
  if (!pat || !host) return false;
  if (pat.startsWith('*.')) return host !== pat.slice(2) && host.endsWith(pat.slice(1));
  return pat === host;
}
function fmtDate(x) {
  try { return new Date(x).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return String(x); }
}
function tlsInfo(host) {
  return new Promise((resolve) => {
    let done = false, s = null;
    const to = setTimeout(() => finish(null), 6000);
    function finish(v) { if (done) return; done = true; clearTimeout(to); try { s && s.destroy(); } catch {} resolve(v); }
    try {
      s = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: false, timeout: 6000 }, () => {
        try {
          const c = s.getPeerCertificate(true);
          if (!c || !c.subject) return finish({ unreadable: true });
          const sans = (c.subjectaltname || '').split(',').map(x => x.trim().replace(/^DNS:/i, '')).filter(Boolean);
          const cn = (c.subject && c.subject.CN) || '';
          const match = sans.some(d => wildMatch(d, host)) || wildMatch(cn, host);
          const selfsigned = JSON.stringify(c.issuer) === JSON.stringify(c.subject);
          finish({ cn, match, selfsigned, issuer: (c.issuer && (c.issuer.O || c.issuer.CN)) || 'unknown issuer', from: c.valid_from });
        } catch { finish({ unreadable: true }); }
      });
    } catch { return finish(null); }
    s.on('error', () => finish(null));
    s.on('timeout', () => finish(null));
  });
}
function whoisLookup(domain, server) {
  // classic WHOIS over TCP/43 — works where HTTPS RDAP mirrors don't
  return new Promise((resolve) => {
    let done = false, buf = '';
    const s = net.connect(43, server);
    s.setTimeout(8000);
    const finish = () => { if (done) return; done = true; try { s.destroy(); } catch {} resolve(buf); };
    s.on('connect', () => s.write(domain + '\r\n'));
    s.on('data', (c) => { buf += c.toString(); if (buf.length > 20000) finish(); });
    s.on('timeout', finish); s.on('error', finish); s.on('close', finish);
    setTimeout(finish, 9000);
  });
}
async function rdapInfo(host) {
  try {
    if (/^(\d+\.){3}\d+$/.test(host)) return null;
    const parts = host.split('.');
    const reg = (parts.length > 2 && ['co', 'com', 'org', 'net', 'gov', 'ac', 'edu', 'nic'].includes(parts[parts.length - 2]) && parts[parts.length - 1].length === 2)
      ? parts.slice(-3).join('.') : parts.slice(-2).join('.');
    const r = await fetch('https://rdap.org/domain/' + reg, { signal: AbortSignal.timeout(7000), headers: { Accept: 'application/json' } });
    if (r.ok) {
      const j = await r.json();
      const ev = (j.events || []).find(e => /registration/i.test(e.eventAction || ''));
      let registrar = '';
      for (const ent of (j.entities || [])) {
        if ((ent.roles || []).includes('registrar')) {
          try { const vc = (ent.vcardArray && ent.vcardArray[1]) || []; const fn = vc.find(v => v[0] === 'fn'); if (fn) { registrar = fn[3]; break; } } catch {}
        }
      }
      if (ev && ev.eventDate) return { domain: reg, created: ev.eventDate, registrar };
    }
    // fallback: classic WHOIS (TCP/43) per registry
    const tld = reg.split('.').pop();
    const WHOIS = { com: 'whois.verisign-grs.com', net: 'whois.verisign-grs.com', in: 'whois.nixiregistry.in', org: 'whois.pir.org', io: 'whois.nic.io', co: 'whois.nic.co' };
    if (WHOIS[tld]) {
      const raw = await whoisLookup(reg, WHOIS[tld]);
      const cm = raw.match(/Creation Date:\s*([^\r\n]+)/i) || raw.match(/Created On:\s*([^\r\n]+)/i) || raw.match(/Registered On:\s*([^\r\n]+)/i) || raw.match(/created:\s*([^\r\n]+)/i);
      const rm = raw.match(/Registrar:\s*([^\r\n]+)/i);
      if (cm) return { domain: reg, created: cm[1].trim(), registrar: rm ? rm[1].trim().split(/\s{2,}/)[0] : '' };
    }
    return null;
  } catch { return null; }
}
async function headSize(u) {
  try {
    const r = await fetch(u, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(7000) });
    const len = r.headers.get('content-length');
    return { status: r.status, len: len ? +len : null, ct: r.headers.get('content-type') || '' };
  } catch { return null; }
}
async function ghostWalk(rawUrl, upiHint = '') {
  let target = (rawUrl || '').trim();
  if (!target && upiHint) target = upiHint;
  if (target && !/^https?:\/\//i.test(target) && !/^upi:\/\//i.test(target)) target = 'https://' + target;

  const steps = [];
  const flags = [];
  const domains = [];
  // checked[] = transparency checklist: every concrete point examined, clean or not.
  // (Failed points are mirrored here automatically in finalize().)
  const checked = [];
  const check = (label, ok, detail) => checked.push({ label, ok: !!ok, detail: detail || '' });

  const push = (node, detail, tone = 'info') => steps.push({ node, detail, tone, at: new Date().toISOString() });

  // UPI / QR intent — no fetch needed, parse intent directly
  if (/^upi:\/\//i.test(target)) {
    try {
      const u = new URL(target);
      const pa = u.searchParams.get('pa') || '';
      const pn = u.searchParams.get('pn') || '';
      const am = u.searchParams.get('am') || '';
      const tn = u.searchParams.get('tn') || u.searchParams.get('memo') || '';
      const cu = (u.searchParams.get('cu') || '').toUpperCase();
      push('QR / PAYMENT INTENT', `UPI intent decoded${pn ? ` — payee name: “${pn}”` : ''}${pa ? ` — VPA: ${pa}` : ''}${am ? ` — amount: ₹${am}` : ''}${tn ? ` — note: “${tn.slice(0, 80)}”` : ''}`, 'warn');
      domains.push((pa.split('@')[1] || 'upi-intent').toLowerCase());
      const handle = pa.split('@')[1] || '';
      if (!pn) {
        flags.push({ id: 'upi_no_name', label: 'UPI ID shows no payee name at all', explain: `The destination is just “${pa || 'an unreadable address'}” with no name attached. You would be paying a nameless stranger.`, evidence: pa });
      } else {
        flags.push({ id: 'upi_named', label: `Money would go to “${pn}” (${pa})`, explain: 'Names on UPI are self-declared by the account holder — anyone can type any name. Compare this exact VPA with the claimed company through a separate, official channel.', evidence: `${pn} · ${pa}` });
        check('Payee name shown', true, `Shows “${pn}” — but UPI names are self-declared, so this proves nothing.`);
      }
      if (handle) check('VPA handle', true, `@${handle} is a shared PSP tag anyone can open an account under — it is not an identity proof.`);
      if (am) check('Amount field', true, `₹${am} is pre-filled — a single tired tap would send it.`);
      else check('Amount field', true, 'Left blank — you would type the amount yourself.');
      if (tn) {
        if (/(fee|unlock|withdraw|release|tax|charge|verif|security|deposit|penalty)/i.test(tn)) {
          flags.push({ id: 'upi_note_trap', label: `Payment note itself demands a charge: “${tn.slice(0, 100)}”`, explain: 'The “unlock fee / tax” story is written directly into the payment request. Real withdrawals never arrive as a pay-me-first QR.', evidence: tn.slice(0, 140) });
        } else check('Payment note', true, `Note reads: “${tn.slice(0, 100)}”.`);
      }
      if (cu && cu !== 'INR') flags.push({ id: 'upi_currency', label: `Currency is ${cu}, not INR`, explain: 'Indian UPI should be INR. A foreign currency tag means the string is malformed or deliberately odd.', evidence: cu });
      push('GHOST STOPPED', 'Read without you scanning anything — you never had to open it.', 'stop');
    } catch { push('QR / PAYMENT INTENT', 'UPI string could not be decoded. Treat as unverifiable.', 'warn'); }
    return finalize('MESSAGE', steps, flags, domains, target, [], checked);
  }

  push('MESSAGE RECEIVED', 'Ghost picked up the link. You did not have to open it.', 'info');
  const chain = [];
  let current = target;
  let html = '';
  try {
    for (let hop = 0; hop < 6; hop++) {
      let res;
      try {
        res = await fetch(current, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (Ghostwalk Sandbox; disposable-investor)' }, signal: AbortSignal.timeout(9000) });
      } catch (e) {
        push('NETWORK', `Could not reach ${shortHost(current)} (${e.cause?.code || e.name || 'network error'}). The journey cannot be verified — that itself is a reason to pause.`, 'warn');
        flags.push({ id: 'unreachable', label: 'Destination unreachable from sandbox', explain: 'If even a clean fetch cannot load it reliably, you should not trust it with money.' });
        break;
      }
      chain.push({ url: current, status: res.status });
      try { domains.push(new URL(current).hostname.toLowerCase()); } catch {}
      const loc = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && loc) {
        const next = new URL(loc, current).toString();
        let crossHost = false;
        try { crossHost = new URL(current).hostname.replace(/^www\./, '').toLowerCase() !== new URL(next).hostname.replace(/^www\./, '').toLowerCase(); } catch {}
        push('REDIRECT', `${shortHost(current)} → moved you to ${shortHost(next)} (HTTP ${res.status}).`, crossHost ? 'warn' : 'info');
        if (crossHost) flags.push({ id: 'redirect', label: `Redirect hop ${hop + 1}: ${shortHost(current)} → ${shortHost(next)}`, explain: 'The link moved you to a different website than it first showed. Scam journeys hide behind redirects.' });
        current = next;
        continue;
      }
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      push('PAGE LOADED', `${shortHost(current)} answered with HTTP ${res.status}${ct.includes('html') ? ' (page)' : ct ? ` (${ct.split(';')[0]})` : ''}.`, 'info');
      if (ct.includes('html')) {
        try { html = await res.text(); html = html.slice(0, 400000); }
        catch { html = ''; }
      } else if (/apk|octet|android/i.test(ct) || /\.apk(\?|$)/i.test(current)) {
        flags.push({ id: 'direct_apk', label: 'Link serves a direct app download', explain: 'Installing apps outside official stores gives strangers deep phone access. Never install on request.' });
        push('APP DOWNLOAD', 'The link serves an installable file, not a normal webpage.', 'danger');
      }
      break;
    }
  } catch (e) {
    push('NETWORK', 'The ghost hit a network error and stopped safely.', 'warn');
  }

  /* — post-fetch forensics: every finding below is concrete and quoted — */
  let finalUrl = current, pageHost = '';
  try { const u = new URL(current); pageHost = u.hostname.toLowerCase(); } catch {}
  const isIP = (h) => /^(\d+\.){3}\d+$/.test(h || '');
  const stripWww = (h) => (h || '').replace(/^www\./, '');

  // A. ADDRESS TRICKS on the submitted link
  try {
    const initHost = (() => { try { return new URL(target).hostname.toLowerCase(); } catch { return ''; } })();
    if (/@/.test(target.split(/[?#]/)[0])) {
      flags.push({ id: 'at_trick', label: 'Address uses the “@” disguise trick', explain: `Browsers ignore everything before “@”. The familiar-sounding name is decoration — money and details really go to “${initHost}”.`, evidence: target.slice(0, 140) });
      push('ADDRESS TRICK', `“@” found — the real host is ${initHost}.`, 'danger');
    } else check('“@” disguise in address', true, 'None — the address reads honestly left-to-right.');
    if (isIP(initHost)) {
      flags.push({ id: 'ip_host', label: `Link points at a raw numbers-address (${initHost})`, explain: 'Banks and brokers use named addresses you can verify and type yourself. Number-addresses are throwaway, unlisted and untraceable.', evidence: initHost });
    } else check('Named vs number address', true, `Uses a named address (${stripWww(initHost) || 'unknown'}), not a raw IP.`);
    if (/xn--/.test(initHost)) {
      flags.push({ id: 'punycode', label: 'Address uses disguised look-alike characters', explain: `“${initHost}” contains encoded characters crafted to mimic a trusted name at a glance. Type the real site’s address yourself instead.`, evidence: initHost });
    } else check('Look-alike characters', true, 'No disguised (punycode) characters in the address.');
    try {
      const port = new URL(target).port;
      if (port && port !== '80' && port !== '443') flags.push({ id: 'odd_port', label: `Address uses unusual port :${port}`, explain: 'Normal websites show no port in the address. An odd port usually means a hastily set-up server, not an institution.', evidence: ':' + port });
      else check('Server port', true, 'Standard port — nothing unusual.');
    } catch {}
    const SHORT = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly', 'cutt.ly', 'rb.gy', 'shorturl.at', 'lnkd.in', 'rebrand.ly', 't.ly', 'tiny.cc'];
    if (SHORT.includes(stripWww(initHost))) {
      const dest = stripWww(pageHost);
      push('SHORT LINK', `Short link unwrapped: ${stripWww(initHost)} → the real site is ${dest || 'unreadable'}.`, 'warn');
      check('Hidden destination revealed', true, `Short link unwrapped — the real site is: ${dest || 'unreadable'}.`);
    }
    const seenKw = new Set();
    for (const h of [initHost, pageHost].filter(Boolean)) {
      const b = brandHit(h);
      if (b && !seenKw.has(b.kw)) {
        seenKw.add(b.kw);
        flags.push({ id: 'brand_' + b.kw, label: `Address borrows the name “${b.kw.toUpperCase()}” but isn’t official`, explain: b.dom.length ? `Real ${b.kw.toUpperCase()} lives at ${b.dom.join(' / ')} — this page lives at “${h}”. The name is borrowed, not earned.` : `“${h}” dresses itself in trust-words (“${b.kw}”) inside the address. Real institutions never need to.`, evidence: h });
      }
    }
    if (!seenKw.size) check('Borrowed brand names', true, 'Address doesn’t impersonate a known bank, broker or regulator.');
  } catch {}

  // B. ENCRYPTION + CERTIFICATE + DOMAIN AGE (parallel, time-bounded)
  try {
    const scheme = (() => { try { return new URL(finalUrl).protocol; } catch { return ''; } })();
    if (scheme === 'http:') {
      flags.push({ id: 'plain_http', label: 'Money journey runs without encryption (http)', explain: `The final page “${stripWww(pageHost)}” loads over plain http — anything typed there (passwords, OTPs, card numbers) travels readable to anyone watching the network.`, evidence: finalUrl.slice(0, 140) });
      push('NO ENCRYPTION', 'Final page is plain http, not https.', 'danger');
    } else check('Page encryption', true, 'Final page loads over https.');
    if (scheme === 'https:' && pageHost && !isIP(pageHost)) {
      const [tlsR, rdapR] = await Promise.all([tlsInfo(pageHost), rdapInfo(pageHost)]);
      if (tlsR && !tlsR.unreadable) {
        if (!tlsR.match) {
          flags.push({ id: 'cert_mismatch', label: `Security certificate names a different site (“${tlsR.cn || 'unknown'}”)`, explain: `You are on “${pageHost}” but its certificate was issued for “${tlsR.cn || 'someone else'}”. A mismatched certificate is a classic interception marker — stop here.`, evidence: 'certificate says: ' + (tlsR.cn || 'unknown') });
        } else check('Certificate identity', true, `Certificate is issued for this exact site (by ${tlsR.issuer}).`);
        if (tlsR.selfsigned) flags.push({ id: 'selfsigned', label: 'Certificate is self-signed', explain: 'The site vouched for itself instead of using a recognised issuer. Legitimate institutions never do this.', evidence: 'issuer == subject' });
      } else check('Certificate identity', true, 'Unreadable from the sandbox — counted as unknown, not as a clean pass.');
      if (rdapR && rdapR.created) {
        const ageD = Math.max(0, Math.round((Date.now() - new Date(rdapR.created).getTime()) / 86400000));
        const when = fmtDate(rdapR.created);
        if (ageD < 90) {
          flags.push({ id: 'new_domain', label: `This website was born ${ageD} day${ageD === 1 ? '' : 's'} ago (${when})`, explain: `“${rdapR.domain}” was registered on ${when}${rdapR.registrar ? ' via ' + rdapR.registrar : ''}. Genuine banks and brokers operate on years-old addresses; scam sites burn fresh ones every few weeks.`, evidence: `${rdapR.domain} · registered ${when}` });
        } else check('Address age', true, `“${rdapR.domain}” dates to ${when} (${ageD} days old) — not a fresh throwaway.`);
      } else check('Address age', true, 'Registration date isn’t publicly readable — no age verdict drawn from it.');
    }
  } catch {}

  // C. PAGE FORENSICS
  if (html) {
    const title = ((html.match(/<title[^>]*>([^<]{1,140})<\/title>/i) || [])[1] || '').trim();
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 6000);
    if (title) {
      const tb = brandHit(title.toLowerCase());
      const hb = brandHit(pageHost);
      if (tb && !hb && !tb.dom.some(d => pageHost === d || pageHost.endsWith('.' + d))) {
        flags.push({ id: 'title_brand', label: `Page title claims “${title.slice(0, 70)}” but the address isn’t official`, explain: 'The tab says a trusted name while the address bar says somewhere else. Believe the address, not the title — titles cost nothing to fake.', evidence: title.slice(0, 120) });
      } else check('Title vs address', true, `Title (“${title.slice(0, 60)}${title.length > 60 ? '…' : ''}”) makes no borrowed-brand claim.`);
    }

    const forms = (html.match(/<form[\s\S]*?>/gi) || []).length;
    const inputTags = [...html.matchAll(/<input[^>]*>/gi)].map(m => m[0]);
    push('PAGE STRUCTURE', `Found ${forms} form${forms === 1 ? '' : 's'} and ${inputTags.length} input field${inputTags.length === 1 ? '' : 's'} on the landing page.`, forms > 0 ? 'warn' : 'info');
    if (forms > 0) flags.push({ id: 'forms', label: `Page collects details (${forms} form${forms > 1 ? 's' : ''}, ${inputTags.length} fields)`, explain: 'The site asks for your information before proving who it is. A real institution proves itself first.', evidence: `${forms} form(s), ${inputTags.length} input(s)` });

    // where do forms actually send data?
    const acts = [...html.matchAll(/<form[^>]*action\s*=\s*["']([^"'#]+)["']/gi)].map(m => m[1]);
    const foreign = new Set();
    for (const a of acts) {
      try { const h = new URL(a, finalUrl).hostname.toLowerCase(); if (h && h !== pageHost) foreign.add(stripWww(h)); } catch {}
    }
    if (foreign.size) {
      flags.push({ id: 'foreign_post', label: `What you type is sent to a different server (${[...foreign].join(', ')})`, explain: `The page you see lives at “${stripWww(pageHost)}”, but its form ships your entries to “${[...foreign].join(', ')}”. That split is exactly how harvested OTPs and passwords get collected.`, evidence: 'form sends to: ' + [...foreign].join(', ') });
    } else if (forms > 0) check('Where forms send data', true, 'Forms submit to the same site you see — no hidden second destination.');

    // exactly which secrets are harvested?
    const FIELD_PATS = [
      [/type\s*=\s*["']password["']/, 'password'], [/otp|one[\s_-]?time|verification[\s_-]?code/, 'OTP'],
      [/\bcvv\b|\bcvc\b/, 'CVV'], [/card[\s_-]?(number|no)|ccnum|cardnum/, 'card number'],
      [/(^|[^a-z])pin([^a-z]|$)/, 'card PIN'], [/aadha?ar/, 'Aadhaar number'],
      [/(^|[^a-z])pan([^a-z]|$)/, 'PAN'], [/account[\s_-]?(number|no|holder)|acct/, 'bank account'],
      [/\bifsc\b/, 'IFSC'], [/expir/, 'card expiry'], [/dob|date[\s_-]?of[\s_-]?birth/, 'date of birth'],
      [/mobile|phone/, 'mobile number'],
    ];
    const found = [];
    for (const tag of inputTags) {
      const attrs = [...tag.matchAll(/(name|id|placeholder|aria-label)\s*=\s*["']([^"']+)["']/gi)].map(m => m[2].toLowerCase()).join(' | ');
      for (const [rx, label] of FIELD_PATS) if (rx.test(attrs) && !found.includes(label)) found.push(label);
    }
    const CRIT = ['password', 'OTP', 'CVV', 'card number', 'card PIN', 'Aadhaar number', 'PAN'];
    const critFound = found.filter(f => CRIT.includes(f));
    if (critFound.length) {
      flags.push({ id: 'harvest', label: `Page harvests: ${critFound.join(' + ')}`, explain: `${critFound.length > 1 ? 'Demanding these together' : 'Demanding this'} on a forwarded link is credential harvesting — no genuine investment page collects ${critFound.join(' and ')} from a chat-forwarded link.`, evidence: 'fields found: ' + critFound.join(', ') });
      push('CREDENTIAL ASK', 'Sensitive fields found: ' + critFound.join(', ') + '.', 'danger');
    } else if (found.length) check('Secret fields', true, `Only non-secret fields (${found.join(', ')}) — no passwords, OTPs or bank secrets requested.`);
    else check('Secret fields', true, 'No personal-detail fields found at all.');

    // APK with real filename + size
    const apkHrefs = [...html.matchAll(/href\s*=\s*["']([^"']+\.apk(?:\?[^"']*)?)["']/gi)].map(m => m[1]);
    const apkWord = /application\/vnd\.android|download.*android/i.test(html);
    if (apkHrefs.length || apkWord) {
      let detail = 'Page promotes installing an app outside official stores.';
      if (apkHrefs.length) {
        try {
          const abs = new URL(apkHrefs[0], finalUrl).toString();
          const nm = abs.split('/').pop().split('?')[0].slice(0, 60);
          const hi = await headSize(abs);
          detail = `File “${nm}”${hi && hi.len ? ` (${(hi.len / 1048576).toFixed(1)} MB)` : ''} served from ${stripWww(new URL(abs).hostname)} — outside the Play Store.`;
        } catch {}
      }
      flags.push({ id: 'apk', label: 'Pushes an app install from outside the Play Store', explain: 'The journey moves you off the web into an app they control — where fake dashboards and device permissions live. ' + detail, evidence: detail.slice(0, 160) });
      push('APP DOWNLOAD', detail, 'danger');
    } else check('Forced app installs', true, 'No app-download push found on the page.');

    // UPI embedded in page — decode specifics when possible
    const upiHref = (html.match(/href\s*=\s*["'](upi:[^"']+)["']/i) || [])[1] || '';
    if (/upi:\/\//i.test(html)) {
      let specific = '';
      try {
        const uu = new URL(upiHref);
        const upn = uu.searchParams.get('pn') || '', upa = uu.searchParams.get('pa') || '', uam = uu.searchParams.get('am') || '';
        if (upn || upa) specific = ` Decoded: payee “${upn || 'unnamed'}” (${upa || 'no VPA'})${uam ? `, ₹${uam}` : ''}.`;
      } catch {}
      flags.push({ id: 'page_upi', label: 'Page embeds a UPI payment step', explain: 'Money would leave your account via UPI the moment you tap. The ghost never pays — it only reads where payment would go.' + specific, evidence: (upiHref || 'upi intent in page').slice(0, 140) });
      push('PAYMENT INTENT', 'A UPI payment step is embedded in the page.' + specific, 'warn');
    } else check('Embedded payment traps', true, 'No UPI payment step hidden in the page.');

    // Telegram / WhatsApp specifics: private invite? pre-written text?
    const tgLinks = [...html.matchAll(/href\s*=\s*["']([^"']*t\.me\/[^"']*)["']/gi)].map(m => m[1]);
    const waLinks = [...html.matchAll(/href\s*=\s*["']([^"']*wa\.me\/[^"']*)["']/gi)].map(m => m[1]);
    if (tgLinks.length || waLinks.length) {
      const bits = [];
      for (const l of tgLinks) {
        if (/t\.me\/(\+|joinchat)/.test(l)) bits.push('a PRIVATE invite-only Telegram group (no public record, anyone with the link joins)');
        else bits.push('a Telegram chat (' + l.slice(0, 60) + ')');
      }
      for (const l of waLinks) {
        let pre = '';
        try { const u2 = new URL(l.startsWith('http') ? l : 'https://' + l); const t2 = u2.searchParams.get('text'); if (t2) pre = ` with a message already written for you: “${decodeURIComponent(t2).slice(0, 100)}”`; } catch {}
        bits.push('a WhatsApp chat' + pre);
      }
      flags.push({ id: 'chat_redirect', label: `Site pulls you into private chat (${[tgLinks.length ? 'Telegram' : '', waLinks.length ? 'WhatsApp' : ''].filter(Boolean).join(' + ')})`, explain: 'Moving to private chat removes oversight and keeps pressure personal. Specifically: ' + bits.join('; ') + '.', evidence: (tgLinks[0] || waLinks[0] || '').slice(0, 120) });
      push('CHAT REDIRECT', 'Routes visitors into private messaging: ' + bits.join('; ') + '.', 'warn');
    } else check('Private-chat traps', true, 'No Telegram / WhatsApp diversion found.');

    // remote access with quoted wording
    const remoteM = html.match(/anydesk|teamviewer|screen[\s-]?shar\w*|remote[\s-]?desk\w*/i);
    if (remoteM) {
      flags.push({ id: 'remote', label: `Asks for screen-sharing / remote access (“${remoteM[0]}”)`, explain: 'Anyone who can see or control your screen can watch you type OTPs and passwords in real time. No investment process on earth needs this. Refuse outright.', evidence: remoteM[0] });
      push('REMOTE ACCESS', `Screen-sharing wording detected (“${remoteM[0]}”).`, 'danger');
    } else check('Screen-share traps', true, 'No remote-access / screen-sharing wording found.');

    // device permissions
    if (/notification\.requestpermission|getusermedia|camera|microphone|geolocation/i.test(html)) {
      flags.push({ id: 'perms', label: 'Page code touches camera / mic / location / notifications', explain: 'None of these are needed to show an investment. On a scam page they enable surveillance and fake-urgency push alerts.', evidence: 'permission APIs present in page code' });
    } else check('Device permissions', true, 'No camera / mic / location permission code found.');

    // urgency + countdown with quotes
    const urgM = text.match(/today only|last chance|hurry|act (fast|now)|offer ends|limited (slots|offer)|deposit now|unlock.{0,20}now|only \d+ (slots?|left)/i);
    if (urgM) {
      const qi = Math.max(0, text.toLowerCase().indexOf(urgM[0].toLowerCase()) - 40);
      flags.push({ id: 'page_urgency', label: `Page itself pressures you to hurry (“${urgM[0]}”)`, explain: 'Legitimate investing waits for you. Countdown language exists to stop you calling your family first.', evidence: '…' + text.slice(qi, qi + 120) + '…' });
    } else check('Rush-you wording', true, 'No hurry-up language on the page.');
    if (/countdown|time[\s_-]?left|expires?[\s_-]?in/i.test(text)) {
      flags.push({ id: 'countdown', label: 'Page runs a countdown / expiry timer', explain: 'A ticking clock manufactures panic so you pay before thinking. Real opportunities don’t evaporate in minutes.', evidence: 'timer wording present in page' });
    }

    // concealment: blocks inspection
    if (/oncontextmenu|contextmenu.*preventdefault|disable.*devtool|debugger;/i.test(html)) {
      flags.push({ id: 'anti_inspect', label: 'Page actively blocks inspection (right-click / dev-tools traps)', explain: 'Stopping you from looking closer is concealment, not security. Banks don’t booby-trap their pages against curiosity.', evidence: 'anti-inspection code present' });
    } else check('Inspection blocks', true, 'Page doesn’t block right-click or inspection.');

    // hidden auto-forwards
    const metaM = html.match(/<meta[^>]*http-equiv\s*=\s*["']refresh["'][^>]*content\s*=\s*["'][^"']*url\s*=\s*([^"'\s>]+)/i);
    if (metaM) {
      let mh = '';
      try { mh = new URL(metaM[1], finalUrl).hostname.toLowerCase(); } catch {}
      if (mh && mh !== pageHost) flags.push({ id: 'meta_bounce', label: `Page silently bounces you to “${stripWww(mh)}”`, explain: 'A hidden auto-forward means the page you “verified” isn’t the page that takes your money. The ghost followed it; you don’t have to.', evidence: 'auto-forward → ' + mh });
      else push('PAGE NOTE', 'Page auto-refreshes in place (same site).', 'info');
    }
    const jsM = html.match(/window\.location(?:\.href)?\s*=\s*["'](https?:\/\/[^"']+)["']|location\.replace\(\s*["'](https?:\/\/[^"']+)["']/i);
    if (jsM) {
      const jt = jsM[1] || jsM[2];
      let jh = '';
      try { jh = new URL(jt).hostname.toLowerCase(); } catch {}
      if (jh && jh !== pageHost) flags.push({ id: 'js_bounce', label: `Page code auto-forwards you to “${stripWww(jh)}”`, explain: 'JavaScript quietly ships visitors to a different site than the one they checked. The ghost followed it safely; you stay put.', evidence: 'script forward → ' + jh });
    }
    if (!metaM && !jsM) check('Hidden auto-forwards', true, 'No silent bounce-to-another-site code found.');

    // third-party code blend
    const srcs = [...html.matchAll(/<script[^>]+src\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
    const third = new Set();
    for (const s of srcs) { try { const h = new URL(s, finalUrl).hostname.toLowerCase(); if (h && h !== pageHost) third.add(stripWww(h)); } catch {} }
    if (third.size) {
      push('PAGE BLEND', `Page assembles code from ${third.size} outside server${third.size > 1 ? 's' : ''}: ${[...third].slice(0, 4).join(', ')}${third.size > 4 ? '…' : ''}.`, third.size >= 8 ? 'warn' : 'info');
      if (third.size >= 8) flags.push({ id: 'franken_page', label: `Page is stitched from ${third.size} outside servers`, explain: 'Legitimate pages load trackers too, so this alone proves nothing — but throwaway scam kits famously assemble pages from many unrelated hosts. It adds weight alongside other signs.', evidence: [...third].slice(0, 6).join(', ') });
    }

    // claimed-vs-destination: compare first vs final host
    if (chain.length >= 2) {
      try {
        const a = new URL(chain[0].url).hostname.replace(/^www\./, '').toLowerCase();
        const b = new URL(chain[chain.length - 1].url).hostname.replace(/^www\./, '').toLowerCase();
        if (a !== b) flags.push({ id: 'host_mismatch', label: `Showed “${a}” but the money journey lives on “${b}”`, explain: 'The name you were shown and the site that takes details are different places. Verify the final address independently — never inside the same chat.', evidence: `${a} → ${b}` });
      } catch {}
    }
    if (flags.length) push('GHOST STOPPED', `Stopped here after finding ${flags.length} clear reason${flags.length > 1 ? 's' : ''} to stop (each shown below). You never had to go there yourself.`, 'stop');
    else push('GHOST STOPPED', `Checked ${checked.length} specific points and found nothing clearly dangerous. That does NOT mean safe — dishonest sites sometimes show a harmless face to automated checks.`, 'stop');
  } else if (!flags.length && chain.length) {
    checked.push({ label: 'Page content readable', ok: false, detail: 'Non-HTML or blocked — unreadable means unverifiable.' });
    push('GHOST STOPPED', 'Page content could not be read safely (non-HTML or blocked). Unreadable = unverifiable. Do not pay yet.', 'stop');
  } else if (flags.length) {
    push('GHOST STOPPED', `Stopped here after finding ${flags.length} clear reason${flags.length > 1 ? 's' : ''} to stop. You never had to go there yourself.`, 'stop');
  }

  return finalize(chain.length ? 'LINK' : 'MESSAGE', steps, flags, domains, target, chain, checked);
}

function shortHost(u) {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return (u || '').slice(0, 40); }
}

function finalize(kind, steps, flags, domains, target, chain = [], checked = []) {
  // SAFETY CONTRACT: never green. RED if any observed danger, else YELLOW.
  const verdict = flags.length ? 'RED' : 'YELLOW';
  const uniqDomains = [...new Set(domains)].slice(0, 10);
  // mirror every failed point into the transparency checklist (failed first, then clean)
  const mirrored = flags.map(f => ({ label: f.label, ok: false, detail: (f.evidence || f.explain || '').slice(0, 220) }));
  const all = [...mirrored, ...checked];
  const clean = all.filter(c => c.ok).length;
  return { kind, verdict, steps, flags, domains: uniqDomains, chain, target, checked: all, summary: { failed: mirrored.length, clean, total: all.length } };
}

/* ── API ROUTES ── */
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'ghostwalk', time: new Date().toISOString() }));

app.post('/api/analyze', (req, res) => {
  const { text = '', lang = 'en', amount = '' } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please paste or forward the message first. The ghost needs something to read.' });
  const r = analyzeConversation(text);
  const L = I18N[lang] || I18N.en;
  const patterns = (lang === 'hi' ? r.hits.map(h => ({ ...h, ...(HI_PATTERNS[h.id] || {}) })) : r.hits);
  res.json({
    verdict: r.verdict,
    title: r.verdict === 'RED' ? L.red_title : L.yellow_title,
    subtitle: r.verdict === 'RED' ? L.red_sub : L.yellow_sub,
    ask_trusted: L.ask_trusted,
    patterns,
    urls: r.urls,
    amount: (amount || '').slice(0, 20),
    note: 'Observed evidence only. Absence of a finding is not proof of safety.'
  });
});

app.post('/api/ghost', async (req, res) => {
  const { url = '', upi = '' } = req.body || {};
  if (!url && !upi) return res.status(400).json({ error: 'Forward a link or UPI / QR string for the ghost to walk.' });
  try {
    const r = await ghostWalk(url, upi);
    const verdictText = r.verdict === 'RED'
      ? 'STOP — dangerous behaviour was observed. Do not proceed or pay.'
      : 'NOT VERIFIED — we could not establish enough to trust this. Automated analysis may not see everything. Do not pay yet.';
    res.json({ ...r, verdictText });
} catch (e) {
res.status(500).json({ error: 'Ghost walk failed safely. Check the address and try again.' });
  }
});

/* ── Ghost AI: explanation layer over the evidence engine ────────────────────
   The deterministic engine above remains the only source of facts. This route
   can only restate what it already produced, in the user's own language, for as
   long as an AI provider is configured. It never receives a verdict to decide,
   never receives credentials, and on any failure returns { ok:false } so the
   client shows its own translated explanation instead.

   Request body is rebuilt from an allowlist inside lib/ai-ghost.js. Anything the
   client sends that is not explicitly permitted is dropped there. */
const aiGhost = require('./lib/ai-ghost');
const privacy = require('./lib/privacy');
const ghostNotes = require('./lib/ghost-notes');

app.get('/api/ghost/ai/status', (req, res) => res.json({
  ...aiGhost.status(),
  /* Static metadata, not user data: lets the browser map raw finding ids to the
     same concepts the server grounds the model with, so the built-in answer and
     the AI answer always describe the same thing. */
  concepts: ghostNotes.CATEGORY,
}));

/* Pre-check only. Runs the privacy layer and returns the *categories* that were
   found - never the text, never the values. This is how the client knows it must
   ask for consent before any redacted-prose analysis, without a second copy of
   the detection rules in the browser. */
app.post('/api/ghost/explain/precheck', (req, res) => {
  const raw = typeof (req.body || {}).text === 'string' ? req.body.text : '';
  if (!raw.trim()) return res.json({ ok: true, tier: 'clean', removed: [], categories: [] });
  const s = privacy.sanitizeForAI(raw, { mode: 'redact' });
  res.json({
    ok: true,
    tier: s.tier,
    removed: s.removed,
    redacted: s.redacted,
    needsConsent: s.removed.length > 0,
  });
});

app.post('/api/ghost/explain', async (req, res) => {
  const b = req.body || {};

  /* If the caller offers raw user content, it is sanitized here on the server.
     The client cannot skip this step. */
  let sanitizedEvidence = null;
  if (typeof b.evidenceText === 'string' && b.evidenceText.trim()) {
    const mode = b.evidenceMode === 'redact' ? 'redact' : 'entities';
    sanitizedEvidence = privacy.sanitizeForAI(b.evidenceText, { mode });
    /* Credentials were present and the caller wants the prose shape back. The
       credential values are already removed and can never be forwarded, but
       processing the remaining text is still an explicit user choice. */
    if (mode === 'redact' && sanitizedEvidence.removed.length && !b.consent) {
      return res.status(428).json({
        ok: false, needsConsent: true,
        removed: sanitizedEvidence.removed,
        tier: sanitizedEvidence.tier,
      });
    }
  }

  try {
    const r = await aiGhost.explain({
      lang: b.lang,
      intent: b.intent,
      guidance: b.guidance,
      page: b.page,
      stage: b.stage,
      control: b.control,
      voiceEnabled: b.voiceEnabled,
      findingCodes: b.findingCodes,
      verdict: b.verdict,
      sanitizedEvidence: sanitizedEvidence
        ? { text: sanitizedEvidence.text, entities: sanitizedEvidence.entities }
        : null,
    });
    res.json({
      ok: !!r.ok,
      source: r.ok ? 'ai' : 'deterministic',
      text: r.ok ? r.text : null,
      reason: r.ok ? null : (r.reason || 'unavailable'),
      lang: r.lang || b.lang || 'en',
      model: r.ok ? r.model : null,
      /* what the privacy layer actually did, so the UI can state it factually */
      privacy: sanitizedEvidence ? {
        mode: b.evidenceMode === 'redact' ? 'redacted' : 'entities-only',
        redacted: sanitizedEvidence.redacted,
        removed: sanitizedEvidence.removed,
      } : null,
    });
  } catch (e) {
    res.json({ ok: false, source: 'deterministic', text: null, reason: 'error' });
  }
});

app.post('/api/recovery', (req, res) => {
  const { events = [], amount = '', channel = '', lang = 'en' } = req.body || {};
  const L = I18N[lang] || I18N.en;
  const timeline = (Array.isArray(events) ? events : []).slice(0, 30).map((e, i) => ({
    n: i + 1,
    when: String(e.when || `Step ${i + 1}`).slice(0, 80),
    what: String(e.what || '').slice(0, 300)
  }));
  const pack = [
    'GHOSTWALK — Scam Incident Pack (first-response notes, not legal advice)',
    'Generated: ' + new Date().toLocaleString('en-IN'),
    amount ? 'Amount involved (as stated by user): ' + amount : 'Amount involved: not stated',
    channel ? 'Contact channel: ' + channel : '',
    '',
    'TIMELINE (as you described it):',
    ...timeline.map(t => `${t.n}. [${t.when}] ${t.what}`),
    '',
    'WHAT TO KEEP: message screenshots, payment screenshots / UTR numbers, UPI IDs, phone numbers, links, QR images, app names.',
    'NEXT STEPS TO CONSIDER: 1) Stop further payments. 2) Tell a trusted person. 3) Call your bank/UPI app helpdesk to report. 4) Report on the official cyber-crime helpline 1930 / cybercrime.gov.in. 5) Do not delete evidence.',
    'No recovery is guaranteed. This pack only organises what you chose to share.'
  ].filter(Boolean).join('\n');
  res.json({ timeline, pack, helpline: '1930', portal: 'cybercrime.gov.in', ask_trusted: L.ask_trusted });
});

/* ── multilingual TTS fallback ──────────────────────────────────────────────
   Browser speech synthesis only works if the OS has a voice pack installed,
   which most Windows/Android machines lack for Hindi/Bengali/Marathi. This
   endpoint is the fallback so Ghostwalk's voice guidance is never English-only.
   Keys live in environment variables only - never in frontend code.
   Providers, in order: Bhashini (AI4Bharat, free tier, all Indian languages),
   then ElevenLabs (multilingual v2). Unconfigured => 501, frontend stays text-only. */
const TTS_LOCALE = {
  en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', mr: 'mr-IN', gu: 'gu-IN', ta: 'ta-IN',
  te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN', as: 'as-IN', or: 'or-IN',
  ur: 'ur-IN', ne: 'ne-IN',
};
const ttsCache = new Map();
const TTS_MAX = 1200;
/* never cache likely user-submitted content (links, numbers, long free text) -
   only short fixed assistant prompts are cached */
function ttsCacheable(text) {
  const t = String(text || '');
  if (t.length > 600) return false;
  if (/https?:\/\/|www\.|upi:\/\/|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i.test(t)) return false;
  if (/\d[\d\s-]{7,}\d/.test(t)) return false;
  return true;
}
/* best-effort disk cache so warmed audio survives restarts (demo reliability) */
const crypto = require('crypto');
const fs = require('fs');
const TTS_DIR = path.join(__dirname, 'cache', 'tts');
function ttsKey(text, locale) { return crypto.createHash('sha256').update(locale + '|' + text).digest('hex'); }
function ttsDiskGet(key) {
  try {
    const f = path.join(TTS_DIR, key + '.mp3');
    if (fs.existsSync(f)) return { audio: fs.readFileSync(f).toString('base64'), mime: 'audio/mpeg', disk: true };
  } catch {}
  return null;
}
function ttsDiskPut(key, b64) {
  try {
    fs.mkdirSync(TTS_DIR, { recursive: true });
    fs.writeFileSync(path.join(TTS_DIR, key + '.mp3'), Buffer.from(b64, 'base64'));
  } catch {}
}

async function bhashiniTts(text, locale) {
  const key = process.env.BHASHINI_API_KEY;
  if (!key) return null;
  const r = await fetch('https://api.bhashini.ai/v1/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Apikey: key },
    body: JSON.stringify({
      input: text,
      language: { sourceLanguage: locale, targetLanguage: locale },
      voice: { gender: 'female', language: locale },
      audioConfig: { audioEncoding: 'mp3' },
    }),
  });
  if (!r.ok) throw new Error('bhashini ' + r.status);
  const j = await r.json();
  const d = j && j.audio && j.audio.data;
  if (!d) throw new Error('bhashini empty');
  return { audio: d, mime: 'audio/mpeg' };
}

async function elevenTts(text, locale) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;
  // girl voice default (Rachel); override with ELEVENLABS_VOICE_ID if desired
  const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + (process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb'), {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.75 } }),
  });
  if (!r.ok) throw new Error('eleven ' + r.status);
  const b = Buffer.from(await r.arrayBuffer());
  if (!b.length) throw new Error('eleven empty');
  return { audio: b.toString('base64'), mime: 'audio/mpeg' };
}

async function genTts(text, locale) {
  let lastErr = new Error('no provider key set');
  for (const fn of [bhashiniTts, elevenTts, googleTts]) {
    try { const out = await fn(text, locale); if (out) return { out, lastErr: null }; }
    catch (e) { lastErr = e; }
  }
  throw lastErr;
}
/* keyless fallback: Google Translate TTS needs no credentials and speaks every
   GHOSTWALK language, so voice works on any laptop out of the box. Disable with
   KEYLESS_TTS=0 if a keys-only setup is preferred. Audio is cached like the rest. */
const KEYLESS_TTS = process.env.KEYLESS_TTS !== '0';
const GOOGLE_TTS_TL = {
  en: 'en', hi: 'hi', bn: 'bn', mr: 'mr', gu: 'gu', ta: 'ta', te: 'te',
  kn: 'kn', ml: 'ml', pa: 'pa', ur: 'ur', ne: 'ne', as: 'as', or: 'or',
};
function splitTts(text, max = 180) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sents = clean.split(/(?<=[.!?।])\s+/);
  const out = []; let cur = '';
  for (const s of sents) {
    if ((cur + ' ' + s).trim().length > max && cur) { out.push(cur.trim()); cur = s; }
    else cur += ' ' + s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}
async function googleTts(text, locale) {
  if (!KEYLESS_TTS) return null;
  const tl = GOOGLE_TTS_TL[String(locale || '').toLowerCase().split('-')[0]];
  if (!tl) throw new Error('google tts: unsupported ' + locale);
  const parts = splitTts(text);
  if (!parts.length) throw new Error('google tts: empty');
  const bufs = [];
  for (const p of parts) {
    const u = 'https://translate.google.com/translate_tts?client=tw-ob&tl=' + tl + '&q=' + encodeURIComponent(p);
    const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://translate.google.com/' } });
    if (!r.ok) throw new Error('google tts ' + r.status);
    const b = Buffer.from(await r.arrayBuffer());
    if (!b.length) throw new Error('google tts empty');
    bufs.push(b);
  }
  return { audio: Buffer.concat(bufs).toString('base64'), mime: 'audio/mpeg', keyless: true };
}

app.post('/api/tts', async (req, res) => {
  const raw = String((req.body && req.body.text) || '').slice(0, TTS_MAX).trim();
  const lang = String((req.body && req.body.lang) || 'en').toLowerCase();
  const locale = TTS_LOCALE[lang] || lang;
  if (!raw) return res.status(400).json({ ok: false, reason: 'empty-text' });
  const ck = locale + '|' + raw;
  if (ttsCache.has(ck)) {
    res.set('Cache-Control', 'public, max-age=86400');
    return res.json(Object.assign({ ok: true, cached: true }, ttsCache.get(ck)));
  }
  const key = ttsKey(raw, locale);
  const disk = ttsDiskGet(key);
  if (disk && ttsCacheable(raw)) {
    ttsCache.set(ck, disk);
    res.set('Cache-Control', 'public, max-age=86400');
    return res.json(Object.assign({ ok: true, cached: true }, disk));
  }
  try {
    const { out } = await genTts(raw, locale);
    if (ttsCacheable(raw)) {
      ttsCache.set(ck, out);
      if (ttsCache.size > 200) ttsCache.delete(ttsCache.keys().next().value);
      ttsDiskPut(key, out.audio);
    }
    res.set('Cache-Control', 'public, max-age=86400');
    res.json(Object.assign({ ok: true, locale }, out));
  } catch (e) {
    const noKey = /no provider key/i.test(String((e && e.message) || e));
    res.status(noKey ? 501 : 502).json({ ok: false, reason: noKey ? 'tts-not-configured' : 'tts-failed', detail: String((e && e.message) || e) });
  }
});

/* warm the cache with fixed assistant prompts (single source of truth stays in
   the frontend dicts - the client sends the exact translated strings). Runs in
   the background; never blocks the response. Sensitive/user text is rejected. */
app.post('/api/tts/prewarm', async (req, res) => {
  const items = Array.isArray(req.body && req.body.items) ? req.body.items.slice(0, 24) : [];
  const okItems = items
    .map(i => ({ text: String((i && i.text) || '').slice(0, 300).trim(), lang: String((i && i.lang) || 'en').toLowerCase() }))
    .filter(i => i.text && ttsCacheable(i.text));
  res.json({ ok: true, accepted: okItems.length });
  (async () => {
    for (const i of okItems) {
      const locale = TTS_LOCALE[i.lang] || i.lang;
      const ck = locale + '|' + i.text;
      if (ttsCache.has(ck)) continue;
      try {
        const { out } = await genTts(i.text, locale);
        ttsCache.set(ck, out);
        ttsDiskPut(ttsKey(i.text, locale), out.audio);
      } catch { /* best effort - failures surface on real speak calls */ }
    }
  })();
});

app.get('/api/tts/status', (req, res) => res.json({
  ok: true,
  configured: !!(process.env.BHASHINI_API_KEY || process.env.ELEVENLABS_API_KEY || KEYLESS_TTS),
  providers: [process.env.BHASHINI_API_KEY ? 'bhashini' : null, process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : null, KEYLESS_TTS ? 'keyless' : null].filter(Boolean),
  languages: Object.keys(TTS_LOCALE),
}));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`GHOSTWALK running on port ${PORT}`));
