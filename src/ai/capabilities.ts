import type { Lang } from '../lib/i18n-types';
import type { NanoStatus } from '../lib/routing';

/**
 * Probe Chrome's built-in model (Gemini Nano) WITHOUT calling it, using the
 * same createOptions the Firebase AI Logic SDK will pass. Inference itself
 * always goes through Firebase AI Logic; this is only the availability check
 * that drives LabLens's privacy routing and status chip.
 */

interface LanguageModelStatic {
  availability(options?: unknown): Promise<string>;
}

function languageModel(): LanguageModelStatic | undefined {
  return (globalThis as unknown as { LanguageModel?: LanguageModelStatic }).LanguageModel;
}

export function hasPromptApi(): boolean {
  return typeof languageModel()?.availability === 'function';
}

export function createOptionsFor(outputLang: Lang, withImage = false) {
  return {
    expectedInputs: [{ type: 'text' as const, languages: ['en'] }, ...(withImage ? [{ type: 'image' as const }] : [])],
    expectedOutputs: [{ type: 'text' as const, languages: [outputLang] }],
  };
}

export async function probeNano(extraLangs: Lang[] = []): Promise<{ status: NanoStatus; langs: Lang[]; image: boolean }> {
  const lm = languageModel();
  if (!lm) return { status: 'no_api', langs: [], image: false };
  const langs: Lang[] = [];
  let status: NanoStatus;
  let image = false;
  try {
    const en = (await lm.availability(createOptionsFor('en'))) as NanoStatus;
    status = en;
    if (en === 'available') langs.push('en');
    try {
      image = (await lm.availability(createOptionsFor('en', true))) === 'available';
    } catch {
      image = false;
    }
    // Only probe languages Remote Config says to try: Chrome logs an error for unsupported ones.
    for (const l of extraLangs.filter((x) => x !== 'en')) {
      try {
        if ((await lm.availability(createOptionsFor(l))) === 'available') langs.push(l);
      } catch {
        /* language not supported on-device */
      }
    }
  } catch {
    status = 'unavailable';
  }
  return { status, langs, image };
}
