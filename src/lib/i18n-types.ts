export const LANGS = ['en', 'hi', 'mr'] as const;
export type Lang = (typeof LANGS)[number];

/** A string in every supported language. */
export type L10n = Record<Lang, string>;

export const LANG_LABELS: Record<Lang, { native: string; english: string; bcp47: string }> = {
  en: { native: 'English', english: 'English', bcp47: 'en-IN' },
  hi: { native: 'हिन्दी', english: 'Hindi', bcp47: 'hi-IN' },
  mr: { native: 'मराठी', english: 'Marathi', bcp47: 'mr-IN' },
};

export function isLang(x: unknown): x is Lang {
  return typeof x === 'string' && (LANGS as readonly string[]).includes(x);
}
