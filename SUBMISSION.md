# Devpost submission: LabLens

## Title
**LabLens: Private Lab Report Explainer**

## Tagline
Understand your lab report and prescription in English, हिन्दी or मराठी. Gemini Nano removes your identity on-device, and the cloud only ever sees redacted data.

## Platform to select
**Web (Chrome)**: Gemini Nano via the Firebase AI Logic web SDK (hybrid inference).

## Links
- **Live app:** `LIVE_URL` (Firebase Hosting)
- **Code repository:** https://github.com/madhavzanwar/firebase-hc (Apache-2.0)
- **Demo video:** `YOUTUBE_URL` (public, under 3 minutes, English)

---

## Inspiration

In India, a lab report usually reaches the patient before the doctor sees it, as a WhatsApp photo or a printout full of "TLC", "SGPT" and "HbA1c" with ranges in fine print. Most people would rather read it in Hindi, Marathi or another Indian language. The quickest help today is to paste the photo into a chatbot, and that photo carries the patient's name, mobile number, address and hospital or Aadhaar ID right above their health data.

We wanted the convenience of an AI explainer without handing anyone your identity. Hybrid inference is the first time a web app can do that properly: the sensitive step runs on the device, and the cloud is used only for what the device can't do.

## What it does

LabLens takes a PDF, a photo, the camera or pasted text, and:

1. **Removes personal details on the device.** Gemini Nano (Firebase AI Logic, `ONLY_ON_DEVICE`) proposes the names and addresses it finds. Deterministic rules mask Indian mobile and landline numbers, Aadhaar, ABHA, PAN, email, UHID/lab IDs, honorific names and labelled fields in English, Hindi and Marathi. Raw text **never** goes to the cloud.
2. **Reads the values.** pdf.js reads text PDFs locally. Photos are read by Gemini Nano's multimodal input. If Nano isn't available, a photo goes to Gemini in the cloud **only after the user blacks out personal details on a masking canvas and ticks consent**.
3. **Flags every value with tested code, not AI.**
   - Each value is compared with the report's own range. The code understands formats like lakh/cumm and 10³/µL, and adds clinical bands such as HbA1c prediabetes.
   - Each value is flagged normal, borderline, low, high or critical, with colour, an icon, text and a range bar.
   - Critical values raise an urgent "see a doctor today / call 108" banner.
4. **Explains in plain language.**
   - Every value has a localised explanation and a "Talk to your doctor about…" line. These come from a curated knowledge base of 33 common tests and work **offline in all three languages**.
   - Gemini Nano writes the narrative summary and answers follow-up questions on the device.
   - Nano doesn't support Hindi or Marathi yet, so narrative text in those languages comes from Gemini in the cloud, using only **minimised findings** (test name, value, unit, range, flag).
5. **Goes further in the cloud.** A doctor-question checklist runs `PREFER_IN_CLOUD`, so it still works offline on Nano. A deep multi-page pattern analysis runs on redacted text.
6. **Decodes prescriptions.** `1-0-1`, OD/BD/TDS/HS/SOS, before or after food, and the duration become a plain schedule.
7. **Shows its work.** Every answer has a **"Processed on device / in cloud / LabLens rules"** badge. A **privacy log** shows the exact payload of every cloud call. An **"On-device only"** switch guarantees nothing leaves the device, and LabLens still explains the report with its rules.
8. **Remembers.** History is kept on the device in IndexedDB, with a **trend chart** for repeated tests such as HbA1c (7.6 → 7.0 → 6.4). Optional **Google sign-in** syncs redacted structured results to **Firestore**, protected by owner-only rules.

It is an installable, offline-capable PWA. It scores Lighthouse Accessibility 100, has 0 axe WCAG 2.1 AA violations, and is fully keyboard and screen-reader accessible.

**Value proposition:** patients get a private, multilingual first explanation of their report and a better conversation with their doctor. Raw health records and identities stay on the device by default, which fits the spirit of India's DPDP Act.

## How we built it

- **Firebase AI Logic, web SDK 13.3** (`firebase/ai`):
  - `getGenerativeModel(ai, { mode, inCloudParams, onDeviceParams })` with all four inference modes, each chosen per task by a pure, unit-tested **privacy router** (`src/lib/routing.ts`).
  - `initializeDeviceModel()` runs on a user gesture, with download progress.
  - `inferenceSource` drives the badges and the privacy log.
  - Structured output uses `Schema` plus `responseConstraint` (on-device) and `responseSchema` (cloud), validated with Zod.
  - Multimodal photo reading is done on-device.
  - Cloud models: `gemini-3.5-flash-lite` and `gemini-3.8-flash`.
- **App Check** with reCAPTCHA Enterprise, which AI Logic requires.
- **Remote Config** switches the cloud models, the hybrid mode, the on-device size budget, cloud image reading and the extra Nano languages without a redeploy.
- **Firebase Auth** (Google), **Firestore** and **Hosting**.
- **The rest of the stack:**
  - Vite, React 19, TypeScript (strict) and Tailwind 4.
  - pdf.js, i18next, Recharts, idb, and Workbox via vite-plugin-pwa.
  - Self-hosted Noto Sans Devanagari.
- **Quality gates:**
  - **158 Vitest unit tests**, including 11 synthetic EN/HI/MR fixtures and an exhaustive proof that "on-device only" never routes to the cloud.
  - **9 Playwright e2e tests.** A fake Chrome Prompt API drives the *real* SDK's on-device path, the cloud endpoint is mocked, and **every cloud request body is checked for 17 personal identifiers**.
  - axe-core WCAG scans and Lighthouse.
  - A GitHub Actions workflow runs all the gates and deploys to Firebase Hosting.

## Challenges we ran into

- **No Hindi or Marathi on-device.** Chrome's Prompt API accepts en/ja/es/de/fr only. We redesigned the product so the critical content (flags, explanations, urgent warnings, prescriptions) is deterministic and translated by LabLens itself. Only the narrative uses the cloud, and only on minimised data. A Remote Config flag (`nano_extra_langs`) switches Hindi and Marathi to on-device as soon as Chrome supports them.
- **A silent cloud fallback.** Reading the SDK source, we found that when `window.LanguageModel` doesn't exist, even `ONLY_ON_DEVICE` requests go to the cloud. For a privacy app that is unacceptable, so the engine refuses on-device-only calls itself when the Prompt API is missing.
- **Testing hybrid AI in CI.** Headless CI has no Gemini Nano, so we wrote a faithful fake of the Prompt API. That way the e2e tests exercise the SDK's real routing (`isAvailable`, `inferenceSource`) on both paths.
- **Indian report formats.** Devanagari digits, `1,50,000`, `lakh/cumm`, "Up to 45", single-spaced versus column layouts, and labels like `रुग्णाचे नाव` all needed careful parsing and tests.
- **Images can't be regex-redacted.** We added a masking canvas and per-image consent rather than pretending OCR redaction is perfect.

## Accomplishments that we're proud of

- A privacy model we can **prove**:
  - an exhaustive routing test;
  - e2e assertions that no identifier reaches any cloud request;
  - zero cloud calls in on-device-only, declined-consent and offline runs;
  - a user-visible log of exactly what was sent.
- The AI explains but **never decides** a flag: medical flags come from tested code.
- Everything that matters works **offline in three languages**.
- Lighthouse 100 for accessibility, best practices and SEO, and 0 WCAG AA violations.

## What we learned

- Hybrid isn't only "on-device when available". The interesting design work is deciding *per task* what may leave the device, and making that decision visible.
- `inferenceSource` and the four inference modes are enough to build an honest, explainable privacy UX.
- Small on-device models are excellent for privacy-preserving pre-processing such as entity detection, which makes the cloud model safer to use.

## What's next

- An **Android app** with Firebase AI Logic hybrid (Gemini Nano via ML Kit), sharing the same tested core logic.
- On-device Hindi and Marathi once Nano supports them (already wired to Remote Config).
- More Indian languages (Tamil, Bengali, Gujarati) and more tests (thyroid antibodies, lipid ratios, paediatric ranges).
- A "share with my doctor" PDF made of redacted results plus the question checklist.
- A clinician review of the knowledge base with partner labs.

## Built with
`firebase-ai-logic` · `gemini-nano` · `gemini` · `chrome-built-in-ai` · `firebase-app-check` · `recaptcha-enterprise` · `firebase-remote-config` · `firebase-authentication` · `cloud-firestore` · `firebase-hosting` · `typescript` · `react` · `vite` · `tailwindcss` · `pdf.js` · `i18next` · `zod` · `recharts` · `indexeddb` · `pwa` · `workbox` · `vitest` · `playwright` · `axe-core` · `lighthouse` · `github-actions`

## What was built during the submission period
LabLens is a **new project**. All of it was built during the submission period (11–30 Nov 2026); the repository's first commit is on 12 Nov 2026:
- the redaction, range-parsing, classification, prescription and routing engines, with 158 tests;
- the EN/HI/MR knowledge base and UI translations;
- the Firebase AI Logic hybrid engine, with App Check, Remote Config, Auth, Firestore and Hosting;
- the PWA UI, the 11 synthetic fixtures, the e2e suite, the CI/CD and all the documentation.

There is no pre-existing app and no prior public usage. Third-party libraries and the samples we studied are disclosed in [CREDITS.md](CREDITS.md).

## Judge test steps
No login is needed. All the sample documents are synthetic.

1. **Cloud fallback (any browser):**
   1. Open `LIVE_URL` and click the **"Kidney panel (urgent value)"** sample.
   2. You should see a red urgent banner for potassium, flags on every value, and a **"Processed in cloud"** summary badge.
   3. Under **"What was removed before AI"**, click *View the redacted text* to see the `[NAME]` and `[PHONE]` placeholders.
   4. Click **हिन्दी** or **मराठी**. The explanations switch at once.
   5. Open **Privacy log** and expand *Exactly what was sent*.
2. **On-device (desktop Chrome 139+):**
   1. Set `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` to *Enabled*, and if needed `chrome://flags/#optimization-guide-on-device-model` to *Enabled BypassPerfRequirement*. Restart Chrome.
   2. In LabLens, click **"Enable on-device AI"** and wait for *Gemini Nano ready on this device*.
   3. Click the **"Blood count (anaemia)"** photo sample. Every step and the summary show **"Processed on device"**, and the Privacy log shows *Stayed on this device*.
   4. Optional: turn Wi-Fi off and upload `public/samples/mr-cbc-dengue.txt`. It works offline.
3. **Privacy switch:** turn on **"On-device only"** and analyse any sample. No request leaves the browser (check the DevTools Network tab), and the summary carries the *LabLens rules* badge.
4. **History:** open **History** and click *Load the sample diabetes series* to see the HbA1c trend.

App Check is enforced with reCAPTCHA Enterprise on the hosted domain, so no debug token is needed for judges.
