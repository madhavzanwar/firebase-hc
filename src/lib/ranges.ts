import { normalisePunctuation, parseNumber } from './numbers';

/**
 * A reference range. Either bound may be missing ("< 200" has only `high`).
 * Bounds are inclusive unless the `*Exclusive` flag is set ("< 200" means
 * 200 itself is outside the range).
 */
export interface ReferenceRange {
  low?: number;
  high?: number;
  lowExclusive?: boolean;
  highExclusive?: boolean;
  /** The original text, kept for display. */
  text: string;
}

const NUM = String.raw`[+-]?(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?|[+-]?\.\d+`;

/** Words labs put in front of a range ("Normal: 70-100", "Desirable < 200", "सामान्य", "संदर्भ"). */
const LEADING_LABEL =
  /^(?:ref(?:erence)?\.?\s*(?:range|interval|value)?s?|bio\.?\s*ref\.?\s*(?:range|interval)?|normal(?:\s*range)?|desirable|optimal|adults?|range|सामान्य(?:\s*श्रेणी)?|संदर्भ(?:\s*मूल्य|\s*श्रेणी)?|सामान्य\s*पातळी|सामान्य\s*मर्यादा)\s*[:=-]?\s*/i;

/**
 * Parse a reference range string, for example:
 *   "13.0 - 17.0", "13–17", "4,000 - 11,000", "< 200", "<=5.6", "> 40",
 *   "up to 40", "upto 5.0", "Less than 150", "More than 60", "0.4 to 4.0",
 *   "Normal: 70-100 mg/dL", "(150-410)", "१३ - १७".
 * Returns undefined if no usable range was found.
 */
export function parseRange(raw: string | undefined | null): ReferenceRange | undefined {
  if (!raw) return undefined;
  const text = raw.trim();
  let s = normalisePunctuation(text)
    .replace(/[()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Strip leading labels, possibly repeated ("Ref. Range: Normal: 70 - 100").
  for (let i = 0; i < 3; i++) {
    const before = s;
    s = s.replace(LEADING_LABEL, '');
    if (s === before) break;
  }

  const between = new RegExp(String.raw`^(${NUM})\s*(?:-|to|से|ते)\s*(${NUM})`, 'i').exec(s);
  if (between?.[1] && between[2]) {
    const low = parseNumber(between[1]);
    const high = parseNumber(between[2]);
    if (low !== undefined && high !== undefined && low <= high) return { low, high, text };
  }

  const upper = new RegExp(
    String.raw`^(?:(<=|<|less than|below|up\s*to|upto|till|पर्यंत|से कम|कमी)\s*)(${NUM})`,
    'i',
  ).exec(s);
  if (upper?.[2]) {
    const high = parseNumber(upper[2]);
    const op = (upper[1] ?? '').toLowerCase();
    if (high !== undefined) {
      const exclusive = op === '<' || op === 'less than' || op === 'below' || op === 'से कम' || op === 'कमी';
      return exclusive ? { high, highExclusive: true, text } : { high, text };
    }
  }

  const lower = new RegExp(String.raw`^(?:(>=|>|more than|greater than|above|over|से अधिक|पेक्षा जास्त)\s*)(${NUM})`, 'i').exec(s);
  if (lower?.[2]) {
    const low = parseNumber(lower[2]);
    const op = (lower[1] ?? '').toLowerCase();
    if (low !== undefined) {
      return op === '>=' ? { low, text } : { low, lowExclusive: true, text };
    }
  }

  // Trailing comparator words: "40 or less", "60 and above".
  const trailing = new RegExp(String.raw`^(${NUM})\s*(or less|and below|or below|or more|and above|or above)`, 'i').exec(s);
  if (trailing?.[1] && trailing[2]) {
    const n = parseNumber(trailing[1]);
    if (n !== undefined) return /less|below/i.test(trailing[2]) ? { high: n, text } : { low: n, text };
  }
  return undefined;
}

/** Position of a value relative to a range. */
export type RangePosition = 'below' | 'within' | 'above';

export function positionInRange(value: number, range: ReferenceRange): RangePosition {
  if (range.low !== undefined) {
    if (range.lowExclusive ? value <= range.low : value < range.low) return 'below';
  }
  if (range.high !== undefined) {
    if (range.highExclusive ? value >= range.high : value > range.high) return 'above';
  }
  return 'within';
}

/** Human-readable range, e.g. "13–17", "< 200", "≥ 40". */
export function formatRange(range: ReferenceRange): string {
  const f = (n: number) => String(n);
  if (range.low !== undefined && range.high !== undefined) return `${f(range.low)}–${f(range.high)}`;
  if (range.high !== undefined) return `${range.highExclusive ? '<' : '≤'} ${f(range.high)}`;
  if (range.low !== undefined) return `${range.lowExclusive ? '>' : '≥'} ${f(range.low)}`;
  return range.text;
}
