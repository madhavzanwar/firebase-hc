import type { Page, Request } from '@playwright/test';

/**
 * Test doubles for the two inference back ends:
 *  - a fake Chrome Prompt API (`window.LanguageModel`), so the REAL Firebase AI
 *    Logic SDK takes its on-device path;
 *  - a fake Firebase AI Logic endpoint (firebasevertexai.googleapis.com), so the
 *    SDK's cloud path runs without network.
 * Every cloud request body is recorded so tests can assert no identifiers leak.
 */

export interface NanoOptions {
  /** 'available' | 'downloadable' | 'unavailable' */
  status?: string;
  /** Output languages Nano supports. */
  langs?: string[];
}

export async function installFakeNano(page: Page, opts: NanoOptions = {}) {
  await page.addInitScript(({ status, langs }) => {
    const calls: Array<{ text: string; hasImage: boolean; outLang?: string }> = [];
    (window as unknown as { __nanoCalls: typeof calls }).__nanoCalls = calls;
    const langOf = (o: { expectedOutputs?: Array<{ languages?: string[] }> } | undefined) => o?.expectedOutputs?.[0]?.languages?.[0] ?? 'en';
    const respond = (text: string, hasImage: boolean) => {
      if (/protect patient privacy/.test(text)) return JSON.stringify({ entities: [{ text: 'Shanti Kunj', type: 'ADDRESS' }] });
      if (hasImage)
        return JSON.stringify({
          kind: 'lab',
          sex: 'female',
          age: 34,
          date: '14/02/2026',
          rows: [
            { name: 'Haemoglobin', value: '9.8', unit: 'g/dL', range: '12.0 - 15.5' },
            { name: 'Total RBC Count', value: '3.6', unit: 'million/cumm', range: '3.8 - 4.8' },
            { name: 'MCV', value: '74', unit: 'fL', range: '83 - 101' },
            { name: 'Platelet Count', value: '2.4', unit: 'lakh/cumm', range: '1.5 - 4.1' },
          ],
          medicines: [],
        });
      if (/Extract every test result/.test(text)) return JSON.stringify({ kind: 'other', rows: [], medicines: [] });
      if (/questions this patient could ask/.test(text)) return JSON.stringify({ questions: ['NANO-Q1: What is causing my low haemoglobin?', 'NANO-Q2: Do I need iron tests?'] });
      if (/Answer the patient's question/.test(text)) return 'NANO-ANSWER: Low haemoglobin usually means anaemia. Please ask your doctor.';
      return 'NANO-SUMMARY: Your haemoglobin is low, which is called anaemia. Talk to your doctor about iron tests.';
    };
    (window as unknown as { LanguageModel: unknown }).LanguageModel = {
      async availability(o?: { expectedOutputs?: Array<{ languages?: string[] }> }) {
        if (status !== 'available') return status;
        return langs.includes(langOf(o)) ? 'available' : 'unavailable';
      },
      async create(o?: { expectedOutputs?: Array<{ languages?: string[] }> }) {
        return {
          async prompt(messages: Array<{ content: Array<{ type: string; value: unknown }> }>) {
            const parts = messages.flatMap((m) => m.content);
            const text = parts.filter((p) => p.type === 'text').map((p) => String(p.value)).join('\n');
            const hasImage = parts.some((p) => p.type === 'image');
            calls.push({ text, hasImage, outLang: langOf(o) });
            await new Promise((r) => setTimeout(r, 150));
            return respond(text, hasImage);
          },
          promptStreaming() {
            throw new Error('not used');
          },
          destroy() {},
        };
      },
    };
  }, { status: opts.status ?? 'available', langs: opts.langs ?? ['en'] });
}

export interface CloudLog {
  bodies: string[];
  urls: string[];
}

function cloudReply(body: string): string {
  if (/protect patient privacy/.test(body)) return JSON.stringify({ entities: [] });
  if (/Extract every test result/.test(body))
    return JSON.stringify({
      kind: 'lab',
      sex: 'female',
      rows: [
        { name: 'Haemoglobin', value: '9.8', unit: 'g/dL', range: '12.0 - 15.5' },
        { name: 'MCV', value: '74', unit: 'fL', range: '83 - 101' },
      ],
      medicines: [],
    });
  if (/questions this patient could ask/.test(body)) return JSON.stringify({ questions: ['CLOUD-Q1: Why is my potassium high?', 'CLOUD-Q2: Should I stop any medicine?'] });
  if (/Answer the patient's question/.test(body)) return 'CLOUD-ANSWER: Please discuss this with your doctor.';
  if (/helping a patient understand a long or complex report/.test(body)) return '## What stands out\n- CLOUD-DEEP: kidney markers are raised together.';
  if (/in Hindi/.test(body)) return 'CLOUD-SUMMARY-HI: आपका हीमोग्लोबिन कम है। डॉक्टर से बात करें।';
  if (/in Marathi/.test(body)) return 'CLOUD-SUMMARY-MR: तुमचे हिमोग्लोबिन कमी आहे. डॉक्टरांशी बोला.';
  return 'CLOUD-SUMMARY: Some results are outside the normal range. Please talk to your doctor.';
}

export async function mockCloud(page: Page): Promise<CloudLog> {
  const log: CloudLog = { bodies: [], urls: [] };
  await page.route('**/firebasevertexai.googleapis.com/**', async (route, req: Request) => {
    const body = req.postData() ?? '';
    log.bodies.push(body);
    log.urls.push(req.url());
    const text = cloudReply(body);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP', index: 0 }] }),
    });
  });
  // Other Firebase endpoints (installations, Remote Config, App Check) are not needed in tests.
  for (const host of ['firebaseinstallations.googleapis.com', 'firebaseremoteconfig.googleapis.com', 'content-firebaseappcheck.googleapis.com', 'identitytoolkit.googleapis.com', 'firestore.googleapis.com']) {
    await page.route(`**/${host}/**`, (route) => route.abort());
  }
  return log;
}

export async function nanoCalls(page: Page): Promise<Array<{ text: string; hasImage: boolean; outLang?: string }>> {
  return page.evaluate(() => (window as unknown as { __nanoCalls: Array<{ text: string; hasImage: boolean; outLang?: string }> }).__nanoCalls ?? []);
}
