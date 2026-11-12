# Research notes (verified 12 Nov 2026)

Everything below was read from the live pages on 12 Nov 2026, not from memory. Where the brief and
the pages disagree, the pages win; those changes are marked **⚠ newer than brief**.

## 1. Hackathon: #BuildHybridAI 2026 (Devpost)

Sources: <https://firebasehybridaihackathon.devpost.com/>, `/rules`, `/resources`.

| Item | Finding |
|---|---|
| Submission period | 11 Nov 2026 1:30 PM PT → **30 Nov 2026 2:00 PM PT** |
| Judging | 10–16 Dec 2026; winners announced around 21 Dec 2026 |
| Prizes | $30,000 total: Grand $10,000; 1st runner-up $7,000; 2nd runner-up $4,000; Best iOS / Android / **Web/Chrome** $3,000 each |
| Platforms | Web (Chrome) or Android with **Gemini Nano 4** via Firebase AI Logic, or iOS with Apple Foundation Models via Firebase AI Logic. Multi-platform is "strongly considered" for the Grand Prize |
| **⚠ AI constraint** | "All of your app's AI inference must go through Firebase AI Logic, so don't call other model APIs directly." So **no Tesseract.js, no Chrome Translator API, no direct Prompt API calls**. Every model call in LabLens goes through `firebase/ai` |
| **App Check** | "Firebase AI Logic requires App Check; debug tokens are accepted in submissions." The AI Logic docs say App Check enforcement is **required from 2 Nov 2026** |
| Repo | Public GitHub/GitLab repo with all source, assets and instructions. Must show Firebase AI Logic **imported and called at runtime**, not just named in the README |
| Licence | Open-source licence file, detectable in the GitHub About section. Apache preferred |
| Video | Up to 3 minutes (only the first 3 are judged), public on YouTube, English or English subtitles, showing the app running on its platform |
| Text description | How Firebase AI Logic is used, features, and the value proposition |
| Existing apps | Allowed if significantly updated; must summarise what was built in the period. *(LabLens is a new project: the repo's first commit is 12 Nov 2026)* |
| Testing access | A link to a working project is "highly encouraged". It must be free, with login details if private. **No production API keys, live cloud project secrets or PII in the repo, form or test instructions** |
| Language | The app must support English at a minimum |
| Tools disclosure | Must disclose pre-existing code or work incorporated (→ CREDITS.md) |
| Judging | Stage 1 pass/fail on completeness. Stage 2 has 4 **equally weighted** criteria, each scored 1–5: Technological Implementation (how well the app uses hybrid inference), Design (a complete product, not a proof of concept), Potential Impact (a real problem for a real audience), Quality of the Idea (creative, non-obvious). Ties are broken in that order |
| Encouraged | Remote Config, Firestore, Authentication, Google IDEs and Firebase Agent Skills (optional) |

## 2. Firebase AI Logic: hybrid inference on the web

Sources: <https://firebase.google.com/docs/ai-logic/hybrid/web/get-started>,
`/configuration-options`, `/generate-structured-output`, `/docs/ai-logic/models`,
`/docs/ai-logic/production-checklist`, `/docs/ai-logic/app-check`, and the type definitions in
`node_modules/@firebase/ai/dist/ai-public.d.ts` (firebase **13.3.0**).

- Import from `firebase/ai`: `getAI`, `getGenerativeModel`, `GoogleAIBackend`, `InferenceMode`,
  `InferenceSource`, `Schema`.
- `getGenerativeModel(ai, { mode, inCloudParams, onDeviceParams })` (`HybridParams`).
  - `InferenceMode`: `PREFER_ON_DEVICE` (`"prefer_on_device"`), `ONLY_ON_DEVICE`, `PREFER_IN_CLOUD`, `ONLY_IN_CLOUD`.
  - `inCloudParams: ModelParams` sets `model`, `generationConfig` (`responseMimeType`, `responseSchema`) and `systemInstruction`.
  - `onDeviceParams: { createOptions: { expectedInputs, expectedOutputs, initialPrompts }, promptOptions: { responseConstraint } }`.
- `result.response.inferenceSource` is `"on_device"` or `"in_cloud"` (SDK 12.5+). LabLens's source badge uses it.
- `model.initializeDeviceModel(progress => …)` must be called **on a user gesture** before prompting. It starts the Nano download.
- The default cloud fallback model is `gemini-3.5-flash-lite` (SDK 13+). Stable models listed: `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-4-argon`. Gemini 2.5 models are deprecated.
- On-device supports **single-turn** text, text plus JPEG/PNG images, and structured output (JSON or enums).
  - It does **not** support chat, PDFs, other image types, tools or URL files.
  - The on-device token limit is **9216**.
  - `systemInstruction` is **not** forwarded to Chrome. LabLens puts its instructions in the prompt text.
- Unsupported requests fall back to the cloud in `PREFER_ON_DEVICE` and throw in `ONLY_ON_DEVICE`.
- **Important SDK behaviour (read from `index.esm.js` `callCloudOrDevice`)**: if `window.LanguageModel` doesn't exist, no Chrome adapter is created, and *every* mode, including `ONLY_ON_DEVICE`, goes **to the cloud**. LabLens therefore checks this itself before every call when the user has chosen "on-device only" (`src/lib/routing.ts`, tested).
- Production checklist: enforce App Check (reCAPTCHA Enterprise on the web), use Remote Config for model names, restrict API keys, set per-user rate limits, set budget alerts, and use stable model names.

## 3. Chrome built-in AI (Gemini Nano, Prompt API)

Sources: <https://developer.chrome.com/docs/ai/prompt-api>, `/get-started`, `/firebase-ai-logic`.

- Chrome **139+ on desktop**: Windows 10/11, macOS 13+, Linux, or ChromeOS (Chromebook Plus).
- **22 GB** of free disk space. Either a GPU with more than 4 GB VRAM, or a CPU with 16 GB RAM and 4+ cores. The model is removed if free space drops below 10 GB.
- Flag in the Firebase docs: `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` → Enabled, then restart Chrome. On builds where the Prompt API isn't enabled by default, also set `chrome://flags/#optimization-guide-on-device-model` → *Enabled BypassPerfRequirement*.
- To check, run `await LanguageModel.availability()` in DevTools. It returns `available`, `downloadable`, `downloading` or `unavailable`.
- **⚠ Languages**: the Prompt API "accepts `en`, `ja`, `es`, `de`, and `fr`". **Hindi and Marathi are not supported on-device.** LabLens's design follows from this:
  - Value-by-value explanations, flags, the urgent banner and prescription decoding are **deterministic and localised**. They work offline in en/hi/mr with no model.
  - Nano writes the English narrative.
  - Hindi/Marathi narrative is produced in the cloud from **redacted, minimised** data. LabLens first probes `LanguageModel.availability({expectedOutputs:[{type:'text',languages:['hi']}]})`, so if a future Nano supports Hindi it is used automatically.

## 4. App Check / Remote Config / Auth / Firestore / Hosting

- **App Check** (web): `initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true })`. For local development, set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before initialising, then register the printed token under *Security → App Check → Apps → ⋮ → Manage debug tokens*. **Never add `localhost` to the reCAPTCHA allowed domains.**
- **Remote Config**: LabLens uses it to switch the cloud model names, the default inference mode, the on-device character budget and cloud OCR on or off, without a redeploy.
- **Auth**: Google sign-in is optional and used only for sync.
- **Firestore**: `users/{uid}/reports/{id}` holds **redacted structured results only**. The rules (`firestore.rules`) allow access to the owner only.
- **Hosting**: SPA rewrite to `/index.html`, with long cache headers for hashed assets.

## 5. Reference projects studied

| Project | What I took | Licence |
|---|---|---|
| [FirebaseExtended/FriendlyMeals-web](https://github.com/FirebaseExtended/friendlymeals-web) | The official AI Logic web pattern: `getAI` + `GoogleAIBackend`, `ReCaptchaEnterpriseProvider` App Check, `Schema.object` structured output, `fileToGenerativePart` | No licence file in the repo; patterns re-implemented from the public docs, no code copied |
| [Stroller15/swasthyadarpan-ai](https://github.com/Stroller15/swasthyadarpan-ai) | Product reference only: "code re-checks the model's flags" and synthetic sample reports. Not a hackathon entrant; no code copied | — |
| firebase/quickstart-android, FriendlyMeals-Android | Read for the Android hybrid API shape (stretch goal only) | Apache-2.0 |
