/* GHOSTWALK Ghost Assistant — guided accessibility layer.
   Uses the official avatar at assets/ghost.jpeg EXACTLY as supplied (never redrawn/recolored).
   Separate component: observes the page, never alters existing logic.
   - Appears every fresh session (no permanent hide flag; language + voice prefs are kept).
   - Layout: ghost hovers BESIDE the list box (16-24px gap, vertically centered).
   - Language state: existing applyLang() only. Voice: existing speak/stopSpeak only. */
(function () {
  'use strict';
  const AVATAR = 'assets/ghost.jpeg';
  const ALT = 'GHOSTWALK ghost guide';
  const SL = () => (window.siteLang ? siteLang() : 'en');

  const G = {
    en: {
      welcomeT: 'Welcome to GHOSTWALK',
      welcomeV: 'Would you like voice guidance while using this service?',
      hear: 'Hear this message',
      whichLang: 'Select your preferred language.',
      moreLangs: 'More languages…',
      voiceQ: 'Would you like voice guidance too?',
      voiceOn: 'Enable Voice Guidance', voiceOff: 'Continue With Text Only',
      allSet: 'All set. I will stay here in the corner — tap me anytime you need help.',
      close: 'Close', back: '← Back', mute: '🔇 Mute voice', unmute: '🔊 Voice off — tap to enable',
      voiceNA: 'Voice guidance is not available for this language on this device. Text guidance will continue.',
      pause: '⏸ Pause', resume: '▶ Resume', repeat: '🔁 Repeat', disableV: 'Disable voice', enableV: 'Enable voice',
      changeL: 'Change language', replay: 'Repeat guidance', curL: 'Current language:',
      menuTitle: 'How can I help?',
      tGuide: 'Guide me through this page', tExplain: 'Explain this option', tRepeat: 'Repeat last instruction',
      actWhatIsThis: 'What is this?', actWhatNext: 'What should I do now?',
      repeatNone: 'There isn’t an earlier instruction to repeat yet.',
      tVoiceOn: 'Voice guidance on', tVoiceOff: 'Voice guidance off', tMin: 'Minimize', tFull: 'Open full assistant',
      tNext: 'Next', tPrev: 'Back', tEnd: 'End guide', tYes: 'Yes, guide me', tNotNow: 'Not now',
      guideOffer: 'Would you like a quick guide to these options?',
      g_check: 'Paste the suspicious message here, or use the upload option if you received it as a screenshot or document. Do not include passwords, OTPs or banking credentials. Once the content is ready, select the analysis button below.',
      g_walk: 'If someone sent you a suspicious investment link, copy it without opening it and paste it into this box. When you are ready, select “Start Investigation”. GHOSTWALK will attempt to examine the destination separately and return the behaviour it observed.',
      g_qr: 'Select a photo or screenshot containing the complete QR code. You do not need to scan it using a payment application. After selecting the image, check the preview and choose “Use This Image”.',
      g_trusted: 'Review the summary first. If it accurately describes the situation, select the trusted person you want to involve. GHOSTWALK will prepare the warning information for them. Check it before sending.',
      g_paid: 'Do not send additional money. Start by recording what was paid and when. Then preserve screenshots, payment references and messages. GHOSTWALK will organise the information and show the next supported recovery steps.',
      g_check_go: 'Type or paste the message above, then press this button to start the analysis. The ghost reads everything on this device — nothing is opened or paid.',
      g_walk_go: 'Press this button to send the ghost down the link. It walks the journey server-side with fake details and stops safely — you never open it yourself.',
      g_qr_go: 'Press this button after pasting the UPI details. The ghost decodes where the money would go and shows the payee, amount and warnings.',
      g_trusted_go: 'Press this button to prepare the alert. Read the preview carefully before sharing it with your trusted person.',
      g_paid_go: 'Press this button to build your incident pack. It organises your timeline and evidence for the 1930 helpline — recovery is never guaranteed.',
      m_start: 'The destination is now being examined in an isolated environment.',
      m_done: 'The investigation is complete. I can explain the findings one at a time.',
      langChanged: 'Language changed. I will continue guiding you in this language.',
voiceWelcome: 'Welcome to Ghostwalk. I’m here to guide you. I can explain each option and show you what to do next.',
      textWelcome: 'Welcome to GHOSTWALK. I’m here if you need help. Tap the small Ghost or any ? icon for an explanation.',
      hintHome: 'Need help? Tap the ? beside any option, or open the Ghost for a guided tour.',
      tExplainChoice: 'What would you like me to explain?',
      explainName_checkMessage: 'Check a Message', explainName_walkLink: 'Walk a Link', explainName_qr: 'Decode QR / UPI',
      explainName_trustedContact: 'Alert Someone I Trust', explainName_alreadyPaid: 'I Already Paid',
      vLead: 'Here is why, in simple words.', vReason: 'Reason {n}:', vExample: 'For example:',
      vRephrase: 'In other words, ', vDoubt: 'When in doubt, do not pay yet. Talk to someone you trust first.',
      emptyRead: 'Nothing to read yet.', translating: 'Translating the page — a moment…',
      netStruggle: 'Translation is struggling on this network — showing English for now.',
      qrUpload: 'Upload QR image', qrUploadSub: 'Upload a photo or screenshot containing the QR code. GHOSTWALK will decode it without initiating a payment.',
      qrDrop: '…or drag and drop an image here', qrTakePhoto: 'Take photo', qrUse: 'Use this image',
      qrChange: 'Choose another', qrRemove: 'Remove',
      qrNoCode: 'We could not read a QR code from this image. Try a clearer image where the entire QR code is visible.',
      qrTooBig: 'That image is too large. Please choose an image under 8 MB.',
      qrBadFile: 'That file could not be read as an image. Please choose a PNG, JPG or WebP screenshot.',
      qrType: 'Type', qrUpi: 'UPI payment request', qrUrl: 'Web link', qrText: 'Text',
      qrPayee: 'Payee / UPI ID', qrName: 'Name', qrAmount: 'Amount', qrNote: 'Note / reference',
      qrDecodeUpi: 'Decode payment intent', qrInvestigate: 'Investigate this link safely', qrFoundTitle: 'QR detected',
      qrFoundSay: 'QR detected. {detail}',
qrGuideSteps: 'A sample QR image has been loaded. Review the image preview. Select Use This Image. GHOSTWALK will now decode its contents.',
      g_qr_img: 'If someone sent you a QR code for an investment or payment, upload the picture here. You do not need to scan it using your payment application just to see what it contains. After decoding, review the destination before doing anything else.',
      g_qr_found: 'Here is what the QR contains. Nothing was paid and nothing was opened.',
      sampleNote: 'Sample — for demonstration only.',
      sampleJourneyNote: 'Controlled demonstration journey — safe test destination, not a live threat.',
      sampleQrNote: 'Sample QR — demonstration only. No payment was initiated.',
      sampleCaseNote: 'Sample recovery case — fictional demo data. Recovery is never guaranteed.',
      sampleAlertText: 'I received an investment request that GHOSTWALK identified as requiring further verification. Before I proceed, could you review this with me?',
      sampleContact: 'Sample Contact',
      packNeed: 'Add at least one step of what happened first.',
      carriedOver: '👻 Carried over from your analysis — review and press Draft.',
      explain: 'Explain', readAloud: 'Read aloud', notNow: 'Not now',
      resultsReady: 'Your result is ready below. Tap me and I will explain it simply.',
      uncertain: 'We could not verify this reliably. That does not mean it is safe. Please do not proceed until you verify it independently.',
      checking: 'The check is running below. It reads the destination in isolation, so you do not have to touch anything yourself.',
      understood: 'Understood. I am here if you need me.',
      noResult: 'Run a check first — then I can explain exactly what it found.',
      m_index_t: 'What GHOSTWALK does',
      m_index: ['Pick what you received: message, link, QR, trusted person, or already-paid help.', 'You never open suspicious links yourself — the ghost walks them server-side.', 'You only ever get STOP or NOT VERIFIED. Never a false “safe”.'],
      m_message_t: 'Checking a message',
      m_message: ['Paste the chat in the Text tab and press Analyse.', 'Photo tab reads screenshots and finds hidden QR codes.', 'PDF tab reads brochures. Voice tab lets you speak instead of typing.'],
      m_ghost_t: 'Walking a link',
      m_ghost: ['Paste the suspicious link in the box. Do NOT open it yourself.', 'Press “Send the ghost” and watch the replay below.', 'The ghost uses only fake details — never yours.'],
      m_qr_t: 'Reading a QR / UPI',
      m_qr: ['Paste the UPI string hiding behind the QR — never scan it yourself.', 'The ghost reads where the money would actually go.', 'Compare the shown name with the real company separately.'],
      m_trusted_t: 'Asking someone you trust',
      m_trusted: ['Fill the name and amount, then press Draft.', 'Share the short message on WhatsApp with your family.', 'They do not approve anything — they just stand with you.'],
      m_recovery_t: 'If you already paid',
      m_recovery: ['Add what happened step by step.', 'Press “Build my incident pack” and download it.', 'Take it to your bank and helpline 1930. Stop all further payments.'],
      understand: 'Understand my result',
      saidRed: 'This says STOP. Do not pay and do not share OTP or bank details.',
      saidYellow: 'This says NOT VERIFIED. Do not pay yet.',

      /* ── Ghost AI: interface copy ──────────────────────────────────────────
         Every string below is a complete standalone sentence in every language.
         Nothing is assembled from fragments, and nothing falls back to English:
         if a language is missing a key the Ghost says so instead of mixing
         languages inside one sentence. */
      ai_title: 'Ghost AI',
      ai_assisted: 'AI-assisted explanation',
      ai_note: 'The Ghost receives only the information needed to explain this finding. Sensitive details are removed before AI processing.',
      ai_why_data: 'Why AI needs this',
      ai_privacy: 'Privacy',
      ai_p1: 'AI is used only to explain findings and to guide you through this interface.',
      ai_p2: 'Sensitive information is minimised and redacted before anything is processed.',
      ai_p3: 'Never enter an OTP, PIN, password or card security code anywhere in GHOSTWALK.',
      ai_p4: 'External AI processing happens only where it is configured and only for the explanation you asked for.',
      ai_p5: 'You can use every core GHOSTWALK feature without AI assistance.',
      ai_simple: 'Explain simply',
      ai_why: 'Why does this matter?',
      ai_next: 'What should I do next?',
      ai_overview: 'Explain what was found',
      ai_working: 'Translating…',
      ai_basic: 'Showing the built-in explanation',
      ai_unavail: 'AI help is not available right now, so here is the built-in explanation instead.',
      ai_src_ai: 'AI-assisted',
      ai_src_basic: 'Built-in',
      ai_privacy_short: 'Sensitive details removed before AI processing',
      ai_consent_q: 'To explain this content using AI, GHOSTWALK would need to process the text after removing detected sensitive information. Continue?',
      ai_consent_yes: 'Continue',
      ai_consent_no: 'Use basic analysis instead',
      ai_offtopic: 'I help with GHOSTWALK, fraud safety and investor protection only. I cannot recommend investments, shares or trades.',
      ai_retry: 'Try again',
      ai_never: 'Do not share an OTP, PIN, password or card security code with anyone.',
      ai_missing_key: 'This explanation is not available in your language yet. Every other part of GHOSTWALK still works, and the built-in answer below is always shown instead.',
      ai_send_none: 'Nothing was sent to any AI provider for this explanation.',

      /* deterministic packs: one complete explanation per finding concept and
         per question type, so a working answer never depends on a network call */
      gd_red_simple: 'GHOSTWALK observed specific warning signs while investigating. Something dangerous was seen, and the absence of further warnings is not proof of safety.',
      gd_red_why: 'What was observed is recorded as evidence, not as a proven court case. It is still enough to justify stopping, because sending money or sharing an OTP cannot be undone.',
      gd_red_next: 'Do not send money and do not share an OTP, PIN, password or card security code. Verify the organisation independently, outside this conversation, before doing anything else.',
      gd_yellow_simple: 'GHOSTWALK could not establish enough to trust this journey. That does not mean it is safe, and it does not mean it is fraudulent.',
      gd_yellow_why: 'Not verified means the checks could neither confirm nor deny anything. The risk of acting without verification falls entirely on you.',
      gd_yellow_next: 'Do not pay and do not share personal details until the organisation is verified independently, outside this conversation.',
      gd_none_simple: 'Nothing has been checked yet, so there is nothing for me to explain.',
      gd_none_why: 'An explanation can only describe what was actually observed. Without a check, any description would be guesswork.',
      gd_none_next: 'Run the check first, then ask me to explain what it found.',

      gc_payment_destination_simple: 'The money would leave your account to a payment address that GHOSTWALK could not match to a verified organisation.',
      gc_payment_destination_why: 'A payment address is the person or business that would receive your money. Because it could not be verified independently, there is no way to confirm who would actually receive the payment.',
      gc_payment_destination_next: 'Do not pay yet. Compare the payee name shown in your payment app with the official organisation name, using a website or phone number you already trust.',
      gc_withdrawal_trap_simple: 'Another payment is being demanded before you can get the money you already sent back.',
      gc_withdrawal_trap_why: 'Legitimate withdrawals deduct charges from the balance. A separate demand for a new payment before releasing funds is a well-known trap, and the first payment is usually never returned.',
      gc_withdrawal_trap_next: 'Stop all further payments. Do not send a fee, tax or deposit in order to release funds. Treat the money already sent as lost and contact your bank immediately.',
      gc_redirect_identity_simple: 'The link moved you through other web addresses before arriving here, so the final page is not the one the link appeared to point to.',
      gc_redirect_identity_why: 'Every hop is a chance to change what you are shown without changing anything visible about the link you clicked. The organisation you thought you opened may be a different one.',
      gc_redirect_identity_next: 'Stop the journey and do not enter anything on this page. Open the official website yourself by typing an address you already know, then check whether the offer exists there.',
      gc_lookalike_address_simple: 'The written address is designed to look like a trusted organisation but is not that organisation.',
      gc_lookalike_address_why: 'Characters can be replaced with visually identical ones, or text can be hidden before an @ symbol, so the address reads like a bank or broker while actually pointing somewhere else.',
      gc_lookalike_address_next: 'Do not continue. Verify the organisation through a channel you already trust, such as the number on your bank card or its official app. Never verify inside the same chat or on the same page.',
      gc_transport_security_simple: 'The connection to this page was not secure, or the site could not prove who it is.',
      gc_transport_security_why: 'Without a valid certificate, whoever operates the connection can read and change what you type. A certificate naming a different site means the page is being served from somewhere it does not belong.',
      gc_transport_security_next: 'Do not enter any personal or financial detail. Leave the page and use only the official app or website of the organisation, reached independently.',
      gc_credentials_request_simple: 'This page asked for personal or financial details that no legitimate investment page should need.',
      gc_credentials_request_why: 'An OTP, password, PIN or card security code can approve payments or give someone access to your account. No genuine support representative should ever ask you to share one.',
      gc_credentials_request_next: 'Share nothing. If you already entered an OTP or password, change the password and call your bank immediately, then report it on the cyber-crime helpline 1930.',
      gc_device_control_simple: 'The page asked for control over your device, such as screen sharing or access to your camera and microphone.',
      gc_device_control_why: 'Remote access lets another person watch everything you do and enter data on your behalf, including anything you type into your banking app.',
      gc_device_control_next: 'Decline the request and close the page. Never install remote-access software for someone you have not met. If you already installed it, switch off your internet and ask someone you trust for help.',
      gc_app_install_simple: 'The page tried to move you into an app installed from outside the official store.',
      gc_app_install_why: 'An app installed this way skips the store checks and can read your messages, notifications and banking details.',
      gc_app_install_next: 'Do not install it. Delete anything already downloaded, and reach the organisation only through its official app from the store you normally use.',
      gc_new_domain_simple: 'This website was created only days ago.',
      gc_new_domain_why: 'Scam operations are usually built quickly and abandoned quickly. A site with no history is far more likely to be new than an established organisation that has just moved.',
      gc_new_domain_next: 'Treat the offer as unverified. Check whether the organisation has an official website, app or registration that you can reach without using this link.',
      gc_pressure_simple: 'The page or message is applying time pressure to make you act right now.',
      gc_pressure_why: 'Pressure is designed to stop you thinking or asking someone you trust. A genuine investment opportunity still exists tomorrow, but a countdown usually does not.',
      gc_pressure_next: 'Stop and wait. Close the page, then verify the organisation independently before doing anything at all.',
      gc_deception_simple: 'The page used other people\u2019s success as proof, or asked you to keep the matter secret.',
      gc_deception_why: 'Screenshots of profits are easy to fabricate, and asking for secrecy removes the one protection that works: a second opinion from someone who knows you.',
      gc_deception_next: 'Do not rely on the testimonials. Show the offer to someone you trust, outside this conversation, before acting on it.',
      gc_off_channel_simple: 'The conversation was moved into a private chat application or into screen sharing.',
      gc_off_channel_why: 'Private channels leave no record you can return to, and the person you are talking to can no longer be checked against any official channel.',
      gc_off_channel_next: 'Move the conversation back to an official channel, or stop. Do not continue in a private chat application.',
      gc_escalation_simple: 'The amount being asked for keeps growing, and a guaranteed or unusually high return was promised.',
      gc_escalation_why: 'Genuine investments always carry risk and never guarantee profit. A pattern that starts small and then grows is designed to increase what you stand to lose.',
      gc_escalation_next: 'Do not make the next payment. A guaranteed return is the clearest warning sign there is.',
      gc_unreachable_simple: 'The destination could not be loaded even once, so nothing about it could be checked.',
      gc_unreachable_why: 'An address that does not load reliably cannot be examined. That is an absence of evidence, not evidence of safety.',
      gc_unreachable_next: 'Treat the offer as unverified and do not pay. The fact that it worked for you does not mean it is safe.',
      gc_third_party_content_simple: 'This page is not run as one website. It is stitched together from many outside services.',
      gc_third_party_content_why: 'When a page is built from many outside services, any one of them can change what you see, and none of them is accountable to you.',
      gc_third_party_content_next: 'Do not enter anything on this page. Reach the organisation through its own website or app, found independently.',
      gc_unverified_simple: 'GHOSTWALK recorded this observation, but does not yet have a plain-language explanation for it.',
      gc_unverified_why: 'The observation is recorded as evidence. It was not checked further, so no conclusion should be drawn from it either way.',
      gc_unverified_next: 'Do not pay or share any personal detail because of this. Run the check again, or verify the organisation independently.',
    },
    hi: {
      welcomeT: 'GHOSTWALK में आपका स्वागत है',
      welcomeV: 'क्या इस सेवा में आवाज़-मार्गदर्शन चाहेंगे?',
      hear: 'यह संदेश सुनें',
      whichLang: 'अपनी पसंदीदा भाषा चुनें।',
      moreLangs: 'और भाषाएँ…',
      voiceQ: 'क्या आवाज़ में भी समझाऊँ?',
      voiceOn: 'आवाज़ चालू करें', voiceOff: 'सिर्फ़ टेक्स्ट में जारी रखें',
      allSet: 'हो गया। मैं कोने में यहीं रहूँगी — मदद चाहिए तो मुझे दबाएँ।',
      close: 'बंद करें', back: '← पीछे', mute: '🔇 आवाज़ बंद करें', unmute: '🔊 आवाज़ बंद है — चालू करें',
      voiceNA: 'इस डिवाइस पर इस भाषा में आवाज़-मार्गदर्शन उपलब्ध नहीं है। टेक्स्ट मार्गदर्शन जारी रहेगा।',
      pause: '⏸ रोकें', resume: '▶ जारी रखें', repeat: '🔁 दोहराएँ', disableV: 'आवाज़ बंद करें', enableV: 'आवाज़ चालू करें',
      changeL: 'भाषा बदलें', replay: 'मार्गदर्शन दोहराएँ', curL: 'वर्तमान भाषा:',
      menuTitle: 'मैं कैसे मदद करूँ?',
      tGuide: 'मुझे इस पेज की सैर कराओ', tExplain: 'इस विकल्प को समझाओ', tRepeat: 'आखिरी निर्देश दोहराओ',
      actWhatIsThis: 'यह क्या है?', actWhatNext: 'अब मुझे क्या करना चाहिए?',
      repeatNone: 'अभी दोहराने के लिए कोई पिछला निर्देश नहीं है।',
      tVoiceOn: 'आवाज़ मार्गदर्शन चालू', tVoiceOff: 'आवाज़ मार्गदर्शन बंद', tMin: 'छोटा करो', tFull: 'पूरा सहायक खोलो',
      tNext: 'आगे', tPrev: 'पीछे', tEnd: 'समाप्त', tYes: 'हाँ, सैर कराओ', tNotNow: 'अभी नहीं',
      guideOffer: 'क्या आप इन विकल्पों की छोटी सैर चाहेंगे?',
      g_check: 'संदिग्ध संदेश यहाँ चिपकाएँ, या स्क्रीनशॉट या दस्तावेज़ मिला हो तो अपलोड विकल्प इस्तेमाल करें। पासवर्ड, OTP या बैंक विवरण न लिखें। सामग्री तैयार हो जाए तो नीचे वाला जाँच बटन दबाएँ।',
      g_walk: 'अगर किसी ने संदिग्ध निवेश लिंक भेजा है, तो उसे बिना खोले कॉपी करके इस डिब्बे में चिपकाएँ। तैयार हों तो “जाँच शुरू करें” चुनें। GHOSTWALK मंज़िल को अलग से जाँचने की कोशिश करेगा और जो दिखा वह बताएगा।',
      g_qr: 'पूरा QR कोड दिखने वाली फोटो या स्क्रीनशॉट चुनें। भुगतान ऐप से स्कैन करने की ज़रूरत नहीं। छवि चुनने के बाद झलक देखें और “इसी छवि का इस्तेमाल करें” चुनें।',
      g_trusted: 'पहले सारांश देख लें। अगर वह स्थिति सही बताता है, तो जिसे शामिल करना है उसे चुनें। GHOSTWALK उनके लिए चेतावनी तैयार करेगा। भेजने से पहले उसे जाँच लें।',
      g_paid: 'और पैसे न भेजें। पहले क्या भुगतान हुआ और कब, यह दर्ज करें। फिर स्क्रीनशॉट, भुगतान संदर्भ और संदेश सहेजें। GHOSTWALK जानकारी सजाएगा और आगे के मदद-कदम दिखाएगा।',
      g_check_go: 'संदेश ऊपर लिखें या चिपकाएँ, फिर जाँच शुरू करने के लिए यह बटन दबाएँ। भूत सब कुछ इसी डिवाइस पर पढ़ता है — कुछ खोला या चुकाया नहीं जाता।',
      g_walk_go: 'भूत को लिंक पर भेजने के लिए यह बटन दबाएँ। वह नकली विवरण के साथ सर्वर पर रास्ता चलता है और सुरक्षित रुकता है — आपको खुद कभी खोलना नहीं।',
      g_qr_go: 'UPI विवरण चिपकाने के बाद यह बटन दबाएँ। भूत पढ़ता है कि पैसा कहाँ जाएगा और प्राप्तकर्ता, रकम व चेतावनियाँ दिखाता है।',
      g_trusted_go: 'चेतावनी तैयार करने के लिए यह बटन दबाएँ। अपने भरोसेमंद व्यक्ति से साझा करने से पहले झलक ध्यान से पढ़ें।',
      g_paid_go: 'अपना घटना-पैक बनाने के लिए यह बटन दबाएँ। यह 1930 हेल्पलाइन के लिए आपकी समय-रेखा और सबूत सजाता है — वसूली की गारंटी कभी नहीं।',
      m_start: 'मंज़िल की जाँच अभी अलग-थलग माहौल में हो रही है।',
      m_done: 'जाँच पूरी हो गई। मैं नतीजे एक-एक करके समझा सकता हूँ।',
      langChanged: 'भाषा बदल गई। अब मैं इसी भाषा में मार्गदर्शन करूँगा।',
voiceWelcome: 'Ghostwalk में आपका स्वागत है। मैं मार्गदर्शन के लिए यहाँ हूँ। मैं हर विकल्प समझा सकता हूँ और आगे क्या करना है वह दिखा सकता हूँ।',
      textWelcome: 'GHOSTWALK में स्वागत है। मदद चाहिए तो मैं यहीं हूँ। छोटे भूत या किसी ? निशान पर टैप करें।',
      hintHome: 'मदद चाहिए? किसी विकल्प के बगल वाला ? दबाएँ, या सैर के लिए भूत खोलें।',
      tExplainChoice: 'मैं आपको क्या समझाऊँ?',
      explainName_checkMessage: 'संदेश जाँचें', explainName_walkLink: 'लिंक पर भूत भेजें', explainName_qr: 'QR / UPI पढ़ें',
      explainName_trustedContact: 'किसी अपने को सतर्क करें', explainName_alreadyPaid: 'मैं भुगतान कर चुका हूँ',
      vLead: 'सरल शब्दों में वजह यह है।', vReason: 'वजह {n}:', vExample: 'जैसे:',
      vRephrase: 'दूसरे शब्दों में, ', vDoubt: 'संदेह हो तो अभी भुगतान न करें। किसी भरोसेमंद व्यक्ति से पहले बात करें।',
      emptyRead: 'अभी पढ़ने को कुछ नहीं है।', translating: 'पेज का अनुवाद हो रहा है — एक पल…',
      netStruggle: 'इस नेटवर्क पर अनुवाद अटक रहा है — अभी अंग्रेज़ी दिख रही है।',
      qrUpload: 'QR छवि अपलोड करें', qrUploadSub: 'QR कोड वाली फोटो या स्क्रीनशॉट अपलोड करें। GHOSTWALK बिना भुगतान शुरू किए इसे पढ़ेगा।',
      qrDrop: '…या छवि यहाँ खींचकर छोड़ें', qrTakePhoto: 'फोटो लें', qrUse: 'इसी छवि का इस्तेमाल करें',
      qrChange: 'दूसरी चुनें', qrRemove: 'हटाएँ',
      qrNoCode: 'इस छवि से QR कोड पढ़ा नहीं जा सका। ऐसी साफ़ छवि आज़माएँ जिसमें पूरा QR कोड दिख रहा हो।',
      qrTooBig: 'यह छवि बहुत बड़ी है। कृपया 8 MB से छोटी छवि चुनें।',
      qrBadFile: 'यह फ़ाइल छवि के रूप में पढ़ी नहीं जा सकी। कृपया PNG, JPG या WebP स्क्रीनशॉट चुनें।',
      qrType: 'प्रकार', qrUpi: 'UPI भुगतान अनुरोध', qrUrl: 'वेब लिंक', qrText: 'टेक्स्ट',
      qrPayee: 'प्राप्तकर्ता / UPI ID', qrName: 'नाम', qrAmount: 'रकम', qrNote: 'टिप्पणी / संदर्भ',
      qrDecodeUpi: 'भुगतान की मंशा पढ़ें', qrInvestigate: 'इस लिंक की सुरक्षित जाँच करें', qrFoundTitle: 'QR मिला',
      qrFoundSay: 'QR मिल गया। {detail}',
qrGuideSteps: 'नमूना QR छवि लोड हो गई है। झलक देख लें। “इसी छवि का इस्तेमाल करें” चुनें। GHOSTWALK अब इसकी सामग्री पढ़ेगा।',
      g_qr_img: 'अगर किसी ने निवेश या भुगतान के लिए QR कोड भेजा है, तो तस्वीर यहाँ अपलोड करें। उसमें क्या है यह देखने के लिए भुगतान ऐप से स्कैन ज़रूरी नहीं। पढ़ने के बाद आगे कुछ करने से पहले मंज़िल देख लें।',
      g_qr_found: 'QR में यही है। न कुछ भुगतान हुआ, न कुछ खोला गया।',
      sampleNote: 'नमूना — सिर्फ़ प्रदर्शन के लिए।',
      sampleJourneyNote: 'नियंत्रित प्रदर्शन यात्रा — सुरक्षित परीक्षण मंज़िल, कोई असली खतरा नहीं।',
      sampleQrNote: 'नमूना QR — सिर्फ़ प्रदर्शन। कोई भुगतान शुरू नहीं हुआ।',
      sampleCaseNote: 'नमूना वसूली मामला — काल्पनिक प्रदर्शन डेटा। वसूली की गारंटी कभी नहीं।',
      sampleAlertText: 'मुझे निवेश का एक अनुरोध मिला है जिसे GHOSTWALK ने आगे जाँच ज़रूरी बताया है। आगे बढ़ने से पहले, क्या आप इसे मेरे साथ देख लेंगे?',
      sampleContact: 'नमूना संपर्क',
      packNeed: 'पहले जो हुआ उसका कम से कम एक चरण जोड़ें।',
      carriedOver: '👻 आपकी जाँच से लाया गया — समीक्षा करें और ड्राफ्ट दबाएँ।',
      explain: 'समझाएँ', readAloud: 'पढ़कर सुनाएँ', notNow: 'अभी नहीं',
      resultsReady: 'आपका नतीजा नीचे तैयार है। मुझे दबाएँ, मैं आसान शब्दों में समझाती हूँ।',
      uncertain: 'हम इसे भरोसे से जाँच नहीं सके। इसका मतलब सुरक्षित बिल्कुल नहीं। स्वतंत्र जाँच तक आगे न बढ़ें।',
      checking: 'नीचे जाँच चल रही है। वह मंज़िल को अलग-थलग पढ़ती है — आपको खुद कुछ छूना नहीं।',
      understood: 'समझ गई। ज़रूरत हो तो मैं यहीं हूँ।',
      noResult: 'पहले जाँच चलाएँ — फिर मैं बताऊँगी कि उसमें क्या मिला।',
      m_index_t: 'GHOSTWALK क्या करता है',
      m_index: ['चुनें कि आपको क्या मिला: संदेश, लिंक, QR, भरोसेमंद व्यक्ति, या भुगतान-मदद।', 'संदिग्ध लिंक खुद कभी न खोलें — भूत उन्हें सर्वर पर चलता है।', 'आपको सिर्फ़ रुकें या सत्यापित नहीं मिलता। झूठा “सुरक्षित” कभी नहीं।'],
      m_message_t: 'संदेश जाँचना',
      m_message: ['टेक्स्ट टैब में चैट चिपकाकर जाँचें दबाएँ।', 'फ़ोटो टैब स्क्रीनशॉट पढ़ता है और छिपा QR पकड़ता है।', 'PDF टैब ब्रोशर पढ़ता है। आवाज़ टैब में बोलकर लिखवाएँ।'],
      m_ghost_t: 'लिंक चलवाना',
      m_ghost: ['संदिग्ध लिंक डिब्बे में चिपकाएँ। खुद कभी न खोलें।', '“भूत भेजें” दबाकर नीचे ब्योरा देखें।', 'भूत सिर्फ़ नकली विवरण इस्तेमाल करता है — आपके कभी नहीं।'],
      m_qr_t: 'QR / UPI पढ़ना',
      m_qr: ['QR के पीछे की UPI स्ट्रिंग चिपकाएँ — खुद स्कैन कभी न करें।', 'भूत पढ़ता है कि पैसा असल में कहाँ जाएगा।', 'दिखे नाम की असली कंपनी से अलग से तुलना करें।'],
      m_trusted_t: 'किसी अपने को जोड़ना',
      m_trusted: ['नाम और रकम भरकर ड्राफ़्ट दबाएँ।', 'छोटा संदेश WhatsApp पर परिवार को भेजें।', 'वे कुछ मंज़ूर नहीं करते — बस साथ खड़े होते हैं।'],
      m_recovery_t: 'यदि भुगतान हो चुका है',
      m_recovery: ['क्या हुआ, एक-एक कदम जोड़ें।', '“घटना-पैक बनाएँ” दबाकर डाउनलोड करें।', 'इसे बैंक और 1930 हेल्पलाइन ले जाएँ। आगे भुगतान रोकें।'],
      understand: 'मेरा नतीजा समझाएँ',
      saidRed: 'यह रुकें कहता है। भुगतान न करें, OTP या बैंक विवरण न बाँटें।',
      saidYellow: 'यह सत्यापित नहीं कहता है। अभी भुगतान न करें।',
    },
    bn: {
      welcomeT: 'GHOSTWALK-এ স্বাগতম',
      welcomeV: 'এই পরিষেবায় কি কণ্ঠ-নির্দেশনা চান?',
      hear: 'এই বার্তা শুনুন',
      whichLang: 'আপনার পছন্দের ভাষা বেছে নিন।',
      moreLangs: 'আরও ভাষা…',
      voiceQ: 'কণ্ঠেও কি বুঝিয়ে দেব?',
      voiceOn: 'কণ্ঠ চালু করুন', voiceOff: 'শুধু লেখায় চলুন',
      allSet: 'হয়ে গেছে। আমি কোণে এখানেই থাকছি — দরকারে আমাকে চাপুন।',
      close: 'বন্ধ করুন', back: '← পেছনে', mute: '🔇 কণ্ঠ বন্ধ করুন', unmute: '🔊 কণ্ঠ বন্ধ — চালু করুন',
      voiceNA: 'এই ডিভাইসে এই ভাষায় কণ্ঠ-নির্দেশনা নেই। লেখা নির্দেশনা চলবে।',
      pause: '⏸ থামান', resume: '▶ চালিয়ে যান', repeat: '🔁 আবার বলুন', disableV: 'কণ্ঠ বন্ধ করুন', enableV: 'কণ্ঠ চালু করুন',
      changeL: 'ভাষা বদলান', replay: 'নির্দেশনা আবার', curL: 'বর্তমান ভাষা:',
      menuTitle: 'কীভাবে সাহায্য করব?',
      tGuide: 'আমাকে এই পেজ ঘুরিয়ে দেখাও', tExplain: 'এই অপশনটা বুঝিয়ে দাও', tRepeat: 'শেষ নির্দেশ আবার বলো',
      actWhatIsThis: 'এটা কী?', actWhatNext: 'এখন আমার কী করা উচিত?',
      repeatNone: 'এখনও পুনরাবৃত্তি করার মতো আগের কোনো নির্দেশ নেই।',
      tVoiceOn: 'ভয়েস নির্দেশনা চালু', tVoiceOff: 'ভয়েস নির্দেশনা বন্ধ', tMin: 'ছোট করো', tFull: 'পুরো সহকারী খোলো',
      tNext: 'পরেরটা', tPrev: 'আগেরটা', tEnd: 'শেষ করো', tYes: 'হ্যাঁ, দেখাও', tNotNow: 'এখন না',
      guideOffer: 'এই অপশনগুলোর ছোট্ট গাইড চান?',
      g_check: 'সন্দেহজনক বার্তা এখানে পেস্ট করুন, বা স্ক্রিনশট বা নথি পেলে আপলোড অপশন ব্যবহার করুন। পাসওয়ার্ড, OTP বা ব্যাংক তথ্য লিখবেন না।内容 তৈরি হলে নিচের যাচাই বোতাম চাপুন।',
      g_walk: 'কেউ সন্দেহজনক বিনিয়োগ লিংক পাঠালে না খুলে কপি করে এই বাক্সে পেস্ট করুন। তৈরি হলে “তদন্ত শুরু” বেছে নিন। GHOSTWALK গন্তব্য আলাদাভাবে দেখার চেষ্টা করবে এবং যা দেখেছে জানাবে।',
      g_qr: 'পুরো QR কোড দেখা যায় এমন ছবি বা স্ক্রিনশট বেছে নিন। পেমেন্ট অ্যাপ দিয়ে স্ক্যান দরকার নেই। ছবি বেছে নিয়ে ঝলক দেখুন, তারপর “এই ছবিটাই ব্যবহার করুন” বেছে নিন।',
      g_trusted: 'আগে সারাংশ দেখুন। পরিস্থিতি ঠিক বললে যাকে যুক্ত করবেন তাকে বেছে নিন। GHOSTWALK তাদের জন্য সতর্কবার্তা তৈরি করবে। পাঠানোর আগে দেখে নিন।',
      g_paid: 'আর টাকা পাঠাবেন না। কী দিয়েছেন আর কখন, আগে লিখে রাখুন। তারপর স্ক্রিনশট, টাকার রেফারেন্স আর বার্তা সংরক্ষণ করুন। GHOSTWALK তথ্য সাজাবে এবং পরের সাহায্য-ধাপ দেখাবে।',
      g_check_go: 'বার্তা উপরে লিখুন বা পেস্ট করে বিশ্লেষণ শুরু করতে এই বোতাম চাপুন। ভূত সব এই ডিভাইসেই পড়ে — কিছু খোলা বা দেওয়া হয় না।',
      g_walk_go: 'লিংকে ভূত পাঠাতে এই বোতাম চাপুন। নকল বিবরণ নিয়ে সার্ভারে পথ হাঁটে, নিরাপদে থামে — আপনাকে কখনো খুলতে হয় না।',
      g_qr_go: 'UPI বিবরণ পেস্ট করে এই বোতাম চাপুন। টাকা কোথায় যাবে ভূত পড়ে প্রাপক, অঙ্ক আর সতর্কতা দেখায়।',
      g_trusted_go: 'সতর্কবার্তা তৈরি করতে এই বোতাম চাপুন। বিশ্বস্তজনের সঙ্গে শেয়ার করার আগে ঝলক মন দিয়ে পড়ুন।',
      g_paid_go: 'ঘটনার প্যাক বানাতে এই বোতাম চাপুন। 1930 হেল্পলাইনের জন্য সময়রেখা আর প্রমাণ সাজায় — উদ্ধারের নিশ্চয়তা নেই।',
      m_start: 'গন্তব্য এখন আলাদা নিরাপদ পরিবেশে পরীক্ষা করা হচ্ছে।',
      m_done: 'তদন্ত শেষ। ফলাফল একটা একটা করে বুঝিয়ে দিতে পারি।',
      langChanged: 'ভাষা বদলে গেছে। এই ভাষাতেই গাইড করে যাব।',
voiceWelcome: 'Ghostwalk-এ স্বাগতম। গাইড করতে আমি আছি। প্রতিটা অপশন বুঝিয়ে দিতে পারি, পরে কী করবেন দেখিয়ে দেব।',
      textWelcome: 'GHOSTWALK-এ স্বাগতম। দরকারে আমি আছি। ছোট ভূত বা যেকোনো ? চিহ্নে ট্যাপ করুন।',
      hintHome: 'সাহায্য চান? যেকোনো অপশনের পাশের ? চাপুন, বা গাইডের জন্য ভূত খুলুন।',
      tExplainChoice: 'কোনটা বুঝিয়ে দেব?',
      explainName_checkMessage: 'বার্তা যাচাই', explainName_walkLink: 'লিংকে ভূত পাঠান', explainName_qr: 'QR / UPI পড়ুন',
      explainName_trustedContact: 'বিশ্বস্তজনকে জানান', explainName_alreadyPaid: 'টাকা দিয়ে ফেলেছি',
      vLead: 'সহজ কথায় কারণটা হলো।', vReason: 'কারণ {n}:', vExample: 'যেমন:',
      vRephrase: 'অন্য কথায়, ', vDoubt: 'সন্দেহ হলে এখন টাকা দেবেন না। আগে বিশ্বস্ত কারো সঙ্গে কথা বলুন।',
      emptyRead: 'এখন পড়ার মতো কিছু নেই।', translating: 'পেজ অনুবাদ হচ্ছে — এক মুহূর্ত…',
      netStruggle: 'এই নেটওয়ার্কে অনুবাদ আটকাচ্ছে — আপাতত ইংরেজি দেখাচ্ছে।',
      qrUpload: 'QR ছবি আপলোড করুন', qrUploadSub: 'QR কোড আছে এমন ছবি বা স্ক্রিনশট আপলোড করুন। টাকা না পাঠিয়েই GHOSTWALK পড়ে দেবে।',
      qrDrop: '…অথবা ছবি এখানে টেনে আনুন', qrTakePhoto: 'ছবি তুলুন', qrUse: 'এই ছবিটাই ব্যবহার করুন',
      qrChange: 'অন্য ছবি নিন', qrRemove: 'সরান',
      qrNoCode: 'এই ছবি থেকে QR কোড পড়া যায়নি। পুরো QR কোড দেখা যায় এমন পরিষ্কার ছবি দিন।',
      qrTooBig: 'ছবিটা অনেক বড়। 8 MB-এর ছোট ছবি নিন।',
      qrBadFile: 'ফাইলটা ছবি হিসেবে পড়া যায়নি। PNG, JPG বা WebP স্ক্রিনশট নিন।',
      qrType: 'ধরন', qrUpi: 'UPI টাকার অনুরোধ', qrUrl: 'ওয়েব লিংক', qrText: 'লেখা',
      qrPayee: 'প্রাপক / UPI ID', qrName: 'নাম', qrAmount: 'টাকার অঙ্ক', qrNote: 'মন্তব্য / সূত্র',
      qrDecodeUpi: 'টাকার উদ্দেশ্য পড়ুন', qrInvestigate: 'লিংকটা নিরাপদে যাচাই করুন', qrFoundTitle: 'QR পাওয়া গেছে',
      qrFoundSay: 'QR পাওয়া গেছে। {detail}',
qrGuideSteps: 'নমুনা QR ছবি লোড হয়েছে। ঝলক দেখুন। “এই ছবিটাই ব্যবহার করুন” বেছে নিন। GHOSTWALK এখন ভেতরেরটা পড়বে।',
      g_qr_img: 'বিনিয়োগ বা টাকার জন্য কেউ QR কোড পাঠালে ছবিটা এখানে আপলোড করুন। ভেতরে কী আছে দেখতে পেমেন্ট অ্যাপে স্ক্যান দরকার নেই। পড়ার পর কিছু করার আগে গন্তব্য দেখুন।',
      g_qr_found: 'QR-এ এটাই আছে। টাকাও যায়নি, কিছু খোলাও হয়নি।',
      sampleNote: 'নমুনা — শুধু প্রদর্শনের জন্য।',
      sampleJourneyNote: 'নিয়ন্ত্রিত প্রদর্শন যাত্রা — নিরাপদ পরীক্ষা গন্তব্য, আসল হুমকি নয়।',
      sampleQrNote: 'নমুনা QR — শুধু প্রদর্শন। কোনো টাকা পাঠানো হয়নি।',
      sampleCaseNote: 'নমুনা উদ্ধার ঘটনা — কাল্পনিক প্রদর্শন তথ্য। উদ্ধারের নিশ্চয়তা নেই।',
      sampleAlertText: 'আমি এমন বিনিয়োগ অনুরোধ পেয়েছি যা GHOSTWALK আরও যাচাই দরকার বলেছে। এগোনোর আগে, আমার সঙ্গে এটা দেখবেন?',
      sampleContact: 'নমুনা যোগাযোগ',
      packNeed: 'আগে কী ঘটেছে তার অন্তত একটা ধাপ যোগ করুন।',
      carriedOver: '👻 আপনার বিশ্লেষণ থেকে আনা — দেখে নিয়ে ড্রাফট চাপুন।',
      explain: 'বুঝিয়ে দিন', readAloud: 'পড়ে শোনান', notNow: 'এখন নয়',
      resultsReady: 'আপনার ফল নিচে তৈরি। আমাকে চাপুন, সহজ কথায় বুঝিয়ে দিচ্ছি।',
      uncertain: 'এটি নির্ভরযোগ্যভাবে যাচাই করতে পারিনি। এর মানে নিরাপদ মোটেই নয়। স্বাধীন যাচাই না করে এগোবেন না।',
      checking: 'নিচে পরীক্ষা চলছে। এটি গন্তব্য আলাদাভাবে পড়ে — আপনাকে কিছু ছুঁতে হবে না।',
      understood: 'বুঝেছি। দরকারে আমি এখানেই।',
      noResult: 'আগে পরীক্ষা চালান — তারপর কী পাওয়া গেছে বলছি।',
      m_index_t: 'GHOSTWALK কী করে',
      m_index: ['বেছে নিন কী পেয়েছেন: বার্তা, লিংক, QR, বিশ্বস্ত ব্যক্তি, বা টাকা-সাহায্য।', 'সন্দেহজনক লিংক নিজে কখনো খুলবেন না — ভূত সার্ভারে চালে।', 'আপনি শুধু থামুন বা যাচাই হয়নি পাবেন। মিথ্যা “নিরাপদ” কখনো নয়।'],
      m_message_t: 'বার্তা যাচাই',
      m_message: ['Text ট্যাবে চ্যাট বসিয়ে যাচাই চাপুন।', 'Photo ট্যাব স্ক্রিনশট পড়ে, লুকানো QR ধরে।', 'PDF ট্যাব ব্রোশার পড়ে। Voice ট্যাবে বলে লেখান।'],
      m_ghost_t: 'লিংক চালানো',
      m_ghost: ['সন্দেহজনক লিংক বাক্সে বসান। নিজে কখনো খুলবেন না।', '“ভূত পাঠান” চেপে নিচে বিবরণ দেখুন।', 'ভূত শুধু নকল তথ্য ব্যবহার করে — আপনার কখনো নয়।'],
      m_qr_t: 'QR / UPI পড়া',
      m_qr: ['QR-এর পেছনের UPI স্ট্রিং বসান — নিজে স্ক্যান কখনো নয়।', 'ভূত পড়ে টাকা আসলে কোথায় যাবে।', 'দেখানো নাম আসল কোম্পানির সঙ্গে আলাদা মিলান।'],
      m_trusted_t: 'বিশ্বস্ত কাউকে যুক্ত করা',
      m_trusted: ['নাম ও টাকা লিখে খসড়া চাপুন।', 'ছোট বার্তা WhatsApp-এ পরিবারকে পাঠান।', 'ওরা কিছু অনুমোদন করে না — শুধু পাশে থাকে।'],
      m_recovery_t: 'টাকা দিয়ে থাকলে',
      m_recovery: ['কী হয়েছে, ধাপে ধাপে যোগ করুন।', '“ঘটনা-প্যাক বানান” চেপে ডাউনলোড করুন।', 'ব্যাংক ও 1930 হেল্পলাইনে নিন। আর টাকা বন্ধ।'],
      understand: 'আমার ফল বুঝিয়ে দিন',
      saidRed: 'এটি থামুন বলছে। টাকা দেবেন না, OTP বা ব্যাংক তথ্য দেবেন না।',
      saidYellow: 'এটি যাচাই হয়নি বলছে। এখন টাকা দেবেন না।',
    },
    mr: {
      welcomeT: 'GHOSTWALK मध्ये स्वागत आहे',
      welcomeV: 'या सेवेत आवाज-मार्गदर्शन हवे आहे का?',
      hear: 'हा संदेश ऐका',
      whichLang: 'तुमची पसंतीची भाषा निवडा.',
      moreLangs: 'आणखी भाषा…',
      voiceQ: 'आवाजातही समजावून सांगू का?',
      voiceOn: 'आवाज चालू करा', voiceOff: 'फक्त मजकुरात पुढे जा',
      allSet: 'झाले. मी कोपऱ्यात इथेच आहे — गरज पडली की मला दाबा.',
      close: 'बंद करा', back: '← मागे', mute: '🔇 आवाज बंद करा', unmute: '🔊 आवाज बंद — चालू करा',
      voiceNA: 'या डिव्हाइसवर या भाषेत आवाज-मार्गदर्शन उपलब्ध नाही. मजकूर मार्गदर्शन सुरू राहील.',
      pause: '⏸ थांबवा', resume: '▶ सुरू ठेवा', repeat: '🔁 पुन्हा सांगा', disableV: 'आवाज बंद करा', enableV: 'आवाज चालू करा',
      changeL: 'भाषा बदला', replay: 'मार्गदर्शन पुन्हा', curL: 'सध्याची भाषा:',
      menuTitle: 'मी कशी मदत करू?',
      tGuide: 'मला हे पेज समजावून दाखव', tExplain: 'हा पर्याय समजावून सांग', tRepeat: 'शेवटची सूचना पुन्हा सांग',
      actWhatIsThis: 'हे काय आहे?', actWhatNext: 'आता मी काय करावे?',
      repeatNone: 'पुन्हा सांगण्यासारखी आधीची सूचना अजून नाही.',
      tVoiceOn: 'आवाज मार्गदर्शन चालू', tVoiceOff: 'आवाज मार्गदर्शन बंद', tMin: 'लहान कर', tFull: 'पूर्ण सहाय्यक उघड',
      tNext: 'पुढे', tPrev: 'मागे', tEnd: 'समाप्त', tYes: 'होय, दाखव', tNotNow: 'आत्ता नको',
      guideOffer: 'या पर्यायांची छोटी ओळख हवी का?',
      g_check: 'संशयास्पद संदेश इथे चिकटवा, किंवा स्क्रीनशॉट वा कागदपत्र मिळाले असेल तर अपलोड पर्याय वापरा. पासवर्ड, OTP किंवा बँक तपशील लिहू नका. मजकूर तयार झाला की खालचे तपासा बटण दाबा.',
      g_walk: 'कोणी संशयास्पद गुंतवणूक लिंक पाठवली असेल तर ती न उघडता कॉपी करून या चौकटीत चिकटवा. तयार असाल तर “तपासणी सुरू करा” निवडा. GHOSTWALK ठिकाण वेगळेपणे तपासण्याचा प्रयत्न करेल आणि जे दिसले ते सांगेल.',
      g_qr: 'संपूर्ण QR कोड दिसणारा फोटो किंवा स्क्रीनशॉट निवडा. पेमेंट अ‍ॅपने स्कॅन करायची गरज नाही. प्रतिमा निवडून झलक पहा आणि “हीच प्रतिमा वापरा” निवडा.',
      g_trusted: 'आधी सारांश पहा. परिस्थिती बरोबर मांडली असेल तर ज्यांना सामील करायचे त्यांना निवडा. GHOSTWALK त्यांच्यासाठी इशारा तयार करेल. पाठवण्यापूर्वी तपासा.',
      g_paid: 'आणखी पैसे पाठवू नका. आधी काय भरले आणि केव्हा ते नोंदवा. मग स्क्रीनशॉट, पैसे संदर्भ आणि संदेश जतन करा. GHOSTWALK माहिती लावेल आणि पुढची मदत-पावले दाखवेल.',
      g_check_go: 'संदेश वर लिहा किंवा चिकटवून विश्लेषण सुरू करण्यासाठी हे बटण दाबा. भूत सगळे याच डिव्हाइसवर वाचतो — काही उघडले किंवा दिले जात नाही.',
      g_walk_go: 'लिंकवर भूत पाठवण्यासाठी हे बटण दाबा. तो बनावट तपशीलांसह सर्व्हरवर वाट चालतो आणि सुरक्षित थांबतो — तुम्हाला स्वतः कधी उघडायचे नाही.',
      g_qr_go: 'UPI तपशील चिकटवल्यावर हे बटण दाबा. पैसे कुठे जातील हे भूत वाचतो आणि प्राप्तकर्ता, रक्कम व इशारे दाखवतो.',
      g_trusted_go: 'इशारा तयार करण्यासाठी हे बटण दाबा. विश्वासू व्यक्तीसोबत शेअर करण्यापूर्वी झलक काळजीपूर्वक वाचा.',
      g_paid_go: 'घटना-संच तयार करण्यासाठी हे बटण दाबा. 1930 हेल्पलाइनसाठी तुमची कालरेषा आणि पुरावे लावतो — वसुलीची हमी नाही.',
      m_start: 'ठिकाण आता वेगळ्या सुरक्षित वातावरणात तपासले जात आहे.',
      m_done: 'तपासणी पूर्ण झाली. निष्कर्ष एकेक करून समजावून सांगतो.',
      langChanged: 'भाषा बदलली. याच भाषेत मार्गदर्शन करत राहीन.',
voiceWelcome: 'Ghostwalk मध्ये स्वागत आहे. मार्गदर्शनासाठी मी इथे आहे. प्रत्येक पर्याय समजावून सांगेन आणि पुढे काय करायचे ते दाखवेन.',
      textWelcome: 'GHOSTWALK मध्ये स्वागत आहे. मदत हवी असेल तर मी इथेच आहे. छोट्या भुतावर किंवा कोणत्याही ? खुणेवर टॅप करा.',
      hintHome: 'मदत हवी? कोणत्याही पर्यायाशेजारचे ? दाबा, किंवा सैरिसाठी भूत उघडा.',
      tExplainChoice: 'तुम्हाला काय समजावून सांगू?',
      explainName_checkMessage: 'संदेश तपासा', explainName_walkLink: 'लिंकवर भूत पाठवा', explainName_qr: 'QR / UPI वाचा',
      explainName_trustedContact: 'विश्वासू व्यक्तीला कळवा', explainName_alreadyPaid: 'मी पैसे भरले आहेत',
      vLead: 'सोप्या शब्दांत कारण हे आहे.', vReason: 'कारण {n}:', vExample: 'उदाहरणार्थ:',
      vRephrase: 'दुसऱ्या शब्दांत, ', vDoubt: 'शंका असेल तर आत्ता पैसे देऊ नका. आधी विश्वासू व्यक्तीशी बोला.',
      emptyRead: 'आत्ता वाचायला काही नाही.', translating: 'पानाचे भाषांतर होत आहे — एक क्षण…',
      netStruggle: 'या नेटवर्कवर भाषांतर अडत आहे — सध्या इंग्रजी दिसत आहे.',
      qrUpload: 'QR प्रतिमा अपलोड करा', qrUploadSub: 'QR कोड असलेला फोटो किंवा स्क्रीनशॉट अपलोड करा. पैसे न पाठवता GHOSTWALK ते वाचेल.',
      qrDrop: '…किंवा प्रतिमा इथे ओढून आणा', qrTakePhoto: 'फोटो काढा', qrUse: 'हीच प्रतिमा वापरा',
      qrChange: 'दुसरी निवडा', qrRemove: 'काढून टाका',
      qrNoCode: 'या प्रतिमेतून QR कोड वाचता आला नाही. संपूर्ण QR कोड दिसेल अशी स्पष्ट प्रतिमा द्या.',
      qrTooBig: 'ही प्रतिमा खूप मोठी आहे. 8 MB पेक्षा लहान प्रतिमा निवडा.',
      qrBadFile: 'ही फाइल प्रतिमा म्हणून वाचता आली नाही. PNG, JPG किंवा WebP स्क्रीनशॉट निवडा.',
      qrType: 'प्रकार', qrUpi: 'UPI पैसे विनंती', qrUrl: 'वेब लिंक', qrText: 'मजकूर',
      qrPayee: 'प्राप्तकर्ता / UPI ID', qrName: 'नाव', qrAmount: 'रक्कम', qrNote: 'टीप / संदर्भ',
      qrDecodeUpi: 'पैशांचा हेतू वाचा', qrInvestigate: 'ही लिंक सुरक्षितपणे तपासा', qrFoundTitle: 'QR सापडला',
      qrFoundSay: 'QR सापडला. {detail}',
qrGuideSteps: 'नमुना QR प्रतिमा लोड झाली आहे. झलक पहा. “हीच प्रतिमा वापरा” निवडा. GHOSTWALK आता आतील मजकूर वाचेल.',
      g_qr_img: 'गुंतवणूक किंवा पैशांसाठी कोणी QR कोड पाठवला असेल तर चित्र इथे अपलोड करा. आत काय आहे हे बघण्यासाठी पेमेंट अ‍ॅपने स्कॅन गरजेचे नाही. वाचल्यानंतर काही करण्यापूर्वी ठिकाण पहा.',
      g_qr_found: 'QR मध्ये हेच आहे. पैसेही गेले नाहीत, काही उघडलेही नाही.',
      sampleNote: 'नमुना — फक्त प्रात्यक्षिकासाठी.',
      sampleJourneyNote: 'नियंत्रित प्रात्यक्षिक प्रवास — सुरक्षित चाचणी ठिकाण, खरा धोका नाही.',
      sampleQrNote: 'नमुना QR — फक्त प्रात्यक्षिक. पैसे पाठवले नाहीत.',
      sampleCaseNote: 'नमुना वसुली प्रकरण — काल्पनिक प्रात्यक्षिक माहिती. वसुलीची हमी नाही.',
      sampleAlertText: 'मला गुंतवणुकीची एक विनंती आली आहे, GHOSTWALK ने अधिक तपासणी आवश्यक असल्याचे सांगितले आहे. पुढे जाण्यापूर्वी तुम्ही हे माझ्यासोबत पाहाल का?',
      sampleContact: 'नमुना संपर्क',
      packNeed: 'आधी काय घडले याची किमान एक पायरी जोडा.',
      carriedOver: '👻 तुमच्या विश्लेषणातून आणले — तपासून ड्राफ्ट दाबा.',
      explain: 'समजावून सांगा', readAloud: 'वाचून दाखवा', notNow: 'आत्ता नको',
      resultsReady: 'तुमचा निकाल खाली तयार आहे. मला दाबा, सोप्या शब्दांत सांगते.',
      uncertain: 'हे आम्ही खात्रीने तपासू शकलो नाही. याचा अर्थ सुरक्षित बिलकूल नाही. स्वतंत्र खात्री होईपर्यंत पुढे जाऊ नका.',
      checking: 'खाली तपासणी सुरू आहे. ती ठिकाण वेगळे वाचते — तुम्हाला काहीही स्पर्शायची गरज नाही.',
      understood: 'समजले. गरज पडली तर मी इथेच आहे.',
      noResult: 'आधी तपासणी चालवा — मग त्यात काय सापडले ते सांगते.',
      m_index_t: 'GHOSTWALK काय करते',
      m_index: ['निवडा काय मिळाले: संदेश, लिंक, QR, विश्वासू व्यक्ती, किंवा पैसे-मदत.', 'संशयास्पद लिंक स्वतः कधीही उघडू नका — भूत सर्व्हरवर चालवतो.', 'तुम्हाला फक्त थांबा किंवा पडताळणी नाही मिळते. खोटे “सुरक्षित” कधीही नाही.'],
      m_message_t: 'संदेश तपासणे',
      m_message: ['Text टॅबमध्ये चॅट चिकटवून तपासा दाबा.', 'Photo टॅब स्क्रीनशॉट वाचतो, लपलेला QR पकडतो.', 'PDF टॅब माहितीपत्र वाचतो. Voice टॅबमध्ये बोलून लिहून घ्या.'],
      m_ghost_t: 'लिंक चालवणे',
      m_ghost: ['संशयास्पद लिंक चौकटीत चिकटवा. स्वतः कधीही उघडू नका.', '“भूत पाठवा” दाबून खाली तपशील पहा.', 'भूत फक्त बनावट तपशील वापरतो — तुमचे कधीही नाही.'],
      m_qr_t: 'QR / UPI वाचणे',
      m_qr: ['QR मागची UPI स्ट्रिंग चिकटवा — स्वतः स्कॅन कधीही नका.', 'भूत वाचतो पैसे खरोखर कुठे जातील.', 'दिसलेले नाव खऱ्या कंपनीशी वेगळे ताडून पहा.'],
      m_trusted_t: 'विश्वासू व्यक्तीला जोडणे',
      m_trusted: ['नाव आणि रक्कम भरून मसुदा दाबा.', 'छोटा संदेश WhatsApp वर कुटुंबाला पाठवा.', 'ते काहीही मंजूर करत नाहीत — फक्त सोबत उभे राहतात.'],
      m_recovery_t: 'पैसे भरले असल्यास',
      m_recovery: ['काय झाले, एकेक पायरी जोडा.', '“घटना-पॅक बनवा” दाबून डाउनलोड करा.', 'बँक व 1930 हेल्पलाइनला न्या. पुढील पैसे थांबवा.'],
      understand: 'माझा निकाल समजावून सांगा',
      saidRed: 'हे थांबा म्हणते. पैसे पाठवू नका, OTP किंवा बँक तपशील देऊ नका.',
      saidYellow: 'हे पडताळणी नाही म्हणते. आत्ता पैसे पाठवू नका.',
    },
    ta: {
      welcomeT: 'GHOSTWALK-இல் வரவேற்கிறோம்',
      welcomeV: 'இந்தச் சேவையில் குரல் வழிகாட்ட வேண்டுமா?',
      hear: 'இந்தச் செய்தியைக் கேளுங்கள்',
      whichLang: 'விருப்ப மொழியைத் தேர்ந்தெடுங்கள்.',
      moreLangs: 'மேலும் மொழிகள்…',
      voiceQ: 'குரலிலும் விளக்கட்டுமா?',
      voiceOn: 'குரல் இயக்கு', voiceOff: 'உரையில் தொடர்க',
      allSet: 'முடிந்தது. மூலையில் இங்கேயே இருப்பேன் — தேவைப்பட்டால் என்னைத் தட்டுங்கள்.',
      close: 'மூடு', back: '← பின்', mute: '🔇 குரல் நிறுத்து', unmute: '🔊 குரல் நிற்கிறது — இயக்கு',
      voiceNA: 'இந்தச் சாதனத்தில் இந்த மொழியில் குரல் வழிகாட்டல் இல்லை. உரை வழிகாட்டல் தொடரும்.',
      pause: '⏸ நிறுத்து', resume: '▶ தொடர்', repeat: '🔁 மீண்டும்', disableV: 'குரல் நிறுத்து', enableV: 'குரல் இயக்கு',
      changeL: 'மொழி மாற்று', replay: 'வழிகாட்டல் மீண்டும்', curL: 'தற்போதைய மொழி:',
      menuTitle: 'எப்படி உதவட்டும்?',
      tGuide: 'இந்தப் பக்கத்தைச் சுற்றிக் காட்டு', tExplain: 'இந்த விருப்பத்தை விளக்கு', tRepeat: 'கடைசி அறிவுரையை மீண்டும் சொல்',
      actWhatIsThis: 'இது என்ன?', actWhatNext: 'இப்போது நான் என்ன செய்ய வேண்டும்?',
      repeatNone: 'மீண்டும் சொல்ல முந்தைய அறிவுரை எதுவும் இன்னும் இல்லை.',
      tVoiceOn: 'குரல் வழிகாட்டல் இயக்கு', tVoiceOff: 'குரல் வழிகாட்டல் நிறுத்து', tMin: 'சிறிதாக்கு', tFull: 'முழு உதவியாளரைத் திற',
      tNext: 'அடுத்து', tPrev: 'முந்தைய', tEnd: 'முடி', tYes: 'ஆம், காட்டு', tNotNow: 'இப்போது வேண்டாம்',
      guideOffer: 'இந்த விருப்பங்களின் சிறு அறிமுகம் வேண்டுமா?',
      g_check: 'சந்தேகமான செய்தியை இங்கே ஒட்டுங்கள், அல்லது திரைப்படம் அல்லது ஆவணமாக வந்திருந்தால் பதிவேற்ற விருப்பத்தைப் பயன்படுத்துங்கள். கடவுச்சொற்கள், OTP அல்லது வங்கி விவரங்களை எழுத வேண்டாம். உள்ளடக்கம் தயாரானதும் கீழே உள்ள பகுப்பாய்வு பொத்தானை அழுத்துங்கள்.',
      g_walk: 'யாராவது சந்தேகமான முதலீட்டு இணைப்பு அனுப்பினால் திறக்காமல் நகலெடுத்து இந்தப் பெட்டியில் ஒட்டுங்கள். தயாரானதும் “ஆய்வைத் தொடங்கு” என்பதைத் தேர்ந்தெடுங்கள். GHOSTWALK இலக்கைத் தனியே ஆராய முயன்று கண்டதைத் தெரிவிக்கும்.',
      g_qr: 'முழு QR குறியீடும் தெரியும் புகைப்படம் அல்லது திரைப்படத்தைத் தேர்ந்தெடுங்கள். கட்டணச் செயலியால் ஸ்கேன் செய்ய வேண்டாம். படத்தைத் தேர்ந்து முன்னோட்டம் பார்த்து “இந்தப் படத்தையே பயன்படுத்து” என்பதைத் தேர்ந்தெடுங்கள்.',
      g_trusted: 'முதலில் சுருக்கத்தைப் பாருங்கள். நிலைமை சரியாக இருந்தால் சேர்க்க விரும்பும் நபரைத் தேர்ந்தெடுங்கள். GHOSTWALK அவர்களுக்கான எச்சரிக்கையைத் தயாரிக்கும். அனுப்பும் முன் சரிபாருங்கள்.',
      g_paid: 'மேலும் பணம் அனுப்ப வேண்டாம். எவ்வளவு, எப்போது செலுத்தினீர்கள் என்று முதலில் பதிவு செய்யுங்கள். பிறகு திரைப்படங்கள், கட்டணக் குறிப்புகள், செய்திகளைப் பாதுகாக்கவும். GHOSTWALK தகவலை ஒழுங்குபடுத்தி அடுத்த உதவிப் படிகளைக் காட்டும்.',
      g_check_go: 'செய்தியை மேலே எழுதி அல்லது ஒட்டிப் பகுப்பாய்வைத் தொடங்க இந்தப் பொத்தானை அழுத்துங்கள். பேய் அனைத்தையும் இந்தச் சாதனத்திலேயே படிக்கிறது — எதுவும் திறக்கப்படுவதில்லை, செலுத்தப்படுவதில்லை.',
      g_walk_go: 'இணைப்பில் பேயை அனுப்ப இந்தப் பொத்தானை அழுத்துங்கள். போலி விவரங்களுடன் சேவையகத்தில் பாதையில் சென்று பாதுகாப்பாக நிற்கும் — நீங்களே திறக்க வேண்டாம்.',
      g_qr_go: 'UPI விவரங்களை ஒட்டிய பிறகு இந்தப் பொத்தானை அழுத்துங்கள். பணம் எங்கே செல்லும் என்று பேய் படித்துப் பெறுநர், தொகை, எச்சரிக்கைகளைக் காட்டும்.',
      g_trusted_go: 'எச்சரிக்கையைத் தயாரிக்க இந்தப் பொத்தானை அழுத்துங்கள். நம்பிக்கையானவருடன் பகிரும் முன் முன்னோட்டத்தைக் கவனமாகப் படியுங்கள்.',
      g_paid_go: 'நிகழ்வுத் தொகுப்பை உருவாக்க இந்தப் பொத்தானை அழுத்துங்கள். 1930 உதவி எண்ணுக்காக உங்கள் காலவரிசை, ஆதாரங்களை ஒழுங்குபடுத்தும் — மீட்புக்கு உத்தரவாதம் இல்லை.',
      m_start: 'இலக்கு இப்போது தனிமைப்படுத்தப்பட்ட சூழலில் ஆராயப்படுகிறது.',
      m_done: 'ஆய்வு முடிந்தது. முடிவுகளை ஒவ்வொன்றாக விளக்குகிறேன்.',
      langChanged: 'மொழி மாறிவிட்டது. இதே மொழியில் வழிகாட்டுவேன்.',
voiceWelcome: 'Ghostwalk-க்கு வருக. வழிகாட்ட நான் இருக்கிறேன். ஒவ்வொரு விருப்பத்தையும் விளக்கி அடுத்து என்ன செய்ய வேண்டும் என்று காட்டுவேன்.',
      textWelcome: 'GHOSTWALK-க்கு வருக. உதவி வேண்டுமானால் நான் இங்கேயே இருக்கிறேன். சிறிய பேயை அல்லது ? குறியைத் தட்டவும்.',
      hintHome: 'உதவி வேண்டுமா? விருப்பத்திற்கு அருகில் உள்ள ?-ஐ அழுத்துங்கள், அல்லது சுற்றுக்கு பேயைத் திறங்கள்.',
      tExplainChoice: 'எதை விளக்கட்டும்?',
      explainName_checkMessage: 'செய்தியைச் சரிபார்', explainName_walkLink: 'இணைப்பில் பேயை அனுப்பு', explainName_qr: 'QR / UPI படி',
      explainName_trustedContact: 'நம்பிக்கையானவருக்குத் தெரிவி', explainName_alreadyPaid: 'பணம் செலுத்திவிட்டேன்',
      vLead: 'எளிய வார்த்தைகளில் காரணம் இதுதான்.', vReason: 'காரணம் {n}:', vExample: 'உதாரணமாக:',
      vRephrase: 'வேறு வார்த்தைகளில், ', vDoubt: 'சந்தேகம் இருந்தால் இப்போது பணம் செலுத்தாதீர்கள். முதலில் நம்பிக்கையான ஒருவரிடம் பேசுங்கள்.',
      emptyRead: 'இப்போது படிக்க ஒன்றுமில்லை.', translating: 'பக்கம் மொழிபெயர்க்கப்படுகிறது — ஒரு கணம்…',
      netStruggle: 'இந்த வலையமைப்பில் மொழிபெயர்ப்பு தடுமாறுகிறது — இப்போது ஆங்கிலம் காட்டப்படுகிறது.',
      qrUpload: 'QR படத்தைப் பதிவேற்றுக', qrUploadSub: 'QR குறியீடு உள்ள புகைப்படம் அல்லது திரைப்படத்தைப் பதிவேற்றுக. பணம் செலுத்தாமலே GHOSTWALK படித்துவிடும்.',
      qrDrop: '…அல்லது படத்தை இங்கே இழுத்து விடுக', qrTakePhoto: 'புகைப்படம் எடு', qrUse: 'இந்தப் படத்தையே பயன்படுத்து',
      qrChange: 'வேறு படம் தேர்', qrRemove: 'நீக்கு',
      qrNoCode: 'இந்தப் படத்திலிருந்து QR குறியீட்டைப் படிக்க முடியவில்லை. முழு QR குறியீடும் தெரியும் தெளிவான படம் கொடுங்கள்.',
      qrTooBig: 'படம் மிகப் பெரியது. 8 MB-க்குச் சிறிய படம் தேர்ந்தெடுங்கள்.',
      qrBadFile: 'கோப்பைப் படமாகப் படிக்க முடியவில்லை. PNG, JPG அல்லது WebP திரைப்படம் தேர்ந்தெடுங்கள்.',
      qrType: 'வகை', qrUpi: 'UPI பணக் கோரிக்கை', qrUrl: 'வலை இணைப்பு', qrText: 'உரை',
      qrPayee: 'பெறுநர் / UPI ID', qrName: 'பெயர்', qrAmount: 'தொகை', qrNote: 'குறிப்பு',
      qrDecodeUpi: 'பண நோக்கத்தைப் படி', qrInvestigate: 'இணைப்பைப் பாதுகாப்பாக ஆராய்', qrFoundTitle: 'QR கிடைத்தது',
      qrFoundSay: 'QR கிடைத்தது. {detail}',
qrGuideSteps: 'மாதிரி QR படம் ஏற்றப்பட்டது. முன்னோட்டம் பாருங்கள். “இந்தப் படத்தையே பயன்படுத்து” என்பதைத் தேர்ந்தெடுங்கள். GHOSTWALK இப்போது உள்ளடக்கத்தைப் படிக்கும்.',
      g_qr_img: 'முதலீடு அல்லது பணத்திற்காக யாராவது QR குறியீடு அனுப்பினால் படத்தை இங்கே பதிவேற்றுங்கள். உள்ளே என்ன இருக்கிறது என்று பார்க்கக் கட்டணச் செயலியால் ஸ்கேன் செய்ய வேண்டாம். படித்த பிறகு எதுவும் செய்யும் முன் இலக்கைப் பாருங்கள்.',
      g_qr_found: 'QR-இல் இருப்பது இதுதான். பணமும் செல்லவில்லை, எதுவும் திறக்கவில்லை.',
      sampleNote: 'மாதிரி — செயல்விளக்கத்திற்கு மட்டும்.',
      sampleJourneyNote: 'கட்டுப்படுத்தப்பட்ட செயல்விளக்கப் பயணம் — பாதுகாப்பான சோதனை இலக்கு, உண்மையான அச்சுறுத்தல் அல்ல.',
      sampleQrNote: 'மாதிரி QR — செயல்விளக்கம் மட்டும். பணம் செலுத்தப்படவில்லை.',
      sampleCaseNote: 'மாதிரி மீட்பு வழக்கு — கற்பனை செயல்விளக்கத் தரவு. மீட்புக்கு உத்தரவாதம் இல்லை.',
      sampleAlertText: 'மேலும் சரிபார்ப்பு தேவை என்று GHOSTWALK கூறிய முதலீட்டுக் கோரிக்கை வந்துள்ளது. தொடரும் முன் என்னுடன் இதைப் பார்ப்பீர்களா?',
      sampleContact: 'மாதிரி தொடர்பு',
      packNeed: 'முதலில் நடந்ததில் குறைந்தது ஒரு படியையாவது சேர்க்கவும்.',
      carriedOver: '👻 உங்கள் பகுப்பாய்விலிருந்து கொண்டுவரப்பட்டது — பார்த்துவிட்டு வரைவை அழுத்தவும்.',
      explain: 'விளக்குங்கள்', readAloud: 'படித்துக் காட்டு', notNow: 'இப்போது வேண்டாம்',
      resultsReady: 'உங்கள் முடிவு கீழே தயார். என்னைத் தட்டுங்கள், எளிமையாக விளக்குகிறேன்.',
      uncertain: 'இதை நம்பிக்கையாகச் சரிபார்க்க முடியவில்லை. பாதுகாப்பு என்று அர்த்தம் இல்லை. தனியே சரிபார்க்கும் வரை தொடர வேண்டாம்.',
      checking: 'கீழே சோதனை நடக்கிறது. இலக்கைத் தனியே படிக்கும் — நீங்கள் தொட வேண்டாம்.',
      understood: 'புரிந்தது. தேவைப்பட்டால் இங்கேயே இருப்பேன்.',
      noResult: 'முதலில் சோதனை நடத்துங்கள் — என்ன கிடைத்தது என்று சொல்கிறேன்.',
      m_index_t: 'GHOSTWALK என்ன செய்யும்',
      m_index: ['என்ன வந்தது தேர்ந்தெடுங்கள்: செய்தி, இணைப்பு, QR, நம்பிக்கையானவர், பண உதவி.', 'சந்தேக இணைப்பை நீங்களே திறக்க வேண்டாம் — கோஸ்ட் சர்வரில் நடத்தும்.', 'நிறுத்துங்கள் அல்லது சரிபார்க்கப்படவில்லை மட்டும். பொய் “பாதுகாப்பு” இல்லை.'],
      m_message_t: 'செய்தி சரிபார்த்தல்',
      m_message: ['Text தாவலில் அரட்டை ஒட்டி ஆராயுங்கள்.', 'Photo தாவல் ஸ்கிரீன்ஷாட் படித்து மறைந்த QR பிடிக்கும்.', 'PDF தாவல் விளம்பரம் படிக்கும். Voice-இல் சொல்லி எழுதுங்கள்.'],
      m_ghost_t: 'இணைப்பு நடத்துதல்',
      m_ghost: ['சந்தேக இணைப்பைப் பெட்டியில் ஒட்டுங்கள். நீங்களே திறக்க வேண்டாம்.', '“கோஸ்ட்டை அனுப்புங்கள்” அழுத்தி விவரம் பாருங்கள்.', 'கோஸ்ட் போலித் தரவு மட்டும் — உங்களுடையது ஒருபோதும் இல்லை.'],
      m_qr_t: 'QR / UPI படித்தல்',
      m_qr: ['QR பின் UPI சரம் ஒட்டுங்கள் — நீங்கள் ஸ்கேன் செய்ய வேண்டாம்.', 'பணம் உண்மையில் எங்கு செல்லும் என்று கோஸ்ட் படிக்கும்.', 'தெரியும் பெயரை உண்மை நிறுவனத்துடன் தனியே ஒப்பிடுங்கள்.'],
      m_trusted_t: 'நம்பிக்கையானவரைச் சேர்த்தல்',
      m_trusted: ['பெயர், தொகை நிரப்பி வரைவு அழுத்துங்கள்.', 'சிறு செய்தி WhatsApp-இல் குடும்பத்திற்கு அனுப்புங்கள்.', 'அவர்கள் அங்கீகரிக்கவில்லை — உடன் நிற்பர்.'],
      m_recovery_t: 'பணம் செலுத்திவிட்டால்',
      m_recovery: ['என்ன நடந்தது படிப்படியாகச் சேருங்கள்.', '“சம்பவக் கோப்பு” அழுத்திப் பதிவிறக்குங்கள்.', 'வங்கி, 1930 உதவி எண்ணிற்கு எடுங்கள். மேலும் பணம் நிறுத்துங்கள்.'],
      understand: 'முடிவை விளக்குங்கள்',
      saidRed: 'இது நிறுத்துங்கள் என்கிறது. பணம், OTP, வங்கி விவரம் தர வேண்டாம்.',
      saidYellow: 'இது சரிபார்க்கப்படவில்லை என்கிறது. இப்போது பணம் வேண்டாம்.',
    },
    te: {
      welcomeT: 'GHOSTWALKకు స్వాగతం',
      welcomeV: 'ఈ సేవలో స్వర-మార్గదర్శనం కావాలా?',
      hear: 'ఈ సందేశం వినండి',
      whichLang: 'మీ భాష ఎంచుకోండి.',
      moreLangs: 'మరిన్ని భాషలు…',
      voiceQ: 'స్వరంలో కూడా వివరించమంటారా?',
      voiceOn: 'స్వరం ఆన్ చేయండి', voiceOff: 'వచనంలో కొనసాగండి',
      allSet: 'అయింది. మూలలో ఇక్కడే ఉంటాను — అవసరమైతే నన్ను నొక్కండి.',
      close: 'మూసివేయండి', back: '← వెనక్కి', mute: '🔇 స్వరం ఆపండి', unmute: '🔊 స్వరం ఆగింది — ఆన్ చేయండి',
      voiceNA: 'ఈ పరికరంలో ఈ భాషలో స్వర-మార్గదర్శనం లేదు. వచన మార్గదర్శనం కొనసాగుతుంది.',
      pause: '⏸ ఆపండి', resume: '▶ కొనసాగించండి', repeat: '🔁 మళ్ళీ', disableV: 'స్వరం ఆపండి', enableV: 'స్వరం ఆన్ చేయండి',
      changeL: 'భాష మార్చండి', replay: 'మార్గదర్శనం మళ్ళీ', curL: 'ప్రస్తుత భాష:',
      menuTitle: 'ఎలా సహాయపడమంటారు?',
      tGuide: 'నాకు ఈ పేజీ చూపించు', tExplain: 'ఈ ఎంపికను వివరించు', tRepeat: 'చివరి సూచన మళ్లీ చెప్పు',
      actWhatIsThis: 'ఇది ఏమిటి?', actWhatNext: 'ఇప్పుడు నేను ఏమి చేయాలి?',
      repeatNone: 'మళ్లీ చెప్పడానికి ఇంతకు ముందు సూచన ఏదీ లేదు.',
      tVoiceOn: 'వాయిస్ మార్గదర్శనం ఆన్', tVoiceOff: 'వాయిస్ మార్గదర్శనం ఆఫ్', tMin: 'చిన్నది చెయ్యి', tFull: 'పూర్తి సహాయకుడిని తెరువు',
      tNext: 'తర్వాత', tPrev: 'వెనకకు', tEnd: 'ముగించు', tYes: 'అవును, చూపించు', tNotNow: 'ఇప్పుడు వద్దు',
      guideOffer: 'ఈ ఎంపికల చిన్న పరిచయం కావాలా?',
      g_check: 'అనుమానాస్పద సందేశాన్ని ఇక్కడ అతికించండి, లేదా స్క్రీన్‌షాట్ లేదా పత్రంగా వస్తే అప్‌లోడ్ ఎంపిక వాడండి. పాస్‌వర్డ్‌లు, OTPలు, బ్యాంక్ వివరాలు రాయవద్దు. కంటెంట్ సిద్ధమయ్యాక కింద విశ్లేషణ బటన్ నొక్కండి.',
      g_walk: 'ఎవరైనా అనుమానాస్పద పెట్టుబడి లింక్ పంపితే తెరవకుండా కాపీ చేసి ఈ పెట్టెలో అతికించండి. సిద్ధమయ్యాక “విచారణ ప్రారంభించు” ఎంచుకోండి. GHOSTWALK గమ్యాన్ని విడిగా పరిశీలించి కనిపించింది తెలియజేస్తుంది.',
      g_qr: 'పూర్తి QR కోడ్ కనిపించే ఫోటో లేదా స్క్రీన్‌షాట్ ఎంచుకోండి. పేమెంట్ యాప్‌తో స్కాన్ చేయాల్సిన అవసరం లేదు. చిత్రం ఎంచుకుని ముందస్తు చూపు చూసి “ఈ చిత్రమే వాడండి” ఎంచుకోండి.',
      g_trusted: 'ముందు సారాంశం చూడండి. పరిస్థితి సరిగ్గా ఉంటే చేర్చాలనుకున్న వ్యక్తిని ఎంచుకోండి. GHOSTWALK వారి కోసం హెచ్చరిక సిద్ధం చేస్తుంది. పంపే ముందు తనిఖీ చేయండి.',
      g_paid: 'మరింత డబ్బు పంపవద్దు. ఏమి, ఎప్పుడు చెల్లించారో ముందు నమోదు చేయండి. తర్వాత స్క్రీన్‌షాట్‌లు, చెల్లింపు సూచనలు, సందేశాలు భద్రపరచండి. GHOSTWALK సమాచారం క్రమబద్ధం చేసి తర్వాత సహాయ దశలు చూపుతుంది.',
      g_check_go: 'సందేశాన్ని పైన రాసి లేదా అతికించి విశ్లేషణ మొదలుపెట్టడానికి ఈ బటన్ నొక్కండి. దెయ్యం అంతా ఈ పరికరంలోనే చదువుతుంది — ఏదీ తెరవదు, చెల్లించదు.',
      g_walk_go: 'లింక్‌లో దెయ్యాన్ని పంపడానికి ఈ బటన్ నొక్కండి. నకిలీ వివరాలతో సర్వర్‌లో దారి నడిచి సురక్షితంగా ఆగుతుంది — మీరే తెరవాల్సిన అవసరం లేదు.',
      g_qr_go: 'UPI వివరాలు అతికించాక ఈ బటన్ నొక్కండి. డబ్బు ఎక్కడికి వెళ్తుందో దెయ్యం చదివి గ్రహీత, మొత్తం, హెచ్చరికలు చూపుతుంది.',
      g_trusted_go: 'హెచ్చరిక సిద్ధం చేయడానికి ఈ బటన్ నొక్కండి. నమ్మకమైన వారితో పంచుకునే ముందు ముందస్తు చూపు జాగ్రత్తగా చదవండి.',
      g_paid_go: 'ఘటన ప్యాక్ తయారు చేయడానికి ఈ బటన్ నొక్కండి. 1930 హెల్ప్‌లైన్ కోసం మీ కాలక్రమం, ఆధారాలు క్రమబద్ధం చేస్తుంది — రికవరీకి హామీ లేదు.',
      m_start: 'గమ్యాన్ని ఇప్పుడు ప్రత్యేక సురక్షిత వాతావరణంలో పరిశీలిస్తున్నారు.',
      m_done: 'పరిశోధన పూర్తయింది. ఫలితాలను ఒక్కొక్కటిగా వివరిస్తాను.',
      langChanged: 'భాష మారింది. ఇదే భాషలో మార్గనిర్దేశం చేస్తాను.',
voiceWelcome: 'Ghostwalkకు స్వాగతం. మార్గనిర్దేశానికి నేనున్నాను. ప్రతి ఎంపిక వివరించి తర్వాత ఏం చేయాలో చూపుతాను.',
      textWelcome: 'GHOSTWALKకు స్వాగతం. సహాయం కావాలంటే నేనున్నాను. చిన్న దెయ్యాన్ని లేదా ? గుర్తును నొక్కండి.',
      hintHome: 'సహాయం కావాలా? ఎంపిక పక్కన ? నొక్కండి, లేదా గైడ్ కోసం దెయ్యాన్ని తెరవండి.',
      tExplainChoice: 'దేన్ని వివరించమంటారు?',
      explainName_checkMessage: 'సందేశం తనిఖీ', explainName_walkLink: 'లింక్‌లో దెయ్యాన్ని పంపు', explainName_qr: 'QR / UPI చదువు',
      explainName_trustedContact: 'నమ్మకమైన వారికి చెప్పు', explainName_alreadyPaid: 'డబ్బు చెల్లించేశాను',
      vLead: 'సులభమైన మాటల్లో కారణం ఇది.', vReason: 'కారణం {n}:', vExample: 'ఉదాహరణకు:',
      vRephrase: 'మరో మాటలో, ', vDoubt: 'అనుమానంగా ఉంటే ఇప్పుడు చెల్లించవద్దు. ముందు నమ్మకమైన వారితో మాట్లాడండి.',
      emptyRead: 'ఇప్పుడు చదవడానికి ఏమీ లేదు.', translating: 'పేజీ అనువదించబడుతోంది — ఒక్క క్షణం…',
      netStruggle: 'ఈ నెట్‌వర్క్‌లో అనువాదం ఆగిపోతోంది — ప్రస్తుతం ఇంగ్లీషు చూపిస్తోంది.',
      qrUpload: 'QR చిత్రం అప్‌లోడ్ చేయండి', qrUploadSub: 'QR కోడ్ ఉన్న ఫోటో లేదా స్క్రీన్‌షాట్ అప్‌లోడ్ చేయండి. చెల్లించకుండానే GHOSTWALK చదువుతుంది.',
      qrDrop: '…లేదా చిత్రాన్ని ఇక్కడికి లాగండి', qrTakePhoto: 'ఫోటో తీయండి', qrUse: 'ఈ చిత్రమే వాడండి',
      qrChange: 'మరోటి ఎంచుకోండి', qrRemove: 'తొలగించండి',
      qrNoCode: 'ఈ చిత్రం నుంచి QR కోడ్ చదవలేకపోయాం. పూర్తి QR కోడ్ కనిపించే స్పష్టమైన చిత్రం ఇవ్వండి.',
      qrTooBig: 'చిత్రం చాలా పెద్దది. 8 MB లోపు చిత్రం ఎంచుకోండి.',
      qrBadFile: 'ఫైల్‌ను చిత్రంగా చదవలేకపోయాం. PNG, JPG లేదా WebP స్క్రీన్‌షాట్ ఎంచుకోండి.',
      qrType: 'రకం', qrUpi: 'UPI చెల్లింపు అభ్యర్థన', qrUrl: 'వెబ్ లింక్', qrText: 'వచనం',
      qrPayee: 'గ్రహీత / UPI ID', qrName: 'పేరు', qrAmount: 'మొత్తం', qrNote: 'గమనిక',
      qrDecodeUpi: 'చెల్లింపు ఉద్దేశం చదవండి', qrInvestigate: 'లింక్‌ను సురక్షితంగా పరిశీలించండి', qrFoundTitle: 'QR దొరికింది',
      qrFoundSay: 'QR దొరికింది. {detail}',
qrGuideSteps: 'నమూనా QR చిత్రం లోడ్ అయింది. ముందస్తు చూపు చూడండి. “ఈ చిత్రమే వాడండి” ఎంచుకోండి. GHOSTWALK ఇప్పుడు లోపలివి చదువుతుంది.',
      g_qr_img: 'పెట్టుబడి లేదా చెల్లింపు కోసం ఎవరైనా QR కోడ్ పంపితే చిత్రాన్ని ఇక్కడ అప్‌లోడ్ చేయండి. లోపల ఏముందో చూడటానికి పేమెంట్ యాప్‌తో స్కాన్ అవసరం లేదు. చదివాక ఏమైనా చేసే ముందు గమ్యం చూడండి.',
      g_qr_found: 'QRలో ఉన్నది ఇదే. డబ్బూ వెళ్లలేదు, ఏదీ తెరవలేదు.',
      sampleNote: 'నమూనా — ప్రదర్శన కోసం మాత్రమే.',
      sampleJourneyNote: 'నియంత్రిత ప్రదర్శన ప్రయాణం — సురక్షిత పరీక్షా గమ్యం, నిజమైన ముప్పు కాదు.',
      sampleQrNote: 'నమూనా QR — ప్రదర్శన మాత్రమే. చెల్లింపు ప్రారంభించలేదు.',
      sampleCaseNote: 'నమూనా రికవరీ కేసు — కల్పిత ప్రదర్శన డేటా. రికవరీకి హామీ లేదు.',
      sampleAlertText: 'మరింత ధృవీకరణ అవసరమని GHOSTWALK గుర్తించిన పెట్టుబడి అభ్యర్థన నాకు వచ్చింది. ముందుకు వెళ్లే ముందు నాతో కలిసి దీన్ని చూస్తారా?',
      sampleContact: 'నమూనా సంప్రదింపు',
      packNeed: 'ముందు ఏం జరిగిందో కనీసం ఒక దశ జోడించండి.',
      carriedOver: '👻 మీ విశ్లేషణ నుంచి తీసుకొచ్చాం — చూసి డ్రాఫ్ట్ నొక్కండి.',
      explain: 'వివరించండి', readAloud: 'చదివి వినిపించండి', notNow: 'ఇప్పుడు వద్దు',
      resultsReady: 'మీ ఫలితం కింద సిద్ధం. నన్ను నొక్కండి, సులభంగా వివరిస్తాను.',
      uncertain: 'దీన్ని నమ్మకంగా ధృవీకరించలేకపోయాం. సురక్షితం అని అర్థం కాదు. స్వతంత్ర ధృవీకరణ దాకా ముందుకు వెళ్ళవద్దు.',
      checking: 'కింద తనిఖీ నడుస్తోంది. గమ్యం విడిగా చదువుతుంది — మీరు ఏమీ తాకవద్దు.',
      understood: 'అర్థమైంది. అవసరమైతే ఇక్కడే ఉంటాను.',
      noResult: 'ముందు తనిఖీ నడపండి — ఏమి దొరికిందో చెప్తాను.',
      m_index_t: 'GHOSTWALK ఏమి చేస్తుంది',
      m_index: ['ఏమి వచ్చిందో ఎంచుకోండి: సందేశం, లింక్, QR, నమ్మకమైన వ్యక్తి, డబ్బు సహాయం.', 'అనుమాన లింక్ మీరే తెరవవద్దు — గోస్ట్ సర్వర్‌లో నడుపుతుంది.', 'ఆగండి లేదా ధృవీకరించబడలేదు మాత్రమే. తప్పుడు “సురక్షితం” ఎప్పుడూ లేదు.'],
      m_message_t: 'సందేశ తనిఖీ',
      m_message: ['Text ట్యాబ్‌లో చాట్ అతికించి విశ్లేషించండి.', 'Photo ట్యాబ్ స్క్రీన్‌షాట్ చదివి దాగిన QR పడుతుంది.', 'PDF ట్యాబ్ బ్రోషర్ చదువుతుంది. Voiceలో చెప్పి రాయించండి.'],
      m_ghost_t: 'లింక్ నడపడం',
      m_ghost: ['అనుమాన లింక్ పెట్టెలో అతికించండి. మీరే తెరవవద్దు.', '“గోస్ట్‌ను పంపండి” నొక్కి వివరం చూడండి.', 'గోస్ట్ నకిలీ వివరాలే — మీవి ఎప్పుడూ కాదు.'],
      m_qr_t: 'QR / UPI చదవడం',
      m_qr: ['QR వెనుక UPI స్ట్రింగ్ అతికించండి — మీరు స్కాన్ చేయవద్దు.', 'డబ్బు నిజంగా ఎక్కడికి వెళ్తుందో గోస్ట్ చదువుతుంది.', 'కనిపించే పేరు నిజ కంపెనీతో విడిగా పోల్చండి.'],
      m_trusted_t: 'నమ్మకమైన వారిని చేర్చడం',
      m_trusted: ['పేరు, మొత్తం నింపి డ్రాఫ్ట్ నొక్కండి.', 'చిన్న సందేశం WhatsAppలో కుటుంబానికి పంపండి.', 'వారు ఆమోదించరు — పక్కన నిలుస్తారు.'],
      m_recovery_t: 'డబ్బు చెల్లిస్తే',
      m_recovery: ['ఏమైందో అడుగడుగునా చేర్చండి.', '“ఘటన-ప్యాక్” నొక్కి దింపుకోండి.', 'బ్యాంకు, 1930 హెల్ప్‌లైన్‌కు తీసుకెళ్ళండి. ఇక చెల్లింపులు ఆపండి.'],
      understand: 'నా ఫలితం వివరించండి',
      saidRed: 'ఇది ఆగండి అంటోంది. డబ్బు, OTP, బ్యాంకు వివరాలు ఇవ్వవద్దు.',
      saidYellow: 'ఇది ధృవీకరించబడలేదు అంటోంది. ఇప్పుడు డబ్బు వద్దు.',
    },
  };
  /* Generated, complete ghost dictionaries (scripts/i18n-build.js). Every supported
     language now has all Ghost keys resolved locally, so t() never has to fall back to
     an English sentence in the middle of a translated flow. Curated dictionaries above
     always win. */
  const PRE = window.GW_GHOST_PRE || {};
  /* Generated Ghost dictionaries. A language that already has a hand-maintained
     dictionary still gains the keys that were added to it later (the Ghost AI
     packs), one key at a time, so existing translations are never overwritten.
     Dictionaries arrive on demand, so this runs again on every language change. */
  function mergeGhostPre() {
    const all = window.GW_GHOST_PRE || PRE;
    for (const _c of Object.keys(all)) {
      if (!G[_c]) { G[_c] = all[_c]; continue; }
      const over = all[_c] || {};
      for (const _k of Object.keys(over)) if (G[_c][_k] === undefined) G[_c][_k] = over[_k];
    }
  }
  try { mergeGhostPre(); } catch {}
  /* runtime overlay is now only a safety net for a language whose dictionary file has
     not been generated yet; it is never the primary source for shipped languages */
  const RG = {};
  const _missed = new Set();
  const t = (k) => {
    const code = SL();
    const L = (G[code] || RG[code]);
    if (L && L[k] !== undefined) return L[k];
    if (G.en[k] === undefined) return k;
    if (code !== 'en' && !_missed.has(code + '|' + k)) {
      _missed.add(code + '|' + k);
      try {
        (window._gwMiss = window._gwMiss || []).push(code + ':' + k);
        if (window.console && console.warn) console.warn('Missing translation:', code, k);
      } catch {}
    }
    /* Never mix languages: a missing key gets an honest sentence in the active
       language if we have one, otherwise the key is surfaced and the caller
       falls back to its own deterministic copy. English is not substituted. */
    if (L && L.ai_missing_key) return L.ai_missing_key;
    return k;
  };
  try { window.__tr = (k) => t(k); } catch {}
  /* Ghost AI mounts its explanation into the full panel; it needs a way in when
     the user triggers it from the floating menu */
  try { window.__ghostT = (k) => t(k); } catch {}
  try {
    window.addEventListener('gw-lang', () => {
      mergeGhostPre();
      try { window.dispatchEvent(new CustomEvent('gw-ghost-pre')); } catch {}
    });
  } catch {}
  /* build the overlay for the active language when it has no curated dict */
  let _glBusy = false;
  async function ensureGhostLang() {
    const code = SL();
    if (code === 'en' || G[code] || RG[code] || _glBusy) return;
    if (!window.translateTexts) return;
    _glBusy = true;
    try {
      const strs = [], paths = [];
      for (const k of Object.keys(G.en)) {
        const v = G.en[k];
        if (typeof v === 'string') { strs.push(v); paths.push([k, -1]); }
        else if (Array.isArray(v)) v.forEach((s, i) => { if (typeof s === 'string') { strs.push(s); paths.push([k, i]); } });
      }
      if (!strs.length) return;
      const got = await translateTexts(strs, code);
      const top = {};
      paths.forEach((p, i) => {
        const val = (got && got[i]) || strs[i];
        if (p[1] < 0) top[p[0]] = val;
        else { if (!top[p[0]]) top[p[0]] = []; top[p[0]][p[1]] = val; }
      });
      RG[code] = top;
      /* new strings just landed for this language: the open UI was rendered
         without them, so allow exactly one rebuild to pick them up */
      try { _shownLang = null; } catch {}
      try { refreshOpen(); } catch {}
    } catch {} finally { _glBusy = false; }
  }
  // localized "voice unavailable" line for the shared voice service
  try { window.__voiceNA = () => t('voiceNA'); } catch {}
  const voiceOn = () => { try { return localStorage.getItem('gw_voice') === 'on'; } catch { return false; } };
  const setVoice = (v) => { try { localStorage.setItem('gw_voice', v ? 'on' : 'off'); } catch {} };
  const sessDone = () => { try { return sessionStorage.getItem('gw_greeted') === '1'; } catch { return true; } };
  const setSessDone = () => { try { sessionStorage.setItem('gw_greeted', '1'); } catch {} };
  const pageKey = () => {
    const p = location.pathname;
    if (/message/.test(p)) return 'message';
    if (/ghost/.test(p)) return 'ghost';
    if (/qr/.test(p)) return 'qr';
    if (/trusted/.test(p)) return 'trusted';
    if (/recovery/.test(p)) return 'recovery';
    return 'index';
  };
  const say = (text) => { sayGuided(text); };
  let _naShown = false;
  /* voice choice is asked once per session; the panel toggle can change it later */
  const voiceDecided = () => { try {
    if (sessionStorage.getItem('gw_vasked') === '1') return true;
    const v = localStorage.getItem('gw_voice'); return v === 'on' || v === 'off';
  } catch { return true; } };
  const markVoiceAsked = () => { try { sessionStorage.setItem('gw_vasked', '1'); } catch {} };
  /* dismissing onboarding without choosing = explicit text-only, never a skip */
  function dismissOnboarding() {
    try {
      if (!voiceDecided()) { setVoice(false); markVoiceAsked(); }
      stopV();
    } catch {}
    if (savedLang()) finishToFloat();
    else stepLang(false);
  }
  /* tracks the open onboarding step so a language change can rebuild it in place */
  let _step = null, _selfLang = false, _lrT = 0;
  /* language the open surfaces were last rendered in. Rebuilding them for an
     announcement of the same language tears down visible UI for no reason —
     that rebuild is the welcome "blink". Only a real change re-renders. */
  let _shownLang = null;
  function sayGuided(text) {
    try { window._gaLast = text; } catch {}
    if (!voiceOn()) return;
    // generation guard: if End Guide / Voice Off / lang change stopped audio while
    // the async checks below were in flight, never start speaking afterwards
    let gen = -1;
    try { gen = voiceGen(); } catch {}
    const alive = () => { try { return voiceGen() === gen; } catch { return true; } };
    (async () => {
      let out = text;
      if (!G[SL()]) {
        try { if (window.translateTexts) { const r = await translateTexts([text]); if (r && r[0]) out = r[0]; } } catch {}
      }
      if (!alive()) return;
      let ok = false;
      // a missing device voice is not "unsupported" - the server TTS covers it
      // order: device-independent TTS first, matching browser voice fallback second
      try { ok = await ttsAvailable(); } catch { ok = false; }
      if (!alive()) return;
      if (!ok) { try { ok = await voiceAvailable(SL()); } catch { ok = false; } }
      if (!alive()) return;
      if (!ok) {
        if (!_naShown) {
          _naShown = true;
          const note = t('voiceNA');
          const host = document.querySelector('#gaModal .ga-box') || document.querySelector('#gaPanel .ga-pbody');
          if (host) { const d = document.createElement('p'); d.className = 'ga-note'; d.textContent = note; host.appendChild(d); }
          else { try { toast(note); } catch {} }
        }
        return;
      }
      try { speak(out, SL()); } catch {}
    })();
  }
  const stopV = () => { try { if (typeof stopSpeak !== 'undefined') stopSpeak(); } catch {} };

  /* ── DOM builders ── */
  function el(html) {
    const d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }
  function closeModal() {
    const m = document.getElementById('gaModal');
    if (m) m.remove();
    document.body.style.overflow = '';
  }
  function showFloat() {
    if (document.getElementById('gaFloat')) return;
    const b = el(`<button id="gaFloat" aria-label="Ghost guide — open assistant controls"><img src="${AVATAR}" alt="${ALT}" /></button>`);
    b.addEventListener('click', () => openMenu());
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMenu(); } });
    document.body.appendChild(b);
  }
  /* side-by-side onboarding: [avatar] [list box], 20px gap, vertically centered */
  function sideShell(titleId, descId, boxHtml) {
    closeModal();
    const m = el(`<div id="gaModal"><div class="ga-backdrop" aria-hidden="true"></div>
      <div class="ga-side" role="dialog" aria-modal="true" aria-labelledby="${titleId}" aria-describedby="${descId}">
        <img class="ga-side-avatar" src="${AVATAR}" alt="${ALT}" />
        <div class="ga-box">${boxHtml}</div>
      </div></div>`);
    document.body.appendChild(m);
    document.body.style.overflow = 'hidden';
    return m;
  }

  /* ── onboarding: Welcome → language → voice choice → site. Every refresh
     starts here fresh; nothing says "welcome back" and nothing is skipped. ── */
  function langChips(cur) {
    const quick = [
      ['en', 'English'], ['hi', 'हिन्दी'], ['bn', 'বাংলা'],
      ['mr', 'मराठी'], ['ta', 'தமிழ்'], ['te', 'తెలుగు'],
    ];
    return `<div class="ga-langs" role="group" aria-label="${t('whichLang')}">
      ${quick.map(([c, n]) => `<button class="chip"${c === cur ? ' aria-current="true" data-cur="1"' : ''} data-lang="${c}">${n}</button>`).join('')}
    </div>`;
  }
  function stepWelcome() {
    _step = ['wel'];
    const m = sideShell('gaT', 'gaD', `
      <h2 id="gaT">${t('welcomeT')}</h2>
      <p id="gaD" class="ga-say">${t('whichLang')}</p>
      ${langChips(SL())}
      <div class="ga-btns">
        <button class="btn btn-paper btn-sm" data-a="more">${t('moreLangs')}</button>
      </div>`);
    try { const c = m.querySelector('[data-lang]'); c.focus({ preventScroll: true }); } catch {}
    // no autoplay: language unknown and voice undecided — visual text only
    m.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => pickWelcome(b.dataset.lang)));
    m.querySelector('[data-a="more"]').addEventListener('click', () => {
      closeModal();
      try { if (window.openLangGate) window.openLangGate(true); } catch {}
      const iv = setInterval(() => {
        const g = document.getElementById('langGate');
        if (!g || g.classList.contains('hidden')) { clearInterval(iv); stepVoiceAsk(); }
      }, 600);
    });
    m.addEventListener('keydown', (e) => { if (e.key === 'Escape') dismissOnboarding(); });
  }
  function pickWelcome(code) {
    _selfLang = true;
    try { stopV(); } catch {}
    try { if (window.applyLang) { const r = window.applyLang(code); if (r && r.catch) r.catch(() => {}); } } catch {}
    stepVoiceAsk();
  }
  function stepVoiceAsk() {
    _step = ['voi'];
    const msg = t('voiceQ');
    const m = sideShell('gaT', 'gaD', `
      <h2 id="gaT">${t('welcomeT')}</h2>
      <p id="gaD" class="ga-say">${msg}</p>
      <div class="ga-btns">
        <button class="btn btn-paper btn-sm" data-a="hear">${t('hear')}</button>
      </div>
      <div class="ga-btns">
        <button class="btn btn-red btn-sm" data-a="von">${t('voiceOn')}</button>
        <button class="btn btn-paper btn-sm" data-a="voff">${t('voiceOff')}</button>
      </div>
      <div class="ga-btns ga-langrow">
        <span class="ga-curlang">${t('curL')} <b>${langName(SL())}</b></span>
        <button class="btn btn-paper btn-sm" data-a="clang">${t('changeL')}</button>
      </div>`);
    const hear = m.querySelector('[data-a="hear"]');
    try { hear.focus({ preventScroll: true }); } catch { try { hear.focus(); } catch {} }
    // explicit Hear taps may speak (consent); nothing autoplays before the choice
    hear.addEventListener('click', () => { stopV(); try { speak(msg, SL()); } catch {} });
    m.querySelector('[data-a="von"]').addEventListener('click', () => {
      setVoice(true); markVoiceAsked();
      finishToFloat(true);
      try { say(t('voiceWelcome')); } catch {}
    });
    m.querySelector('[data-a="voff"]').addEventListener('click', () => {
      // text-only: silence, close, visual welcome, minimized ghost
      setVoice(false); markVoiceAsked(); stopV();
      closeModal(); setSessDone(); showFloat();
      openTeachFloat(t('textWelcome'));
    });
    m.querySelector('[data-a="clang"]').addEventListener('click', () => stepLang('voiceask'));
    m.addEventListener('keydown', (e) => { if (e.key === 'Escape') dismissOnboarding(); });
  }
  /* text-only welcome bubble anchored to the floating ghost (visual only) */
  function openTeachFloat(text) {
    try {
      const f = document.getElementById('gaFloat');
      if (!f) return;
      markOffered();
      openTeach([{ key: null, el: f, text }], 0, false);
    } catch {}
  }
  /* persistent language preference: ask once, reuse silently afterwards */
  function savedLang() {
    try {
      if (localStorage.getItem('gw_haslang') !== '1') return null;
      const c = localStorage.getItem('gw_lang');
      if (!c) return null;
      if (window.supportedLang) return window.supportedLang(c);
      return ['en', 'hi', 'bn', 'mr', 'ta', 'te'].includes(c) ? c : null;
    } catch { return null; }
  }
  function langName(code) {
    try { if (window.langNativeName) return window.langNativeName(code); } catch {}
    return ({ en: 'English', hi: 'हिन्दी', bn: 'বাংলা', mr: 'मराठी', ta: 'தமிழ்', te: 'తెలుగు' })[code] || code;
  }
  function stepLang(backToPanel) {
    _step = ['lang', backToPanel];
    const cur = SL();
    const m = sideShell('gaT2', 'gaD2', `
      <h2 id="gaT2">${t('whichLang')}</h2>
      <p id="gaD2" class="ga-say" style="display:none">${t('whichLang')}</p>
      ${langChips(cur)}
      <div class="ga-btns">
        <button class="btn btn-paper btn-sm" data-a="more">${t('moreLangs')}</button>
        <button class="btn btn-ghostline btn-sm" data-a="x">${t('close')}</button>
      </div>`);
    try { const c = m.querySelector('[data-cur]') || m.querySelector('[data-lang]'); c.focus({ preventScroll: true }); } catch {}
    say(t('whichLang'));
    // applyLang sets the language + saves it synchronously and only then awaits the
    // page translation, so start it without awaiting and move the ghost on at once
    const pick = (code) => {
      _selfLang = true;
      try { stopV(); } catch {}
      try { if (window.applyLang) { const r = window.applyLang(code); if (r && r.catch) r.catch(() => {}); } } catch {}
      refreshTexts(m);
      finishStep(backToPanel);
    };
    m.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => pick(b.dataset.lang)));
    m.querySelector('[data-a="more"]').addEventListener('click', () => {
      closeModal();
      try { if (window.openLangGate) window.openLangGate(true); } catch {}
      const iv = setInterval(() => {
        const g = document.getElementById('langGate');
        if (!g || g.classList.contains('hidden')) { clearInterval(iv); refreshAll(); finishStep(backToPanel); }
      }, 600);
    });
    m.querySelector('[data-a="x"]').addEventListener('click', finishToFloat);
    // Esc on the language list keeps the current language instead of stranding the user
    m.addEventListener('keydown', (e) => { if (e.key === 'Escape') pick(SL()); });
  }
  function refreshTexts(m) {
    // re-render current step in the newly chosen language
    try {
      const h = m.querySelector('h2');
      if (h && h.id === 'gaT2') { h.textContent = t('whichLang'); }
    } catch {}
  }
  function refreshAll() { /* translated UI re-renders via existing engine; assistant reads fresh on next open */ }
  /* the AI explanation layer mounts into this panel */
  try { window.__ghostOpenPanel = () => openPanel(); } catch {}
  function finishStep(backToPanel) {
    if (backToPanel === 'voiceask') { stepVoiceAsk(); return; }
    if (backToPanel) { closeModal(); openPanel(false); return; }
    finishToFloat(true);
  }
  function finishToFloat(celebrate) {
    setSessDone();
    closeModal();
    showFloat();
    if (celebrate) {
      say(t('allSet'));
      try { document.getElementById('gaFloat').focus({ preventScroll: true }); } catch {}
    }
    // first completion on the homepage: one short hint about the ? controls
    // (replaces the tour offer this once so two bubbles never stack)
    try {
      setTimeout(() => {
        if (celebrate && pageKey() === 'index' && !wasOffered()) {
          try {
            if (!sessionStorage.getItem('gw_hinted')) {
              sessionStorage.setItem('gw_hinted', '1');
              markOffered();
              const anchor = document.querySelector('[data-explain]') || document.getElementById('gaFloat');
              if (anchor) openTeach([{ key: null, el: anchor, text: t('hintHome') }], 0, false);
              return;
            }
          } catch {}
        }
        maybeOfferGuide();
      }, 600);
    } catch {}
  }

  /* ── guide panel (from floating ghost) ── */
  function resultBox() {
    const ev = document.querySelector('.ev-list');
    if (!ev || !ev.children.length) return null;
    return ev.closest('.panel') || ev.parentElement;
  }
  function openPanel() {
    closeModal();
    let p = document.getElementById('gaPanel');
    if (p) { try { clearInterval(p._piv); } catch {} p.remove(); }
    const k = pageKey();
    const items = (t('m_' + k) || t('m_index')).map(x => `<li>${x}</li>`).join('');
    p = el(`<div id="gaPanel" role="dialog" aria-modal="false" aria-label="${t('menuTitle')}">
      <div class="ga-phead"><img src="${AVATAR}" alt="${ALT}" />
        <b>${t('m_' + k + '_t') || t('m_index_t')}</b>
        <button data-a="x" aria-label="${t('close')}">✕</button>
      </div>
      <div class="ga-pbody">
        <div class="ga-ctl" role="group" aria-label="${t('menuTitle')}">
          <button class="btn btn-paper btn-sm" data-a="clang">${t('changeL')}</button>
          <button class="btn btn-paper btn-sm" data-a="vrep">${t('replay')}</button>
        </div>
        <ul class="ga-points">${items}</ul>
        <div class="ga-res"></div>
      </div>
      <div class="ga-pfoot">
        <button class="btn btn-paper btn-sm" data-a="pause" style="display:none">⏸</button>
        <button class="btn btn-paper btn-sm" data-a="mute">${voiceOn() ? t('mute') : t('unmute')}</button>
        <button class="btn btn-ghostline btn-sm" data-a="x2">${t('close')}</button>
      </div></div>`);
    document.body.appendChild(p);
    const res = p.querySelector('.ga-res');
    const box = resultBox();
    if (box) {
      const btns = el(`<div class="ga-btns" style="margin-top:10px">
        <button class="btn btn-red btn-sm" data-a="under">${t('understand')}</button></div>`);
      res.appendChild(btns);
      btns.querySelector('[data-a="under"]').addEventListener('click', () => showResultHelp(p, box));
    } else if (/ghost|qr|message/.test(k)) {
      const busy = document.querySelector('#replayBox:not(.hidden)');
      if (busy) {
        const d = el(`<p class="ga-note">${t('checking')}</p>`);
        res.appendChild(d);
        say(t('checking'));
      }
    }
    const pauseBtn = p.querySelector('[data-a="pause"]');
    const syncPause = () => {
      try {
        const active = (typeof speakingNow !== 'undefined') && speakingNow();
        const paused = (typeof speakPaused !== 'undefined') && speakPaused();
        if (active && !paused) {
          pauseBtn.style.display = ''; pauseBtn.textContent = t('pause');
        } else if (active && paused) {
          pauseBtn.style.display = ''; pauseBtn.textContent = t('resume');
        } else pauseBtn.style.display = 'none';
      } catch {}
    };
    p._piv = setInterval(syncPause, 800);
    pauseBtn.addEventListener('click', () => {
      try {
        if ((typeof speakPaused !== 'undefined') && speakPaused()) { if (typeof resumeSpeak !== 'undefined') resumeSpeak(); }
        else if (typeof pauseSpeak !== 'undefined') pauseSpeak();
        else if (window.speechSynthesis) {
          if (speechSynthesis.paused) speechSynthesis.resume();
          else speechSynthesis.pause();
        }
      } catch {}
      setTimeout(syncPause, 100);
    });
    p.querySelector('[data-a="clang"]').addEventListener('click', () => stepLang(true));
    p.querySelector('[data-a="vrep"]').addEventListener('click', () => {
      try {
        if (typeof repeatSpeak !== 'undefined' && repeatSpeak()) return;
        if (window._gaLast) speak(window._gaLast, SL());
      } catch {}
    });
    p.querySelectorAll('[data-a="x"],[data-a="x2"]').forEach(b => b.addEventListener('click', () => { stopV(); try { clearInterval(p._piv); } catch {} p.remove(); }));
    p.querySelector('[data-a="mute"]').addEventListener('click', (e) => {
      if (voiceOn()) { stopV(); setVoice(false); e.target.textContent = t('unmute'); }
      else { setVoice(true); e.target.textContent = t('mute'); say(t('allSet')); }
    });
    try { p.querySelector('[data-a="clang"]').focus({ preventScroll: true }); } catch {}
  }
  function showResultHelp(panel, box) {
    const res = panel.querySelector('.ga-res');
    res.innerHTML = '';
    const isRed = !!box.querySelector('.verdict.red');
    const head = el(`<p class="ga-say">${isRed ? t('saidRed') : t('saidYellow')}</p>`);
    res.appendChild(head);
    try { noteGuide(head.textContent); } catch {}
    say(head.textContent);
    const evs = [...box.querySelectorAll('.ev-list .ev')].slice(0, 3);
    if (!evs.length) {
      const d = el(`<p class="ga-note">${t('uncertain')}</p>`);
      res.appendChild(d); say(t('uncertain'));
    } else {
      const ul = el('<ul class="ga-points"></ul>');
      evs.forEach(ev => {
        const b = ev.querySelector('b') ? ev.querySelector('b').textContent : '';
        const li = document.createElement('li');
        li.textContent = b.replace(/^\d+\.\s*/, '');
        ul.appendChild(li);
      });
      res.appendChild(ul);
    }
    if (!isRed) {
      const d = el(`<p class="ga-note">${t('uncertain')}</p>`);
      res.appendChild(d);
    }
    const btns = el(`<div class="ga-btns" style="margin-top:10px">
      <button class="btn btn-ink btn-sm" data-a="read">${t('readAloud')}</button>
      <button class="btn btn-paper btn-sm" data-a="ok">${t('notNow')}</button></div>`);
    res.appendChild(btns);
    /* "Explain this option" on a real result: the same three questions the menu
       offers, placed where the user is already reading the evidence. Each one
       falls back to the built-in answer, so this can never dead-end. */
    try {
      if (window.GhostAI && typeof window.GhostAI.explain === 'function') {
        const q = el(`<div class="ga-btns" style="margin-top:8px">
          <button class="btn btn-paper btn-sm" data-q="simple">${t('ai_simple')}</button>
          <button class="btn btn-paper btn-sm" data-q="why">${t('ai_why')}</button>
          <button class="btn btn-paper btn-sm" data-q="next">${t('ai_next')}</button>
        </div>`);
        res.appendChild(q);
        q.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
          try { window.GhostAI.explain(b.getAttribute('data-q')); } catch {}
        }));
      }
    } catch {}
    btns.querySelector('[data-a="read"]').addEventListener('click', () => {
      try {
        if (window.speakingNow && speakingNow()) { stopV(); return; }
      } catch {}
      stopV();
      (async () => {
        // explicit tap = consent to hear; still never speak the wrong language silently
        let ok = true;
        try { ok = await ttsAvailable(); } catch { ok = false; }
        if (!ok) { try { ok = await voiceAvailable(SL()); } catch { ok = false; } }
        if (!ok) {
          const res2 = panel.querySelector('.ga-res');
          if (res2 && !res2.querySelector('.ga-nadone')) {
            const d = document.createElement('p');
            d.className = 'ga-note ga-nadone';
            d.textContent = t('voiceNA');
            res2.appendChild(d);
          }
          return;
        }
        try { speakVerdict(box, SL(), null); } catch { try { speak(head.textContent, SL()); } catch {} }
      })();
    });
    btns.querySelector('[data-a="ok"]').addEventListener('click', () => {
      stopV();
      res.innerHTML = `<p class="ga-note">${t('understood')}</p>`;
    });
  }

  /* ── teacher mode: anchored ghost, tours, menu ── */
  const GUIDE_STEPS = {
    index: ['check-message', 'walk-link', 'qr', 'trusted-contact', 'already-paid'],
    message: ['check-message', 'check-go'],
    ghost: ['walk-link', 'walk-go'],
    qr: ['qr', 'qr-img', 'qr-go'],
    trusted: ['trusted-contact', 'trusted-go'],
    recovery: ['already-paid', 'paid-go'],
  };
  const GUIDE_TEXT = {
    'check-message': 'g_check', 'walk-link': 'g_walk', 'qr': 'g_qr',
    'trusted-contact': 'g_trusted', 'already-paid': 'g_paid', 'check-go': 'g_check_go',
    'qr-img': 'g_qr_img',
    'walk-go': 'g_walk_go', 'qr-go': 'g_qr_go', 'trusted-go': 'g_trusted_go', 'paid-go': 'g_paid_go',
  };
  let _teach = null; // { steps:[{key,el}], i, tour, offer }
  let _teachBound = false;
  /* whichever option the user is actually on: focus, tap, keyboard or tour */
  let _activeKey = null, _activeCustom = null;
  function trackTarget(e) {
    try {
      const t = e.target && e.target.closest ? e.target.closest('[data-ghost-guide]') : null;
      if (t) {
        const k = t.getAttribute('data-ghost-guide');
        if (k && GUIDE_TEXT[k]) { _activeKey = k; _activeCustom = null; return; }
      }
      const evc = e.target && e.target.closest ? e.target.closest('.ev-list .ev') : null;
      if (evc) {
        const txt = ((evc.innerText || evc.textContent) || '').replace(/\s+/g, ' ').trim().slice(0, 500);
        if (txt) _activeCustom = { el: evc, text: txt };
      }
    } catch {}
  }
  function nearestStepIndex(steps) {
    try {
      const f = document.getElementById('gaFloat');
      if (!f) return 0;
      const fr = f.getBoundingClientRect();
      const fx = fr.left + fr.width / 2, fy = fr.top + fr.height / 2;
      let best = 0, bd = Infinity;
      steps.forEach((s, i) => {
        try {
          const r = s.el.getBoundingClientRect();
          const cx = Math.max(r.left, Math.min(fx, r.right)), cy = Math.max(r.top, Math.min(fy, r.bottom));
          const d = (fx - cx) * (fx - cx) + (fy - cy) * (fy - cy);
          if (d < bd) { bd = d; best = i; }
        } catch {}
      });
      return best;
    } catch { return 0; }
  }
  function teachSteps() {
    const out = [];
    for (const n of (GUIDE_STEPS[pageKey()] || [])) {
      const e = document.querySelector(`[data-ghost-guide="${n}"]`);
      if (e && GUIDE_TEXT[n]) out.push({ key: n, el: e });
    }
    return out;
  }
  function closeTeach(restoreFocus) {
    if (document.getElementById('gaTeach')) document.getElementById('gaTeach').remove();
    try { document.querySelectorAll('.ga-target-hl').forEach(e => e.classList.remove('ga-target-hl')); } catch {}
    _teach = null;
    if (restoreFocus !== false) { try { const f = document.getElementById('gaFloat'); if (f) f.focus({ preventScroll: true }); } catch {} }
  }
  function openTeach(steps, i, tour, offer) {
    closeTeach(false);
    closeMenu();
    if (!steps || !steps.length) return;
    _teach = { steps, i: Math.max(0, Math.min(i, steps.length - 1)), tour: !!tour, offer: !!offer };
    const w = el(`<div id="gaTeach">
      <img class="ga-tavatar" src="${AVATAR}" alt="${ALT}" />
      <div class="ga-tbubble" role="dialog" aria-modal="false" aria-live="polite" aria-label="${t('menuTitle')}">
        <p class="ga-tstep" aria-hidden="true"></p>
        <p class="ga-tsay"></p>
        <div class="ga-tbtns"></div>
      </div></div>`);
    w.addEventListener('keydown', (e) => { if (e.key === 'Escape') { endTeach(); } });
    document.body.appendChild(w);
    renderTeach(true);
  }
  function teachSay(text) { try { say(text); } catch {} }
  function endTeach() {
    // END means end: silence every audio path first, keep the voice preference itself
    try { stopV(); } catch {}
    markOffered(); closeTeach(true);
  }
  function renderTeach(fresh) {
    const w = document.getElementById('gaTeach');
    if (!w || !_teach) return;
    const s = _teach.steps[_teach.i];
    if (!s || !s.el || !s.el.isConnected) { closeTeach(false); return; }
    if (s.key) _activeKey = s.key;
    try {
      document.querySelectorAll('.ga-target-hl').forEach(e => { if (e !== s.el) e.classList.remove('ga-target-hl'); });
      s.el.classList.add('ga-target-hl');
    } catch {}
    const msg = s.text || t(GUIDE_TEXT[s.key]);
    /* an unsolicited offer is not an instruction yet: only content the user
       engaged with becomes repeatable */
    try { if (!_teach.offer) noteGuide(msg); } catch {}
    w.querySelector('.ga-tsay').textContent = msg;
    w.querySelector('.ga-tsay').id = 'gaTeachSay';
    w.querySelector('.ga-tbubble').setAttribute('aria-describedby', 'gaTeachSay');
    w.querySelector('.ga-tstep').textContent = _teach.tour ? `${_teach.i + 1} / ${_teach.steps.length}` : '';
    const btns = w.querySelector('.ga-tbtns');
    btns.innerHTML = '';
    const add = (label, fn, primary) => {
      const b = document.createElement('button');
      b.className = 'btn btn-sm ' + (primary ? 'btn-red' : 'btn-paper');
      b.textContent = label;
      b.addEventListener('click', fn);
      btns.appendChild(b);
      return b;
    };
    if (_teach.offer) {
      add(t('tYes'), () => { _teach.offer = false; _teach.tour = true; renderTeach(true); }, true);
      add(t('tNotNow'), () => endTeach());
    } else if (_teach.tour) {
      if (_teach.i > 0) add(t('tPrev'), () => { _teach.i--; renderTeach(true); });
      if (_teach.i < _teach.steps.length - 1) add(t('tNext'), () => { _teach.i++; renderTeach(true); }, true);
      else add(t('tEnd'), () => endTeach(), true);
      add(t('tRepeat'), () => teachSay(msg));
      if (_teach.i < _teach.steps.length - 1) add(t('tEnd'), () => endTeach());
    } else {
      add(t('tRepeat'), () => teachSay(msg));
      add(t('tEnd'), () => endTeach());
    }
    placeTeach();
    if (fresh) {
      teachSay(msg);
      try { const f = btns.querySelector('button'); if (f) f.focus({ preventScroll: true }); } catch {}
    }
  }
  function placeTeach() {
    const w = document.getElementById('gaTeach');
    if (!w || !_teach) return;
    const tgt = _teach.steps[_teach.i].el;
    if (!tgt || !tgt.isConnected) { closeTeach(false); return; }
    let r;
    try { r = tgt.getBoundingClientRect(); } catch { return; }
    const vw = window.innerWidth || 360, vh = window.innerHeight || 640;
    if ((r.bottom < -40 || r.top > vh + 40)) { try { tgt.scrollIntoView({ block: 'center' }); } catch {} try { r = tgt.getBoundingClientRect(); } catch {} }
    const av = w.querySelector('.ga-tavatar'), bb = w.querySelector('.ga-tbubble');
    const AS = 46, GAP = 10;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const bw = Math.min(270, vw - 16);
    const mobile = vw < 640;
    let ax, ay;
    bb.style.width = ''; bb.style.right = ''; bb.style.bottom = '';
    if (!mobile && vw - r.right >= bw + AS + GAP * 3) {
      // avatar right of target, bubble right of avatar — target stays clickable
      ax = r.right + GAP; ay = clamp(r.top + r.height / 2 - AS / 2, 8, vh - AS - 8);
      bb.style.left = (ax + AS + GAP) + 'px';
      bb.style.top = clamp(ay + AS / 2 - 70, 8, Math.max(8, vh - 190)) + 'px';
      bb.style.width = bw + 'px';
    } else if (!mobile && r.left >= bw + AS + GAP * 3) {
      ax = r.left - GAP - AS; ay = clamp(r.top + r.height / 2 - AS / 2, 8, vh - AS - 8);
      bb.style.left = Math.max(8, ax - GAP - bw) + 'px';
      bb.style.top = clamp(ay + AS / 2 - 70, 8, Math.max(8, vh - 190)) + 'px';
      bb.style.width = bw + 'px';
    } else {
      // stacked / mobile: avatar beside the target, bubble docks at the bottom
      ax = clamp(r.left, 8, Math.max(8, vw - AS - 8));
      ay = (r.top >= AS + GAP + 8) ? r.top - AS - GAP : Math.min(Math.max(8, vh - AS - 8), r.bottom + GAP);
      bb.style.left = '8px'; bb.style.right = '8px';
      bb.style.top = 'auto'; bb.style.bottom = '8px';
    }
    av.style.left = ax + 'px'; av.style.top = ay + 'px';
  }
  function bindTeach() {
    if (_teachBound) return; _teachBound = true;
    window.addEventListener('scroll', () => { try { placeTeach(); } catch {} }, { capture: true, passive: true });
    window.addEventListener('resize', () => { try { placeTeach(); } catch {} });
  }
  function offerKey() { return 'gw_offer_' + pageKey(); }
  function markOffered() { try { sessionStorage.setItem(offerKey(), '1'); } catch {} }
  function wasOffered() { try { return sessionStorage.getItem(offerKey()) === '1'; } catch { return true; } }
  function maybeOfferGuide() {
    try {
      if (wasOffered()) return;
      if (document.getElementById('gaModal') || document.getElementById('gaTeach') || document.getElementById('gaMenu')) return;
      const g = document.getElementById('langGate');
      if (g && !g.classList.contains('hidden')) return;
      const steps = teachSteps();
      if (!steps.length) return;
      openTeach(steps, 0, false, true);
    } catch {}
  }
  function startTour() {
    const steps = teachSteps();
    if (!steps.length) { try { say(t('understood')); } catch {} return; }
    markOffered();
    openTeach(steps, 0, true);
  }
  /* one-tap explain of an exact target — no guessing, no hover needed */
  const EXPLAIN_NAMES = {
    'check-message': 'explainName_checkMessage', 'walk-link': 'explainName_walkLink',
    'qr': 'explainName_qr', 'qr-img': 'explainName_qr',
    'trusted-contact': 'explainName_trustedContact', 'already-paid': 'explainName_alreadyPaid',
  };
  function explainKey(key) {
    markOffered();
    try { stopV(); } catch {}
    const steps = teachSteps();
    const idx = steps.findIndex(s => s.key === key);
    /* the AI explanation fires whether or not the bubble renders: the two
       surfaces are independent, and a render failure must never swallow help */
    if (idx >= 0) { try { openTeach(steps, idx, false); } catch {} aiExplainControl(key); return; }
    try {
      const elx = document.querySelector(`[data-ghost-guide="${key}"]`);
      if (elx && GUIDE_TEXT[key]) { try { openTeach([{ key, el: elx }], 0, false); } catch {} aiExplainControl(key); return; }
    } catch { aiExplainControl(key); return; }
    try { say(t('understood')); } catch {}
  }
  /* The guided bubble stays exactly as it was; alongside it, the AI explains
     the same control with live context (feature, stage, findings, language).
     Nothing about the teach flow changes when AI is unavailable. */
  function aiExplainControl(key) {
    try {
      if (window.GhostAI && typeof window.GhostAI.explain === 'function') {
        const nm = EXPLAIN_NAMES[key];
        window.GhostAI.explain('control', { control: nm ? t(nm) : key });
      }
    } catch {}
  }
  /* localized accessible names for every direct explain control */
  function hydrateExplain() {
    try {
      document.querySelectorAll('[data-explain]').forEach(b => {
        const k = b.getAttribute('data-explain');
        const nm = EXPLAIN_NAMES[k];
        if (nm) b.setAttribute('aria-label', `${t('tExplain')}: ${t(nm)}`);
      });
    } catch {}
  }
  /* ── deterministic action router ─────────────────────────────────────────
     Every menu button carries a stable action id, never translated text.
     Each id has exactly one behavior. Unknown ids are logged during
     development and do nothing — they never start the homepage guide. */
  const GHOST_ACTIONS = {
    'what-is-this': () => whatIsThis(),
    'what-do-i-do': () => whatNext(),
    'guide-page': () => { startTour(); },
    'ai-simple': () => { try { window.GhostAI.explain('simple'); } catch {} },
    'ai-why': () => { try { window.GhostAI.explain('why'); } catch {} },
    'ai-next': () => { try { window.GhostAI.explain('next'); } catch {} },
    'repeat': () => repeatLast(),
    'toggle-voice': () => {
      if (voiceOn()) { stopV(); setVoice(false); }
      else { setVoice(true); say(t('allSet')); }
    },
    'change-language': () => { stepLang(true); },
    'open-full': () => { try { openPanel(); } catch {} },
    'minimize': () => {
      /* visuals only: panel and bubble go away, the avatar stays, audio and
         settings are untouched */
      try {
        const p = document.getElementById('gaPanel');
        if (p) { try { clearInterval(p._piv); } catch {} p.remove(); }
      } catch {}
      closeTeach(false);
    },
  };
  function ghostAction(id) {
    const fn = GHOST_ACTIONS[id];
    if (typeof fn !== 'function') { try { console.warn('Unknown Ghost action: ' + id); } catch {} return; }
    closeMenu();
    fn();
  }
  /* last instruction the Ghost actually displayed, so Repeat repeats it —
     never page audio, never a fresh guide */
  let _lastGuide = null;
  function noteGuide(text) { try { if (text) _lastGuide = String(text); } catch {} }
  /* one bubble, one message; the bubble speaks it in sync when voice is on */
  function answerBubble(text) {
    noteGuide(text);
    try {
      const f = document.getElementById('gaFloat');
      if (f && f.isConnected) { openTeach([{ key: null, el: f, text }], 0, false); return; }
    } catch {}
    try { say(text); } catch {}
  }
  function repeatLast() {
    if (_lastGuide) { answerBubble(_lastGuide); return; }
    answerBubble(t('repeatNone'));
  }
  function pageHasResult() {
    try {
      const box = document.querySelector('#resultBox');
      if (box && !box.classList.contains('hidden') && box.querySelector('.verdict,.ev-list .ev')) return true;
      return !!document.querySelector('.verdict.red,.verdict.yellow');
    } catch { return false; }
  }
  function fieldFilled(sel) {
    try {
      const n = document.querySelector(sel);
      if (!n) return false;
      if (n.tagName === 'INPUT' && n.type === 'file') return !!(n.files && n.files.length);
      return !!(n.value && n.value.trim());
    } catch { return false; }
  }
  /* "What is this?" — the current page, in this language, from the page's own
     reference copy. Never a homepage fallback on other pages. */
  function whatIsThis() {
    const k = pageKey();
    const title = t('m_' + k + '_t') || t('m_index_t');
    let pts = t('m_' + k);
    if (!Array.isArray(pts)) pts = t('m_index');
    if (!Array.isArray(pts)) pts = [];
    answerBubble(title + ' ' + pts.join(' '));
  }
  /* "What should I do now?" — the next step for this page AND this state:
     empty input vs ready input vs finished investigation each answer
     differently, all from already-translated guidance strings. */
  function whatNext() {
    if (pageHasResult()) { answerBubble(t('m_done')); return; }
    const k = pageKey();
    let gk = null;
    if (k === 'message') {
      gk = (fieldFilled('#inText') || fieldFilled('#ocrText') || fieldFilled('#pdfText') || fieldFilled('#voiceText'))
        ? 'check-go' : 'check-message';
    } else if (k === 'ghost') {
      gk = fieldFilled('#inUrl') ? 'walk-go' : 'walk-link';
    } else if (k === 'qr') {
      gk = (fieldFilled('#inUpi') || fieldFilled('#qrFile')) ? 'qr-go' : 'qr';
    } else if (k === 'trusted') {
      gk = (fieldFilled('#trustedName') || fieldFilled('#trustedAmount')) ? 'trusted-go' : 'trusted-contact';
    } else if (k === 'recovery') {
      try { gk = document.querySelector('#evTimeline li:not(.muted)') ? 'paid-go' : 'already-paid'; }
      catch { gk = 'already-paid'; }
    }
    if (!gk) {
      const ix = t('m_index');
      answerBubble(Array.isArray(ix) && ix.length ? ix[0] : t('guideOffer'));
      return;
    }
    answerBubble(t(GUIDE_TEXT[gk]));
  }
  /* small floating teacher menu — not a chatbot, no open-ended input */
  function closeMenu() { const m = document.getElementById('gaMenu'); if (m) m.remove(); }
  function openMenu() {
    const was = !!document.getElementById('gaMenu');
    closeMenu();
    if (was) return;
    closeTeach(false);
    const m = el(`<div id="gaMenu" role="menu" aria-label="${t('menuTitle')}"></div>`);
    const items = [
      ['what-is-this', t('actWhatIsThis')],
      ['what-do-i-do', t('actWhatNext')],
      ['guide-page', t('tGuide')],
      ['ai-simple', t('ai_simple')],
      ['ai-why', t('ai_why')],
      ['ai-next', t('ai_next')],
      ['repeat', t('tRepeat')],
      ['toggle-voice', voiceOn() ? t('tVoiceOff') : t('tVoiceOn')],
      ['change-language', t('changeL')],
      ['open-full', t('tFull')],
      ['minimize', t('tMin')],
    ];
    for (const [id, label] of items) {
      const b = document.createElement('button');
      b.className = 'ga-mbtn'; b.setAttribute('role', 'menuitem');
      b.setAttribute('data-action', id); b.textContent = label;
      b.addEventListener('click', () => ghostAction(id));
      m.appendChild(b);
    }
    m.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    document.body.appendChild(m);
    // dock above the floating ghost
    try {
      const f = document.getElementById('gaFloat');
      const vw = window.innerWidth || 360;
      m.style.right = '14px';
      if (f) {
        const r = f.getBoundingClientRect();
        m.style.bottom = Math.max(86, (window.innerHeight || 640) - r.top + 12) + 'px';
      } else m.style.bottom = '86px';
      m.style.maxWidth = Math.min(300, vw - 28) + 'px';
    } catch {}
    try { const b = m.querySelector('button'); if (b) b.focus({ preventScroll: true }); } catch {}
  }
  /* rebuild whatever is open in the new language; confirm briefly if voice is on */
  function refreshOpen() {
    try {
      closeMenu();
      hydrateExplain();
      const l = SL();
      if (_shownLang !== null && _shownLang === l) return;
      _shownLang = l;
      let spoke = false;
      if (_teach) {
        renderTeach(false);
        // re-speak the current instruction in the new language, not the old audio
        if (voiceOn()) {
          try {
            const s = _teach.steps[_teach.i];
            const msg = s.text || t(GUIDE_TEXT[s.key]);
            if (msg) { say(msg); spoke = true; }
          } catch {}
        }
      }
      else if (document.getElementById('gaPanel')) { try { openPanel(); } catch {} }
      else if (document.getElementById('gaModal') && _step) {
        const k = _step[0], a = _step[1];
        if (k === 'wel') stepWelcome();
        else if (k === 'voi') stepVoiceAsk();
        else if (k === 'lang') stepLang(a);
      }
      if (!spoke && !_selfLang && voiceOn()) { try { say(t('langChanged')); } catch {} }
    } catch {}
    _selfLang = false;
  }

  /* ── results nudge (observes, never interferes) ── */
  function watchResults() {
    const ev = document.querySelector('.ev-list');
    if (!ev || ev.dataset.gaWatched) return;
    ev.dataset.gaWatched = '1';
    let announced = false;
    new MutationObserver(() => {
      if (announced || !ev.children.length) return;
      announced = true;
      const f = document.getElementById('gaFloat');
      if (!f || document.getElementById('gaPanel')) return;
      const n = el(`<span class="ga-nudge" aria-hidden="true"></span>`);
      f.appendChild(n);
      setTimeout(() => { try { n.remove(); } catch {} }, 30000);
      // results milestone, spoken only if voice guidance is on — never nagging
      try { say(t('m_done')); } catch {}
    }).observe(ev, { childList: true });
  }

  /* ── boot: ghost renders immediately on load — never gated on input/interaction ── */
  function boot() {
    const showNow = () => {
      try {
        // every load starts fresh: greeted sessions minimize, everything else
        // begins at the Welcome → language → voice onboarding (no "welcome back")
        if (sessDone()) { showFloat(); try { setTimeout(() => maybeOfferGuide(), 800); } catch {} }
        else stepWelcome();
      } catch { try { showFloat(); } catch {} }
      /* whatever just rendered is in the current language — later
         announcements of the same language must not rebuild it */
      try { _shownLang = SL(); } catch {}
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showNow);
    else showNow();
    bindTeach();
    hydrateExplain();
    document.addEventListener('focusin', trackTarget);
    document.addEventListener('click', trackTarget, true);
    // one-tap contextual explain: never navigate a parent card/link
    document.addEventListener('click', (e) => {
      try {
        const b = e.target && e.target.closest ? e.target.closest('[data-explain]') : null;
        if (!b) return;
        e.preventDefault();
        e.stopPropagation();
        const k = b.getAttribute('data-explain');
        if (k) explainKey(k);
      } catch {}
    }, true);
    try { ensureGhostLang(); } catch {}
    // investigation-start milestone for any page button carrying data-ghost-start
    document.addEventListener('click', (e) => {
      try {
        const b = e.target && e.target.closest ? e.target.closest('[data-ghost-start]') : null;
        if (b) say(t('m_start'));
      } catch {}
    });
    // voice follows the user: focusing a guided input speaks its instruction once
    // per session (voice-on only) — the same translated string as the bubble
    document.addEventListener('focusin', (e) => {
      try {
        const el = e.target && e.target.closest ? e.target.closest('[data-ghost-say]') : null;
        if (!el) return;
        const k = el.getAttribute('data-ghost-say');
        if (!k || !/^[a-z_]+$/.test(k)) return;
        if (!voiceOn()) return;
        const flag = 'gw_said_' + k;
        if (sessionStorage.getItem(flag) === '1') return;
        const msg = t(k);
        if (!msg || msg === k) return;
        sessionStorage.setItem(flag, '1');
        say(msg);
      } catch {}
    });
    // the ghost subscribes to the global language — never a stale private copy
    window.addEventListener('gw-lang', () => {
      try { stopV(); } catch {}
      try { ensureGhostLang(); } catch {}
      clearTimeout(_lrT); _lrT = setTimeout(() => { try { refreshOpen(); } catch {} }, 350);
    });
    // teacher callouts from pages (e.g. decoded-QR result): { el: selector, key } or { el, text }
    window.addEventListener('gw-teach', (e) => {
      try {
        const d = (e && e.detail) || {};
        const elx = typeof d.el === 'string' ? document.querySelector(d.el) : d.el;
        if (!elx) return;
        markOffered();
        openTeach([{ key: d.key || null, el: elx, text: d.text || null }], 0, false);
      } catch {}
    });
    watchResults();
    setInterval(watchResults, 3000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  /* warm the server TTS cache with fixed prompts (exact translated strings, all
     languages) so repeated guidance plays instantly without regenerating audio */
  try {
    const warmKeys = ['welcomeV', 'voiceQ', 'allSet', 'whichLang', 'hear', 'replay',
      'guideOffer', 'g_check', 'g_walk', 'g_qr', 'g_trusted', 'g_paid',
      'g_check_go', 'g_walk_go', 'g_qr_go', 'g_trusted_go', 'g_paid_go', 'g_qr_img', 'g_qr_found',
      'm_start', 'm_done', 'langChanged'];
    setTimeout(async () => {
      try {
        if (typeof ttsAvailable === 'undefined' || !(await ttsAvailable())) return;
        const items = [];
        // prewarm exactly what will be spoken (speech-safe form), current language first
        const sayForm = (s) => { try { if (typeof speechText !== 'undefined') return speechText(s); } catch {} return s; };
        // current language first so its audio is cached before the 24-item cap
        const codes = Object.keys(G).sort((a, b) => (a === SL() ? -1 : b === SL() ? 1 : 0));
        for (const code of codes) {
          const g = G[code] || {};
          for (const k of warmKeys) {
            const s = g[k];
            if (typeof s === 'string' && s.trim() && !/\{lang\}/.test(s)) items.push({ text: sayForm(s).slice(0, 300), lang: code });
          }
        }
        if (!items.length) return;
        await fetch('/api/tts/prewarm', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: items.slice(0, 24) }),
        }).catch(() => {});
      } catch {}
    }, 4000);
  } catch {}
})();
