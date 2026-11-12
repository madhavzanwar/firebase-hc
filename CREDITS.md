# Credits and disclosures

LabLens was created from scratch during the #BuildHybridAI 2026 submission period. Its first commit is dated 12 Nov 2026. As the Official Rules require, this file discloses every pre-existing piece of code, sample or work the project uses or learned from.

## AI coding assistance

The project was built with an AI coding assistant (Claude Code), working with the entrant. All code in this repository was written for this project.

## Reference samples and documentation (patterns studied, no code copied)

| Source | What it informed | Licence |
|---|---|---|
| [Firebase AI Logic hybrid inference docs (web)](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started), [configuration options](https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options), [structured output](https://firebase.google.com/docs/ai-logic/hybrid/web/generate-structured-output) | `getGenerativeModel` with `mode` / `inCloudParams` / `onDeviceParams`, `initializeDeviceModel`, `inferenceSource`, `responseConstraint` | Docs: CC BY 4.0; code samples: Apache-2.0 |
| [Firebase AI Logic App Check guide](https://firebase.google.com/docs/ai-logic/app-check) and [production checklist](https://firebase.google.com/docs/ai-logic/production-checklist) | reCAPTCHA Enterprise App Check, debug-token flow, Remote Config for model names | CC BY 4.0 / Apache-2.0 |
| [Chrome Prompt API docs](https://developer.chrome.com/docs/ai/prompt-api) and [Hybrid AI prompting with Firebase AI Logic](https://developer.chrome.com/docs/ai/firebase-ai-logic) | Hardware and flag requirements, `LanguageModel.availability()` options, supported languages | CC BY 4.0 / Apache-2.0 |
| [FirebaseExtended/FriendlyMeals-web](https://github.com/FirebaseExtended/friendlymeals-web) | The official app structure: `getAI` + `GoogleAIBackend`, `ReCaptchaEnterpriseProvider`, `Schema.object` structured output, the `fileToGenerativePart` pattern | Google sample (no licence file at the time of reading); patterns re-implemented from the public docs |
| [firebase/quickstart-android](https://github.com/firebase/quickstart-android) (firebase-ai) and FriendlyMeals-Android | Read to understand the Android hybrid API shape for a possible second platform | Apache-2.0 |
| [Stroller15/swasthyadarpan-ai](https://github.com/Stroller15/swasthyadarpan-ai) | Product reference only: the ideas of letting code re-check model flags and shipping synthetic samples. No code, text or assets used | — |

## Open-source libraries (runtime)

| Library | Use | Licence |
|---|---|---|
| [Firebase JS SDK](https://github.com/firebase/firebase-js-sdk) | AI Logic (hybrid inference), App Check, Remote Config, Auth, Firestore | Apache-2.0 |
| [React](https://react.dev) | UI | MIT |
| [pdf.js (pdfjs-dist)](https://github.com/mozilla/pdf.js) | Local PDF text extraction and scan rasterising | Apache-2.0 |
| [i18next](https://www.i18next.com/) / [react-i18next](https://react.i18next.com/) | UI translations (EN/HI/MR) | MIT |
| [Zod](https://zod.dev) | Validating model JSON output | MIT |
| [Recharts](https://recharts.org) | Trend chart | MIT |
| [idb](https://github.com/jakearchibald/idb) | IndexedDB wrapper | ISC |
| [Lucide](https://lucide.dev) | Icons | ISC |
| [Workbox](https://developer.chrome.com/docs/workbox) via [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | Service worker / offline | MIT |
| [Fontsource](https://fontsource.org): Inter, Noto Sans Devanagari | Self-hosted fonts (offline Devanagari) | SIL OFL 1.1 |

## Tooling

[Vite](https://vite.dev) (MIT), [Tailwind CSS](https://tailwindcss.com) (MIT), [TypeScript](https://www.typescriptlang.org) (Apache-2.0), [ESLint](https://eslint.org) / typescript-eslint (MIT), [Vitest](https://vitest.dev) (MIT), [Playwright](https://playwright.dev) (Apache-2.0), [axe-core](https://github.com/dequelabs/axe-core) / @axe-core/playwright (MPL-2.0), [Lighthouse](https://github.com/GoogleChrome/lighthouse) (Apache-2.0), and [FirebaseExtended/action-hosting-deploy](https://github.com/FirebaseExtended/action-hosting-deploy) (Apache-2.0).

## Medical content

The reference intervals, critical limits and plain-language explanations in `src/lib/tests-kb.ts` were written for LabLens. They summarise widely published adult reference intervals and commonly used laboratory critical-value limits. They are general educational information, not clinical guidance, and a report's own printed range always takes precedence.

## Data

All sample reports and prescriptions in `fixtures/` and `public/samples/` are **synthetic**, with fictional names, numbers and IDs. No real patient data was used anywhere in this project.
