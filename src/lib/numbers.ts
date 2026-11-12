/**
 * Number helpers that understand how Indian lab reports write numbers:
 * Devanagari digits (०-९), thousands separators ("1,50,000"), and
 * comparator prefixes ("<0.5").
 */

const DEVANAGARI_ZERO = 0x0966;

/** Convert Devanagari (and Arabic-Indic) digits to ASCII digits. */
export function normaliseDigits(input: string): string {
  return input.replace(/[०-९٠-٩۰-۹]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= DEVANAGARI_ZERO && code <= DEVANAGARI_ZERO + 9) return String(code - DEVANAGARI_ZERO);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return String(code - 0x06f0);
  });
}

/** Normalise typographic dashes, unicode minus and spaces so regexes stay simple. */
export function normalisePunctuation(input: string): string {
  return normaliseDigits(input)
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/\u2264/g, '<=')
    .replace(/\u2265/g, '>=');
}

/**
 * Parse a numeric string such as "1,250", "1,50,000", "12.5", "+3.2", ".5".
 * Returns undefined if the string isn't a plain number.
 */
export function parseNumber(raw: string): number | undefined {
  const s = normalisePunctuation(raw).trim().replace(/\s+/g, '');
  if (!/^[+-]?(\d{1,3}(,\d{2,3})+|\d+)?(\.\d+)?$/.test(s) || s === '' || s === '+' || s === '-') return undefined;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

export type Comparator = '<' | '<=' | '>' | '>=';

export interface ParsedValue {
  value: number;
  /** Set when the lab reported e.g. "<0.5" (below the detection limit). */
  comparator?: Comparator;
}

/** Parse a reported result value, allowing a comparator prefix (e.g. "<0.5", ">= 90"). */
export function parseResultValue(raw: string): ParsedValue | undefined {
  const s = normalisePunctuation(raw).trim();
  const m = /^(<=|>=|<|>)?\s*([+-]?[\d.,]+)$/.exec(s);
  if (!m || !m[2]) return undefined;
  const value = parseNumber(m[2]);
  if (value === undefined) return undefined;
  const comparator = m[1] as Comparator | undefined;
  return comparator ? { value, comparator } : { value };
}

/** Format a number compactly for display, using the Indian digit grouping. */
export function formatNumber(n: number, locale = 'en-IN'): string {
  const abs = Math.abs(n);
  const maximumFractionDigits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(n);
}
