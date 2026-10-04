/* ──────────────────────────────────────────���──────────────────────────────────
   Grounding facts for Ghost AI explanations.

   This file is the single source of truth for *what the Ghost may say about a
   finding*. Two jobs:

     1. The deterministic engine already observed the evidence. These strings
        restate that observation in plain words so the model has something
        factual to work from. The model never derives evidence itself.

     2. `categoryFor()` groups finding codes into a small number of concepts
        so the translated fallback library only needs a handful of packs
        instead of one per code, while still covering every code the
        investigation engine can emit.

   Keeping this server-side means the AI request carries GHOSTWALK's own
   vocabulary plus the finding codes - never the user's message, links, UPI
   ids, phone numbers or any other user content.
   ────────────────────────────────────────────────────────────────────────── */
'use strict';

/* Every finding code the investigation engine can emit, grouped by concept. */
const CATEGORY = {
  /* money leaves the account to a destination we cannot vouch for */
  upi_no_name: 'payment_destination',
  upi_named: 'payment_destination',
  upi_note_trap: 'payment_destination',
  upi_currency: 'payment_destination',
  page_upi: 'payment_destination',
  upi_qr_push: 'payment_destination',

  /* a second payment is demanded before you can get your own money back */
  unlock_withdrawal: 'withdrawal_trap',
  advance_fee: 'withdrawal_trap',
  repeat_deposit: 'withdrawal_trap',

  /* the journey moves somewhere other than where it appeared to start */
  redirect: 'redirect_identity',
  meta_bounce: 'redirect_identity',
  js_bounce: 'redirect_identity',
  host_mismatch: 'redirect_identity',
  chat_redirect: 'redirect_identity',

  /* the written address does not mean what it appears to mean */
  at_trick: 'lookalike_address',
  ip_host: 'lookalike_address',
  punycode: 'lookalike_address',
  odd_port: 'lookalike_address',
  title_brand: 'lookalike_address',
  impersonation: 'lookalike_address',

  /* the connection itself is not trustworthy */
  plain_http: 'transport_security',
  cert_mismatch: 'transport_security',
  selfsigned: 'transport_security',

  /* the page asks for information it has no business having */
  forms: 'credentials_request',
  foreign_post: 'credentials_request',
  harvest: 'credentials_request',

  /* the page wants control of the device, not just a visit */
  remote: 'device_control',
  perms: 'device_control',
  anti_inspect: 'device_control',

  /* the journey leaves the web for an app the visitor cannot check */
  direct_apk: 'app_install',
  apk: 'app_install',

  /* the site has no history */
  new_domain: 'new_domain',

  /* manufactured time pressure */
  urgency: 'pressure',
  page_urgency: 'pressure',
  countdown: 'pressure',
  limited_slots: 'pressure',

  /* borrowed trust and isolation */
  testimonial: 'deception',
  secrecy: 'deception',

  /* isolation from the official channel */
  off_channel: 'off_channel',
  limited_slots_vip: 'deception',

  /* the page is stitched together from services the visitor never chose */
  franken_page: 'third_party_content',

  /* the money ladder grows */
  escalation: 'escalation',
  guaranteed_returns: 'escalation',

  /* nothing could be loaded */
  unreachable: 'unreachable',
};

/* Dynamic brand codes are emitted as `brand_<keyword>`. */
function categoryFor(code) {
  const c = String(code || '');
  if (CATEGORY[c]) return CATEGORY[c];
  if (c.indexOf('brand_') === 0) return 'lookalike_address';
  return 'unverified';
}

const CATEGORY_LABEL = {
  payment_destination: 'Payment destination could not be verified',
  withdrawal_trap: 'A further payment was demanded before withdrawal',
  redirect_identity: 'The journey moved to a different address',
  lookalike_address: 'The written address does not mean what it appears to mean',
  transport_security: 'The connection to this page was not secure',
  credentials_request: 'The page asked for personal or financial details',
  device_control: 'The page asked for control over the device',
  app_install: 'The page pushed an install from outside the official store',
  new_domain: 'This website is very new',
  pressure: 'The page applied time pressure',
  deception: 'The page used social proof or asked for secrecy',
  off_channel: 'The journey moved off the official channel',
  third_party_content: 'The page was assembled from many outside services',
  escalation: 'The money asked for keeps growing',
  unreachable: 'The destination could not be reached at all',
  unverified: 'The observation is recorded but not yet explained in detail',
};

/* Short factual restatements. These describe what the engine *saw*; they never
   contain a verdict and never contain user data. */
const FACT = {
  upi_no_name: 'The payment address shows no payee name at all.',
  upi_named: 'The payment address shows a payee name, but that name is self-declared by whoever controls the account and can be written as anything.',
  upi_note_trap: 'The payment note itself asks for an extra charge such as a fee or a tax.',
  upi_currency: 'The payment address asks for a currency other than INR.',
  page_upi: 'The page embeds a UPI payment step, so money can leave the account as soon as it is tapped.',
  upi_qr_push: 'The message pushes payment to a personal UPI address or QR code rather than to a verifiable official channel.',

  unlock_withdrawal: 'A further payment is required before the balance already sent can be withdrawn.',
  advance_fee: 'A fee, tax or security charge is demanded up front, before anything is received.',
  repeat_deposit: 'Money already sent is described as stuck or frozen until a new payment is made.',

  redirect: 'The link moved the visitor through one or more additional web addresses before arriving here.',
  meta_bounce: 'The page silently forwards the visitor to a different address without asking.',
  js_bounce: 'The page code forwards the visitor to a different address without asking.',
  host_mismatch: 'The organisation name shown on the page and the address the money journey actually lives on are not the same.',
  chat_redirect: 'The site moves the conversation into a private chat application instead of keeping an official record.',

  at_trick: 'The address uses the part before an @ symbol as a display name, so the real address is the part after it.',
  ip_host: 'The address is a raw numbers-and-dots address rather than a named one.',
  punycode: 'The address contains encoded look-alike characters chosen to resemble a familiar name.',
  odd_port: 'The address uses an unusual network port.',
  title_brand: 'The tab title claims a trusted organisation while the address is not that organisation.',
  impersonation: 'The names of well-known regulators, banks or brokers are mentioned to borrow trust.',

  plain_http: 'The final page is loaded without encryption.',
  cert_mismatch: 'The security certificate names a different site than the one being visited.',
  selfsigned: 'The site certificate is self-signed, meaning the site vouched for itself.',

  forms: 'The page contains forms that collect personal details.',
  foreign_post: 'What the visitor types is sent to a different server from the one hosting the page.',
  harvest: 'The page demands sensitive details such as an OTP, a password, a PIN or a card security code.',

  remote: 'The page asks for screen sharing or remote access.',
  perms: 'The page code reaches for the camera, microphone, location or notifications.',
  anti_inspect: 'The page blocks normal ways of inspecting it, which stops the visitor from checking what it does.',

  direct_apk: 'The link serves an app file directly instead of a page.',
  apk: 'The page pushes an app install from outside the official store.',

  new_domain: 'This website was registered only days ago.',

  urgency: 'The message or page applies time pressure to act immediately.',
  page_urgency: 'The page itself applies time pressure to act immediately.',
  countdown: 'The page runs a countdown or expiry timer.',
  limited_slots: 'The offer is framed as limited, exclusive or selected.',

  testimonial: 'Screenshots or stories of other people earning are used as proof.',
  secrecy: 'The sender asks the visitor to keep the matter secret from anyone else.',

  off_channel: 'The conversation is moved to private chats or screen sharing, away from official channels.',

  franken_page: 'The page is assembled from many outside services rather than being run as one site.',

  escalation: 'The requested amount grows from a small test payment to larger deposits.',
  guaranteed_returns: 'A guaranteed, risk-free or unusually high return is promised.',

  unreachable: 'The destination could not be loaded even once, so nothing about it could be checked.',
};

function factFor(code) {
  const c = String(code || '');
  if (FACT[c]) return FACT[c];
  if (c.indexOf('brand_') === 0) {
    return 'The address borrows the name of a well-known organisation but is not that organisation\u2019s official address.';
  }
  return 'This observation was recorded by the GHOSTWALK investigation engine.';
}

/* The engine's own states. The AI is never allowed to produce or change these. */
const VERDICT = {
  RED: {
    state: 'Dangerous behaviour was observed',
    meaning: 'GHOSTWALK observed specific warning signs while investigating. Observed does not mean proven in a court of law, and absence of a finding is not proof of safety.',
    forbidden: 'Do not send money or share an OTP, PIN, password or card security code until the organisation is verified independently, outside this conversation.',
  },
  YELLOW: {
    state: 'Unable to verify',
    meaning: 'GHOSTWALK could not establish enough to trust this journey. That is not the same as safe, and it is not the same as fraudulent.',
    forbidden: 'Do not pay and do not share personal details until the organisation is verified independently.',
  },
  NONE: {
    state: 'No investigation has been run yet',
    meaning: 'Nothing has been checked yet, so there is no evidence to explain.',
    forbidden: 'Run the check first, then ask the Ghost to explain what it found.',
  },
};

function verdictFor(v) {
  const key = v === 'RED' || v === 'YELLOW' ? v : 'NONE';
  return Object.assign({ code: key }, VERDICT[key]);
}

/* Only these concept names are ever sent to the model. Anything the client
   sends that is not in this table is dropped before the request is built. */
function normalizeCodes(codes) {
  const out = [];
  const seen = new Set();
  const list = Array.isArray(codes) ? codes : [];
  for (const raw of list.slice(0, 12)) {
    const c = String(raw || '').slice(0, 48);
    if (!/^[a-z0-9_]{1,48}$/.test(c)) continue;
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

/** Structured, privacy-safe evidence block for the model. */
function buildEvidence(codes, verdict) {
  const list = normalizeCodes(codes);
  return {
    verdict: verdictFor(verdict),
    observations: list.map(c => ({
      code: c,
      concept: categoryFor(c),
      conceptLabel: CATEGORY_LABEL[categoryFor(c)],
      observed: factFor(c),
    })),
  };
}

module.exports = {
  CATEGORY, CATEGORY_LABEL, FACT, VERDICT,
  categoryFor, factFor, verdictFor, normalizeCodes, buildEvidence,
};