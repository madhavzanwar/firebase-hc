# Quality gates

Every gate below is green. The raw outputs are saved in [`docs/qa-artifacts/`](qa-artifacts/), and CI re-runs gates 1–5 on every push (`.github/workflows/ci-deploy.yml`).

| # | Gate | Command | Result | Output |
|---|---|---|---|---|
| 1 | Lint | `npm run lint` | **0 problems** | [lint.txt](qa-artifacts/lint.txt) |
| 2 | Typecheck (strict, `noUncheckedIndexedAccess`) | `npm run typecheck` | **0 errors** | [typecheck.txt](qa-artifacts/typecheck.txt) |
| 3 | Unit tests (Vitest) | `npm test` | **158 / 158 passed**, 8 files | [unit.txt](qa-artifacts/unit.txt) |
| 4 | Production build + PWA service worker | `npm run build` | built, 46 precached entries | [build.txt](qa-artifacts/build.txt) |
| 5 | End-to-end (Playwright, Chromium) + axe WCAG 2.1 AA | `npm run e2e` | **9 / 9 passed** | [e2e.txt](qa-artifacts/e2e.txt) |
| 6 | Lighthouse (mobile) + PWA installability | `npm run build && npm run lighthouse` | Perf 99–100 · **A11y 100** · Best practices 100 · SEO 100; manifest, maskable icon, service worker OK | [lighthouse.txt](qa-artifacts/lighthouse.txt), [lighthouse.json](qa-artifacts/lighthouse.json) |

## What the tests cover

### Unit tests: the pure, deterministic core (`src/lib`)

- **Numbers and ranges** (`numbers-ranges.test.ts`): Devanagari digits, lakh grouping (`1,50,000`), and the range forms `13–17`, `< 200`, `Up to 45`, `> 40`, `60 and above` and `Normal: 70-100`. Inclusive and exclusive bounds are checked separately.
- **Classification** (`classify.test.ts`):
  - Test-name matching in English, Hindi and Marathi.
  - The report's own range wins over the default ranges, which are sex-specific.
  - Critical limits are checked after unit scaling, e.g. `0.15 lakh/cumm` is 15,000/µL and therefore critical.
  - Clinical bands: HbA1c prediabetes and vitamin D insufficiency.
  - Qualitative urine results.
  - Every knowledge-base string exists in all three languages.
- **Redaction** (`redact.test.ts`):
  - Labelled fields in all three languages, Indian mobile and landline formats, Aadhaar, ABHA, PAN, email, honorific names and doctors, and names Nano proposes.
  - Lab values, urine pH and test names are never masked, even when the model suggests them.
- **Parsing** (`parse.test.ts`): column and single-spaced lab rows; age, sex and date metadata; and prescription decoding (`1-0-1`, OD/BD/SOS, timing, duration) in three languages.
- **Privacy routing** (`routing.test.ts`):
  - Raw text never goes to the cloud.
  - Images need consent before they go to the cloud.
  - Hindi and Marathi go to the cloud, or fall back to English Nano when the cloud isn't allowed.
  - Long documents go to the cloud.
  - The doctor checklist is cloud-first, with a Nano fallback offline.
  - An **exhaustive test** shows that "on-device only" never routes to the cloud for any task, capability, language or consent combination.
- **Explanations** (`explain.test.ts`): localised explanations, the urgent text, the deterministic summary and checklist, and the minimised cloud payload.
- **Fixtures** (`fixtures.test.ts`): **11 synthetic documents** in `fixtures/` (EN/HI/MR lab reports and prescriptions). For each one the test checks that every identifier is removed, then checks the metadata, every flag, and an explanation for every row in every language.
- **i18n** (`i18n.test.ts`): the Hindi and Marathi UI keys and `{{placeholders}}` match English exactly.

### End-to-end tests (`e2e/`)

Headless CI has no Gemini Nano. `e2e/mocks.ts` installs a **fake Chrome Prompt API** (`window.LanguageModel`), so the **real Firebase AI Logic SDK** takes its on-device path, and it mocks the Firebase AI Logic cloud endpoint. **Every cloud request body is recorded and checked for 17 personal identifiers.**

| Test | Path | Proves |
|---|---|---|
| upload → on-device explanation → Hindi/Marathi switch → history | Nano available | Nano reads the photo on the device and the summary badge says *Processed on device*, with **0 cloud requests**. In Hindi the explanations are localised and the narrative comes from the cloud with **only minimised findings**. Marathi works the same way. The PII in a question is masked before Nano sees it. History and the privacy log are populated |
| trend chart | Nano available | Three reports of the same fictional person → HbA1c trend 7.6 → 7.0 → 6.4 |
| text PDF → cloud summary, urgent banner | **no Nano (fallback)** | Redaction with rules. Potassium 6.8 is flagged critical and the urgent banner shows. The summary, checklist and deep analysis all run in the cloud, with **no identifiers in any request** (only `[NAME]` placeholders). The privacy log shows the exact payload |
| photo needs consent and masking | no Nano | The cloud receives the image only after the user masks it and ticks the consent box |
| declining consent | no Nano | **0 cloud requests** |
| on-device-only mode | no Nano | Rules explain the report and the Marathi summary works with no AI, **0 cloud requests** |
| offline with Nano | Nano, offline | The whole flow runs on the device, and Marathi value explanations work offline |
| a11y (2 tests) | both | **axe-core finds 0 WCAG 2.1 AA violations** on the home, report (EN + HI), history, privacy and help pages and the consent dialog. Escape closes the dialog |

## Manual verification on a real device (Gemini Nano)

These need a desktop Chrome with Gemini Nano, which CI can't provide. The steps are in [SUBMISSION.md](../SUBMISSION.md#judge-test-steps) and recorded in the demo video. The results will be filled in once the live deployment is checked on a Nano-capable machine.
