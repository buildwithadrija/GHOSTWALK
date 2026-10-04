# GHOSTWALK — Send a dummy. Not yourself.

Live Demo: (coming after deployment)
Repository: (coming after repository creation)

GHOSTWALK helps ordinary investors check something suspicious *before* acting on it: a strange message, a link, a QR code, or a payment request. Instead of opening the link or scanning the code yourself, a disposable "ghost" investor walks the journey server-side with fake data, and GHOSTWALK reports what it actually observed — redirects, payment destinations, password/OTP forms, app downloads — in plain language, in your language, by voice if you want it.

It never tells you something is "safe". The answer is either STOP, or NOT VERIFIED — do not pay yet.

## The Problem

Most investment fraud starts with first contact: a WhatsApp or Telegram message, a phone call, a link, a QR code, or a UPI payment request. The messages create urgency ("deposit in the next 30 minutes"), show fake profit screenshots, and ask for one small fee to "unlock" a withdrawal. People who have never invested before often cannot tell which technical details matter, and a single percentage score ("92% scam") can make them either panic or feel falsely confident. Some journeys genuinely cannot be verified at all, and that uncertainty itself needs to be communicated.

## How GHOSTWALK Approaches the Problem

GHOSTWALK splits the job in two. First, **investigation**: deterministic, server-side checks that collect observable evidence and nothing else. Second, **explanation**: the Ghost assistant turns that evidence into simple guidance in the user's language. The Ghost never detects fraud itself and never invents findings — it only explains what the investigation already recorded. If the evidence is thin, GHOSTWALK says so instead of guessing.

## What You Can Check

**Check a Message** (`message.html` → `POST /api/analyze`)
You paste chat text, upload a screenshot or PDF, share an invite, or dictate a voice note. Photos are read on your device with Tesseract OCR; nothing is uploaded. GHOSTWALK matches manipulation patterns (guaranteed returns, advance fees, urgency, secrecy, off-channel moves), extracts links and UPI strings, and returns a RED or YELLOW verdict with the matched patterns.

**Investigate a Link** (`ghost.html` → `POST /api/ghost`)
You paste a suspicious URL without opening it. The server fetches it with a sandbox user agent, follows the redirect chain, and flags page-structure observations: forms, password fields, APK downloads, UPI intents, Telegram/WhatsApp pushes, remote-access prompts, lookalike domains, fresh registrations (RDAP), and insecure transport. You get a step log plus a verdict.

**Decode / Inspect a QR Code** (`qr.html`)
You upload the QR image (decoded on-device with a bundled jsQR copy) or paste the UPI string/VPA. GHOSTWALK reads where the money would actually go — payee, amount, note traps — without you scanning anything.

**UPI / Payment Destination Analysis** (part of the above)
UPI addresses are parsed for missing payee names, self-declared names, currency tricks, and extra charges hidden in payment notes.

**Ghost Assistant** (every page)
A floating ghost that guides, teaches each control, repeats instructions, switches language, and — where configured — explains findings in simple words. It knows which page, control, and stage you are on. Details below.

**Recovery Guidance** (`recovery.html` → `POST /api/recovery`)
If money already went out, the flow changes: stop further payments, record a timeline of events, and generate a downloadable Scam Incident Pack with the 1930 helpline and cybercrime portal references.

## A Typical GHOSTWALK Journey

Rahul gets a Telegram message: his ₹5,000 "grew" to ₹8,200, and a ₹25,000 "security fee" will unlock withdrawal — today only. Instead of paying, he pastes the text into Check a Message. GHOSTWALK flags guaranteed returns, an advance fee, urgency, and secrecy, and the SECURITY stamp reads STOP. He taps "Why does this matter?" and the Ghost explains that genuine withdrawals never need an unlocking fee. He then walks the included link: the ghost reports two redirects, a three-day-old domain, and a page asking for an OTP. Rahul does not pay, loops in his daughter via the trusted-contact draft, and keeps the evidence.

## How the Investigation Works

User Input (message text, link, QR image, UPI string — stays on the device or on our server, never anywhere else)
→ Investigation / Analysis (pattern matching, server-side page walk, UPI parsing)
→ Structured Findings (short finding codes like `unlock_withdrawal`, `redirect`, `harvest` plus a RED/YELLOW state)
→ Privacy Processing (identifiers redacted, credentials removed entirely before anything external is involved)
→ Contextual Explanation (Ghost explains the findings in plain words)
→ Language / Voice Guidance (same explanation rendered in the selected language and spoken aloud)
→ User Guidance (concrete next steps: do not pay, verify independently, preserve evidence)

## The Ghost Assistant

Ghost is the guide layer, not a chatbot. It tracks where you are (page, control, input stage, whether results exist), and every menu action has one fixed job: What is this? describes the current page; What should I do now? gives the next step for the current state; Guide me walks the page control by control; Repeat replays the last instruction; voice, language, and minimize only do what they say. The three AI questions — Explain simply, Why does this matter, What should I do next — answer from the same structured evidence. It refuses off-topic questions (stocks, trading tips) with a short redirect back to safety help.

## Evidence, Not False Certainty

Every claim GHOSTWALK makes traces back to something it observed. When the evidence is insufficient, the answer is NOT VERIFIED — and that is explicitly not a clean chit. Unable to Verify does not mean Safe; it means do not pay yet and check through an independent channel. There are no "safe" verdicts and no confidence percentages used as proof anywhere in the product.

## Privacy by Design

- **Data minimization.** The AI layer normally receives no user text at all — only finding codes, page/stage/control names, and language. Meaning comes from `lib/ghost-notes.js`, GHOSTWALK's own vocabulary.
- **Sensitive-data redaction.** `lib/privacy.js` replaces phone numbers, PAN/Aadhaar-like IDs, UPI IDs, emails, account and transaction IDs, and names with typed placeholders.
- **Credential protection.** OTPs, PINs, passwords, CVVs, and card numbers are removed outright — never redacted-in-place, never forwarded, never logged. The interface tells users not to enter them.
- **Prompt-injection separation.** Submitted messages and pages travel fenced as `<untrusted_evidence>` — analysed as data, never followed as instructions — and any echoed instruction in a model reply is rejected.
- **Server-side secrets.** API keys live only in server environment variables. The browser never sees them; provider calls happen server-to-server.
- **Failure behaviour.** Timeouts, quota errors, missing keys, and rejected answers all fall back to the built-in translated explanations. Core protection never depends on the model, and the AI layer keeps no history beyond the current on-screen answer.

## Multilingual Guidance

The interface, the Ghost, findings, and fallback explanations are available in English plus 22 scheduled languages (Hindi, Bengali, Marathi, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi, Assamese, Odia, Urdu, Nepali, Kashmiri, Sindhi, Bodo, Dogri, Konkani, Maithili, Manipuri, Santali, Sanskrit). Five languages are hand-reviewed; the rest ship from generated dictionaries that the audit scripts verify. One global language state drives the page, the Ghost, and voice together, and switching never needs a refresh. QR, UPI, OTP, and URL stay in Latin script by design.

## Voice Guidance

Voice exists so that users who prefer listening — or cannot comfortably read a long warning — still get the full explanation. Spoken text is always the same privacy-safe generated sentence shown on screen, never raw evidence. The stack tries server TTS first (Bhashini or ElevenLabs when keys are configured, otherwise a free keyless provider with local caching), then a matching on-device browser voice for the selected language. Turning voice off stops everything immediately, and pages work identically silent.

## Key Features

Evidence-Based Investigation
Reports warning signs GHOSTWALK actually observed — redirects, fresh domains, OTP harvesting — instead of hiding behind an unexplained risk percentage.

Never-Ask-You-To-Click Design
The disposable ghost takes the risky walk with synthetic data; the user never has to open the suspicious link or scan the code.

Uncertainty-Preserving Verdicts
RED means stop, YELLOW means not verified. "Nothing found" is never presented as proof of safety.

Privacy-First AI Explanations
An optional model explains findings from sanitized, minimal context, with output validation and deterministic fallback — safe by construction, not by promise.

Twenty-Three-Language Interface
Full UI, Ghost guidance, and voice routing in English plus 22 Indian languages, with graceful degradation where a dictionary is still being completed.

First-Response Recovery
For users who already paid: timeline building, evidence preservation, and a downloadable incident pack referencing helpline 1930.

## System Architecture

The browser app (static pages + `common.js`, `i18n.js`, `assistant.js`, `ghost-ai.js`) calls same-origin JSON APIs on one Express server. `/api/analyze` runs the message-pattern engine; `/api/ghost` runs the sandboxed page walk; `/api/recovery` builds incident packs; `/api/tts` brokers speech audio. `/api/ghost/explain` is the AI boundary: finding codes become canonical facts via `lib/ghost-notes.js`, user text passes `lib/privacy.js`, and an optional OpenAI-compatible provider returns an explanation that `lib/ai-ghost.js` validates before display. Translation dictionaries (`public/dict-*.js`, `public/i18n/`) and the audit scripts under `scripts/` keep all 23 languages consistent. There is no database; state lives in `localStorage`/`sessionStorage` (preferences) and in memory (session answers). External services are limited to: the AI provider (optional), TTS providers (optional), translation endpoints used only by the offline dictionary builders, CDNs for fonts/Tesseract, and the investigated sites themselves.

## Tech Stack

Frontend
- HTML/CSS/vanilla JavaScript — five focused pages plus the homepage; no framework, so the whole app works from static files.
- Web Speech API + SpeechSynthesis — on-device voice fallback per language.
- Tesseract.js (CDN) and bundled jsQR — photo OCR and QR decoding happen on the device; images are never uploaded.
- Google Fonts (CDN) — Fraunces + Public Sans for the editorial look.

Backend
- Node.js — runs the APIs and investigation services.
- Express — routes and static hosting from one process; `cors` + 2MB JSON limit.
- Native `fetch`, `tls`, `net`, `crypto` — redirect walking, certificate inspection, hashing.

Investigation
- Hand-built pattern engine (`server.js`) for message manipulation signals.
- Sandboxed page walk: redirect chains, meta/JS bounces, host analysis, form harvesting detection, APK/UPI/remote-access flags, RDAP freshness, punycode and lookalike checks.

Intelligent Guidance
- Deterministic Ghost engine (`assistant.js`, `ghost-ai.js` client) — context tracking, scripted guidance, translated fallback packs.
- Optional OpenAI-compatible chat API via `lib/ai-ghost.js` — explanations only, allowlist-built requests, validated output, 12s timeout.

Privacy & Security
- `lib/privacy.js` — tiered sanitizer (credentials removed, identifiers redacted, entities-only default).
- `lib/ghost-notes.js` — single vocabulary of groundable facts; the model cannot receive anything outside it plus codes.

Translation
- Baked local dictionaries (hand-reviewed core + generated remainder), Google/MyMemory only inside the offline builder scripts, versioned `localStorage` cache for dynamic strings, one global language state.

Voice / TTS
- Server-brokered Bhashini / ElevenLabs / keyless Google TTS with disk + memory cache; browser voices as fallback.

State / Storage
- `localStorage` (language, voice, preferences), `sessionStorage` (session flags), in-memory (answers, findings). No database, no accounts, no tracking.

External Services
- AI provider (optional), TTS providers (optional), dictionary-builder translation endpoints (build-time only), font/Tesseract CDNs, investigated third-party sites.

Deployment
- Single Node process serving API + static frontend; runs anywhere Node runs with `npm install && npm start`.

## Project Structure

```
GHOSTWALK/
  server.js            Express server, APIs, investigation engine, TTS broker
  lib/
    privacy.js         tiered sanitizer for anything AI-bound
    ghost-notes.js     canonical facts per finding code
    ai-ghost.js        provider calls, prompt building, output validation
  public/
    index.html         homepage (five actions, how-it-works, safety contract)
    message.html       check-a-message feature page
    ghost.html         walk-a-link feature page
    qr.html            QR / UPI feature page
    trusted.html       trusted-contact alerts
    recovery.html      already-paid first response
    common.js          shared voice, verdict paint, API helpers
    i18n.js            global language state, translation runtime
    assistant.js       Ghost guide: tours, menu, onboarding, voice routing
    ghost-ai.js        Ghost AI client: context, consent, fallback answers
    dict-*.js          hand-reviewed language dictionaries
    i18n/              generated language dictionaries
    i18n-ghost/        generated Ghost-string overlays
    assets/            artwork and sample images
  scripts/
    ghost-ai-test.js   80 privacy/safety/grounding unit tests
    i18n-*.js          dictionary build, completeness + leak audits, page tests
  package.json         express + cors runtime; jsdom dev tooling for tests
```

`server.js` is the whole backend. `lib/` holds the AI safety boundary. `public/` is the product. `scripts/` holds tests and translation tooling.

## Running GHOSTWALK Locally

Prerequisites: Node.js 18+ and npm.

```powershell
git clone <repository-url>
cd GHOSTWALK
npm install
copy .env.example .env   # optional — only if you use AI/TTS keys
npm start
# open http://localhost:3000
```

Without any keys, everything works except the AI answers come from the built-in translated packs and premium TTS falls back to free/on-device voices.

## Environment Variables

| Name | Purpose | Required | Secret |
|---|---|---|---|
| `PORT` | server port (host sets it; 3000 fallback) | No | No |
| `GHOST_AI_BASE_URL` | OpenAI-compatible endpoint | No | No |
| `GHOST_AI_API_KEY` | enables AI explanations; absent = built-in answers | No | Yes |
| `GHOST_AI_MODEL` | model id | No | No |
| `GHOST_AI_TIMEOUT_MS` | provider timeout | No | No |
| `GHOST_AI_MAX_TOKENS` | response cap | No | No |
| `BHASHINI_API_KEY` | premium TTS provider | No | Yes |
| `ELEVENLABS_API_KEY` | premium TTS provider | No | Yes |
| `ELEVENLABS_VOICE_ID` | voice choice (default Rachel) | No | No |
| `KEYLESS_TTS` | `0` disables the free TTS provider | No | No |

See `.env.example`. Never commit real values.

## Deployment

(Pending — filled in after the live deployment exists.)

Host: Render (Node Web Service — single process serves API + static frontend)
Branch: main
Build command: `npm install`
Start command: `npm start`
Environment: `PORT` is provided by the host; AI/TTS keys optional (app degrades gracefully without them).

## Team

Shreya Majumder — Product, Frontend & User Experience
GitHub: @Shreya-sudo-spec
Led the overall product experience, frontend interface, navigation, interaction flow, responsive behaviour, and final integration of GHOSTWALK's user-facing features.

Adrija Ray — Backend & Investigation Engine
GitHub: @buildwithadrija
Led backend integration, server-side API workflows, investigation logic, validation, and the technical reliability of GHOSTWALK's analysis pipeline.

Bhumi Shah — Quality Assurance, Privacy & Language Review
GitHub: @bhumishah547
Supported final functional testing, privacy checks, multilingual experience review, and validation of key user journeys.

Sneha Goswami — Documentation, Demo Validation & Deployment Support
GitHub: @snehagoswami355-tech
Supported project documentation, deployment verification, demo readiness, and final release checks.

## Current Limitations

- Sites that block automated fetching (bot protection, login walls) cannot be walked; GHOSTWALK reports them as unreachable rather than guessing.
- Link investigation needs outbound network access, so heavily restricted hosts reduce what the ghost can see.
- Photo OCR loads Tesseract from a CDN, so screenshots need internet on first use.
- Without an AI key, explanations come from the built-in packs — accurate but less conversational.
- Browser voice availability differs by device and language; silent text guidance always works.
- The server TTS cache lives on local disk, which hosts like Render treat as temporary.

## Future Scope

- Widen the hand-reviewed language core beyond the current five as translators verify more dictionaries.
- Add deep-scan SDK checks (Play Protect-style app reputation) to the APK flag path.
- Let users forward full chat exports (WhatsApp `.txt`) instead of pasting excerpts.
