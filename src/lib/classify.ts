import { parseResultValue, type Comparator } from './numbers';
import { parseRange, positionInRange, type ReferenceRange } from './ranges';
import { matchTest } from './match';
import type { Band, SimpleRange, TestInfo } from './tests-kb';

export type Sex = 'male' | 'female' | 'unknown';

export type Flag = 'normal' | 'borderline' | 'low' | 'high' | 'critical_low' | 'critical_high' | 'abnormal' | 'unknown';

/** One result row as printed on the report (any source: parser, Nano, cloud). */
export interface LabRow {
  name: string;
  value: string;
  unit?: string;
  range?: string;
}

export interface ClassifiedRow extends LabRow {
  testId?: string;
  numeric?: number;
  comparator?: Comparator;
  flag: Flag;
  parsedRange?: ReferenceRange;
  rangeSource: 'report' | 'default' | 'none';
  band?: Band;
  /** Value converted to the knowledge base's unit, used for critical limits and trends. */
  canonicalValue?: number;
}

const SCALES = [1e-3, 1e-2, 0.1, 1, 10, 100, 1000, 1e5, 1e6];

/**
 * Work out the factor that converts the report's numbers into the knowledge
 * base's unit, by comparing the report's range with the default range.
 * For example "1.5 – 4.1 lakh/cumm" against 150000 – 410000 gives 1e5.
 * Falls back to unit keywords, then to 1.
 */
export function inferScale(test: TestInfo, unit: string | undefined, reportRange: ReferenceRange | undefined): number {
  const u = (unit ?? '').toLowerCase().replace(/\s+/g, '');
  if (test.unit === 'mg/dL' && /mmol/.test(u) && test.category === 'diabetes') return 18;
  if (test.unit === '/µL' || test.unit === 'million/µL') {
    if (/lakh|lac/.test(u)) return test.unit === '/µL' ? 1e5 : 0.1;
    if (/10\^?3|10³|thou|x103|k\/|\/nl|×10\^?3|10\*3/.test(u)) return test.unit === '/µL' ? 1000 : 1e-3;
    if (/10\^?6|10⁶|mill|x106|\/pl|10\*6/.test(u)) return test.unit === '/µL' ? 1e6 : 1;
    if (/10\^?9\/l|×10\^?9/.test(u)) return test.unit === '/µL' ? 1000 : 1e-3;
    if (/10\^?12\/l/.test(u)) return 1;
  }
  const def = defaultRange(test, 'unknown');
  const reportRef = reportRange?.high ?? reportRange?.low;
  const defRef = def?.high ?? def?.low;
  if (reportRef && defRef && reportRef > 0 && defRef > 0) {
    let best = 1;
    let bestErr = Infinity;
    for (const s of SCALES) {
      const err = Math.abs(Math.log10((reportRef * s) / defRef));
      if (err < bestErr) {
        bestErr = err;
        best = s;
      }
    }
    if (bestErr < Math.log10(2.5)) return best;
  }
  return 1;
}

export function defaultRange(test: TestInfo, sex: Sex): SimpleRange | undefined {
  const r = test.range;
  if (!r) return undefined;
  if (sex === 'male' && r.male) return r.male;
  if (sex === 'female' && r.female) return r.female;
  return r.any ?? r.male ?? r.female;
}

function bandFor(test: TestInfo, canonical: number): Band | undefined {
  return test.bands?.find((b) => (b.min === undefined || canonical >= b.min) && (b.max === undefined || canonical < b.max));
}

/** Classify a single row. Pure and deterministic: the model never decides the flag. */
export function classifyRow(row: LabRow, sex: Sex = 'unknown'): ClassifiedRow {
  const test = matchTest(row.name);
  const base: ClassifiedRow = { ...row, rangeSource: 'none', flag: 'unknown' };
  if (test) base.testId = test.id;

  // Qualitative results ("Nil", "Trace", "++", "Present").
  if (test?.qualitativeNormal) {
    const v = row.value.trim().toLowerCase();
    if (!v) return base;
    const normal = test.qualitativeNormal.some((w) => v === w || v.startsWith(w));
    return { ...base, flag: normal ? 'normal' : 'abnormal' };
  }

  const parsed = parseResultValue(row.value);
  if (!parsed) return base;
  base.numeric = parsed.value;
  if (parsed.comparator) base.comparator = parsed.comparator;

  let range = parseRange(row.range);
  if (range) base.rangeSource = 'report';
  if (!range && test) {
    const d = defaultRange(test, sex);
    if (d) {
      range = { ...d, text: '' };
      base.rangeSource = 'default';
    }
  }
  if (range) base.parsedRange = range;

  const scale = test ? (base.rangeSource === 'default' ? inferScaleNoRange(test, row.unit, parsed.value) : inferScale(test, row.unit, range)) : 1;
  const canonical = parsed.value * scale;
  if (test) base.canonicalValue = round(canonical);

  // "<0.5" style values: below detection, treat as the bound itself.
  let flag: Flag = 'unknown';
  if (range) {
    const pos = positionInRange(parsed.value, range);
    flag = pos === 'below' ? 'low' : pos === 'above' ? 'high' : 'normal';
    if (parsed.comparator === '<' && pos === 'within' && range.low !== undefined && parsed.value <= range.low) flag = 'low';
  }

  if (test) {
    const band = bandFor(test, canonical);
    if (band) {
      base.band = band;
      if (flag === 'normal' && band.level === 'borderline') flag = 'borderline';
      if ((flag === 'normal' || flag === 'unknown') && band.level === 'high') flag = 'high';
      if ((flag === 'normal' || flag === 'unknown') && band.level === 'low') flag = 'low';
    }
    const c = test.critical;
    if (c?.low !== undefined && canonical < c.low && parsed.comparator !== '>') flag = 'critical_low';
    if (c?.high !== undefined && canonical > c.high && parsed.comparator !== '<') flag = 'critical_high';
  }
  base.flag = flag;
  return base;
}

/** Without a printed range, guess the scale from the value's magnitude against the default range. */
function inferScaleNoRange(test: TestInfo, unit: string | undefined, value: number): number {
  const byUnit = inferScale(test, unit, undefined);
  if (byUnit !== 1) return byUnit;
  const d = defaultRange(test, 'unknown');
  const mid = d?.low !== undefined && d.high !== undefined ? (d.low + d.high) / 2 : (d?.high ?? d?.low);
  if (!mid || value <= 0) return 1;
  // Only rescale counts, where "2.5" (lakh) vs "250000" is a common format difference.
  if (test.unit !== '/µL') return 1;
  let best = 1;
  let bestErr = Infinity;
  for (const s of SCALES) {
    const err = Math.abs(Math.log10((value * s) / mid));
    if (err < bestErr) {
      bestErr = err;
      best = s;
    }
  }
  return best;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function classifyAll(rows: LabRow[], sex: Sex = 'unknown'): ClassifiedRow[] {
  return rows.map((r) => classifyRow(r, sex));
}

export const FLAG_ORDER: Record<Flag, number> = {
  critical_high: 0,
  critical_low: 0,
  high: 1,
  low: 1,
  abnormal: 1,
  borderline: 2,
  unknown: 3,
  normal: 4,
};

export function isCritical(f: Flag): boolean {
  return f === 'critical_high' || f === 'critical_low';
}

export function isOutOfRange(f: Flag): boolean {
  return f !== 'normal' && f !== 'unknown';
}

/** Sort for display: critical first, then out of range, then normal. Stable. */
export function sortByConcern<T extends { flag: Flag }>(rows: T[]): T[] {
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => FLAG_ORDER[a.r.flag] - FLAG_ORDER[b.r.flag] || a.i - b.i)
    .map((x) => x.r);
}
