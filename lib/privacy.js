/* ─────────────────────────────────────────────────────────────────────────────
   GHOSTWALK privacy layer for AI assistance.

   Nothing reaches an external AI provider unless it passes through this file.

   Three data tiers (see the product rules):
     CREDENTIAL  OTP / PIN / password / CVV / card number / banking credential.
                 NEVER sent in any form. Removed, not just masked.
     SENSITIVE   phone, PAN, Aadhaar-like id, bank account, UPI id, name,
                 e-mail, transaction id, address, free text of messages.
                 Replaced with typed placeholders, or dropped entirely in
                 "entities only" mode.
     SAFE        page name, control name, stage, finding codes, counts, risk
                 state, selected language. Used freely.

   Default output mode is `entities`: the model receives only the structured
   booleans/counts it needs to explain a finding, never the user's own words.
   `mode: 'redact'` keeps the linguistic shape of a message (pressure and
   manipulation patterns survive) with every identifier replaced.
   ────────────────────────────────────────────────────────────────────────── */
'use strict';

/* ── tier 3: credentials ───────────────────────────────────────────────────
   Ordered. Each rule removes the credential and leaves a typed marker so the
   model can still see that a credential was requested - which is often the
   single most important safety signal in the whole conversation. */
const CREDENTIAL_RULES = [
  { id: 'otp', rx: /\b(?:otp|one[\s-]?time[\s-]?pass(?:word)?|verification[\s-]?code|auth(?:entication)?[\s-]?code|secure[\s-]?code|access[\s-]?code)\b\s*(?:is|are|=|:|-)?\s*:?\s*(\d{4,8})\b/gi },
  { id: 'otp', rx: /\b(\d{4,8})\b(?=[^\d]{0,28}?\b(?:otp|verification\s?code|auth\s?code|secure\s?code)\b)/gi },
  { id: 'pin', rx: /\b(?:pin|atm[\s-]?pin|net[\s-]?banking[\s-]?pin|upi[\s-]?pin|mpin)\b\s*(?:is|are|=|:|-)?\s*:?\s*(\d{4,8})\b/gi },
  { id: 'cvv', rx: /\b(?:cvv2?|cvc2?|cvn|security[\s-]?code|card[\s-]?verification(?:[\s-]?code)?)\b\s*(?:is|are|=|:|-)?\s*:?\s*(\d{3,4})\b/gi },
  { id: 'password', rx: /\b(?:password|passwd|passcode|pwd|login[\s-]?password|banking[\s-]?password|account[\s-]?password)\b\s*(?:is|are|=|:|-)?\s*:?\s*['"]?([^\s'"]{3,})['"]?/gi },
  { id: 'card_number', rx: /\b(?:\d[ \-]?){12,18}\d\b/g },
  { id: 'atm_pin_bare', rx: /\b\d{4}\b(?=[^\d]{0,20}?\b(?:atm[\s-]?pin|withdraw(?:al)?[\s-]?pin)\b)/gi },
];

/* ── tier 2: sensitive identifiers ───────────────────────────────────────────
   Replaced with a typed placeholder so sentence shape and manipulation
   pressure survive without the identifier itself. Order matters: a longer
   labelled token (transaction id, IFSC) must win over the generic
   twelve-digit "identifier-like" rule below it. */
const SENSITIVE_RULES = [
  { id: 'txn_id', rx: /\b(?:utr|txn|transaction|ref(?:erence)?|receipt|order[\s-]?id)[\s.:#-]*\s*[A-Z0-9\-]{6,24}\b/gi },
  { id: 'ifsc', rx: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g },
  { id: 'bank_account', rx: /\b(?:a\/?c|acc(?:ount)?)\s*[\s.:#-]*\s*\d{9,18}\b/gi },
  { id: 'aadhaar', rx: /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g },
  { id: 'pan', rx: /\b[A-Za-z]{5}\d{4}[A-Za-z]\b/g },
  { id: 'upi_id', rx: /\b[\w.\-]{2,64}@[a-z]{2,12}\b/gi },
  { id: 'email', rx: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g },
  { id: 'phone', rx: /(?:\+\d{1,3}[\s\-]?)?(?:\(\d{2,4}\)[\s\-]?)?\b[6-9]\d{4}[\s\-]?\d{5}\b/g },
  { id: 'phone', rx: /\b\d{3}[\s\-]\d{3}[\s\-]\d{4}\b/g },
  { id: 'dob', rx: /\b(?:dob|date of birth|born)[\s.:#-]*\s*\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/gi },
  { id: 'bank_account', rx: /\b\d{12,18}\b(?=[^\d]{0,24}\b(?:account|a\/?c|ifsc|savings)\b)/gi },
  { id: 'aadhaar_like', rx: /\b\d{4}\s?\d{4}\s?\d{4}\b/g },
];

/* Names are only removed where a greeting or an explicit statement makes the
   reading safe. Over-eager name removal would shred normal sentences, and the
   whole point of this layer is to keep the sentence readable. Case classes
   are written out so the captured name stays case-sensitive. */
const NAME_RULES = [
  { id: 'name', rx: /\b(?:[Hh]i|[Hh]ey|[Hh]ello|[Dd]ear|good\s+(?:[Mm]orning|[Ee]vening|[Aa]fternoon)|namaste|नमस्ते)\s+([A-Z][a-z]{1,20})\s*[,!.]/g },
  { id: 'name', rx: /\b(?:[Mm]y name is|[Nn]ame is|[Ii] am|[Ii]'m|[Tt]his is|आपका नाम|मेरा नाम|मेरा नाम है)\s+([A-Z][a-z]{1,20})\b/g },
  { id: 'name', rx: /\b(?:[Mm]r|[Mm]rs|[Mm]s|[Mm]iss|[Ss]hri|[Ss]mt)\.?\s+([A-Z][a-z]{1,20})\b/g },
];

const PLACEHOLDER = {
  otp: '[OTP_REMOVED]', pin: '[PIN_REMOVED]', password: '[PASSWORD_REMOVED]',
  cvv: '[CARD_SECURITY_CODE_REMOVED]', card_number: '[CARD_NUMBER_REMOVED]',
  atm_pin_bare: '[PIN_REMOVED]',
  aadhaar: '[AADHAAR_REDACTED]', aadhaar_like: '[IDENTIFIER_REDACTED]',
  pan: '[PAN_REDACTED]', upi_id: '[UPI_ID_REDACTED]', email: '[EMAIL_REDACTED]',
  phone: '[PHONE_REDACTED]', bank_account: '[ACCOUNT_NUMBER_REDACTED]',
  ifsc: '[IFSC_REDACTED]', txn_id: '[TRANSACTION_ID_REDACTED]', dob: '[DATE_REDACTED]',
  name: '[NAME]',
};

const MAX_AI_CHARS = 1200;

/* Stable, non-identifying flags the Ghost may send and the model may use. */
function detectEntities(text) {
  const t = String(text || '');
  const out = {
    otpRequested: false, pinRequested: false, passwordRequested: false,
    cvvRequested: false, cardNumberPresent: false,
    phoneNumberPresent: false, upiIdPresent: false, panPresent: false,
    aadhaarPresent: false, bankAccountPresent: false, emailPresent: false,
    transactionIdPresent: false, namePresent: false,
    amountMentioned: false, amounts: [],
    linkPresent: false, urgencyPressure: false, secrecyRequest: false,
    remoteAccessRequest: false, guaranteedReturnClaim: false,
    paymentRequest: false, appInstallRequest: false,
  };
  if (!t.trim()) return out;

  for (const r of CREDENTIAL_RULES) {
    if (r.id === 'otp' && r.rx.test(t)) out.otpRequested = true;
    if (r.id === 'pin' && r.rx.test(t)) out.pinRequested = true;
    if (r.id === 'password' && r.rx.test(t)) out.passwordRequested = true;
    if (r.id === 'cvv' && r.rx.test(t)) out.cvvRequested = true;
    if (r.id === 'card_number' && r.rx.test(t)) out.cardNumberPresent = true;
    r.rx.lastIndex = 0;
  }
  for (const r of SENSITIVE_RULES) {
    if (r.id === 'upi_id' && r.rx.test(t)) out.upiIdPresent = true;
    if (r.id === 'email' && r.rx.test(t)) out.emailPresent = true;
    if (r.id === 'phone' && r.rx.test(t)) out.phoneNumberPresent = true;
    if (r.id === 'pan' && r.rx.test(t)) out.panPresent = true;
    if ((r.id === 'aadhaar' || r.id === 'aadhaar_like') && r.rx.test(t)) out.aadhaarPresent = true;
    if (r.id === 'bank_account' && r.rx.test(t)) out.bankAccountPresent = true;
    if (r.id === 'txn_id' && r.rx.test(t)) out.transactionIdPresent = true;
    r.rx.lastIndex = 0;
  }
  for (const r of NAME_RULES) { if (r.rx.test(t)) { out.namePresent = true; break; } r.rx.lastIndex = 0; }

  /* Indian digit grouping (50,000 / 1,20,000) and bare 5+ digit runs both count as
     an amount. Run against a masked copy: a 10-digit phone number or a 12-digit
     account number would otherwise be mistaken for an amount and leak into the
     payload as a number the model should never see. */
  const seen = new Set();
  const amountSource = applyRules(applyRules(applyRules(t, CREDENTIAL_RULES, seen), SENSITIVE_RULES, seen), NAME_RULES, seen);
  const am = amountSource.match(/(?:₹|rs\.?|inr)\s?([\d,]+(?:\.\d+)?)|([\d,]{4,})\s*(?:₹|rs\.?|inr)|\b\d{1,3}(?:,\d{2,3})+\b|\b\d{5,}\b/gi) || [];
  for (const a of am) {
    const n = parseInt(String(a).replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(n) && n >= 100) { out.amountMentioned = true; if (out.amounts.length < 5 && out.amounts.indexOf(n) === -1) out.amounts.push(n); }
  }
  if (/https?:\/\/|www\.|upi:\/\//i.test(t)) out.linkPresent = true;
  if (/\b(urgent|immediately|right now|act now|act fast|do it now|don'?t delay|hurry|last chance|today only|expires?|expiring|within \d+\s?(?:min|hour)|slots? closing)\b/i.test(t)) out.urgencyPressure = true;
  if (/\b(don'?t tell|keep (?:it |this )?secret|between us|don'?t share|confidential)\b/i.test(t)) out.secrecyRequest = true;
  if (/\b(teamviewer|anydesk|remote access|screen[\s-]?shar\w*|screenshare)\b/i.test(t)) out.remoteAccessRequest = true;
  if (/\b(guarantee\w*|assured|risk[\s-]?free|fixed profit|sure profit|no loss|\d{2,3}\s?%\s?(?:return|profit|daily))/i.test(t)) out.guaranteedReturnClaim = true;
  if (/\b(?:unlock (?:your |the )?withdraw|send (?:the )?money|send (?:₹|rs\.?|inr|\d)|pay(?:ment)?\b|pay |deposit|transfer|top\s?up)/i.test(t)) out.paymentRequest = true;
  if (/\b(install|download|apk)\b/i.test(t)) out.appInstallRequest = true;
  return out;
}

function tierOf(text) {
  const t = String(text || '');
  for (const r of CREDENTIAL_RULES) { if (r.rx.test(t)) { r.rx.lastIndex = 0; return 'credential'; } r.rx.lastIndex = 0; }
  for (const r of SENSITIVE_RULES) { if (r.rx.test(t)) { r.rx.lastIndex = 0; return 'sensitive'; } r.rx.lastIndex = 0; }
  for (const r of NAME_RULES) { if (r.rx.test(t)) { r.rx.lastIndex = 0; return 'sensitive'; } r.rx.lastIndex = 0; }
  return 'clean';
}

function applyRules(text, rules, seen) {
  let t = String(text || '');
  for (const r of rules) {
    t = t.replace(r.rx, () => {
      seen.add(r.id);
      return PLACEHOLDER[r.id] || '[REDACTED]';
    });
    r.rx.lastIndex = 0;
  }
  return t;
}

/**
 * sanitizeForAI(input, opts)
 *   mode: 'entities' (default) -> no user prose at all, structured flags only
 *         'redact'             -> prose with every identifier replaced
 *   Returns { text, entities, tier, redacted, removed, safeToShare, reason }
 */
function sanitizeForAI(input, opts) {
  const o = opts || {};
  const mode = o.mode === 'redact' ? 'redact' : 'entities';
  const raw = String(input == null ? '' : input);
  const entities = detectEntities(raw);
  const tier = tierOf(raw);
  const removed = new Set();
  const redacted = new Set();

  if (!raw.trim()) {
    return { text: '', entities, tier: 'clean', redacted: [], removed: [], safeToShare: true, reason: 'empty' };
  }

  if (mode === 'entities') {
    return {
      text: '',
      entities, tier,
      redacted: Object.keys(entities).filter(k => entities[k] === true),
      removed: [],
      safeToShare: true,
      reason: 'entities-only',
    };
  }

  /* credentials first so a PIN inside a longer number is never left behind */
  let out = applyRules(raw, CREDENTIAL_RULES, removed);
  out = applyRules(out, SENSITIVE_RULES, redacted);
  out = applyRules(out, NAME_RULES, redacted);

  /* strip long digit runs and any leftover address-like leftovers */
  out = out.replace(/\b\d{7,}\b/g, '[NUMBER_REDACTED]');

  const clipped = out.length > MAX_AI_CHARS;
  if (clipped) out = out.slice(0, MAX_AI_CHARS) + ' [TRUNCATED]';

  return {
    text: out,
    entities, tier,
    redacted: [...redacted],
    removed: [...removed],
    safeToShare: removed.size === 0,
    reason: clipped ? 'clipped' : 'redacted',
  };
}

/** Structured, identity-free description of a submitted text block. */
function summarize(input) {
  const s = sanitizeForAI(input, { mode: 'entities' });
  return s.entities;
}

/** True when the text still contains something we would not want to forward
    even after redaction - used to force the consent dialog. */
function needsConsent(input) {
  const t = tierOf(input);
  return t === 'credential';
}

module.exports = {
  sanitizeForAI,
  summarize,
  detectEntities,
  tierOf,
  needsConsent,
  PLACEHOLDER,
  MAX_AI_CHARS,
};