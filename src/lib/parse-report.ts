import type { LabRow, Sex } from './classify';
import { matchTest } from './match';
import { normalisePunctuation } from './numbers';
import { parseRange } from './ranges';
import { parseMedicineLine, parsePrescription, type Medicine } from './rx';

export type DocKind = 'lab' | 'prescription' | 'mixed' | 'unknown';

export interface ParsedDocument {
  kind: DocKind;
  rows: LabRow[];
  medicines: Medicine[];
  sex: Sex;
  age?: number;
  /** ISO date (yyyy-mm-dd) of collection or report, if printed. */
  date?: string;
  /** Lab or hospital name line. Not personal; used for display only. */
  title?: string;
}

const VALUE_TOKEN = String.raw`(?:<=|>=|<|>)?\s*[+-]?(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?`;
const FLAG_TOKEN = String.raw`(?:H|L|HH|LL|High|Low|\*|↑|↓)`;
const QUALITATIVE = /^(nil|absent|negative|neg|not detected|trace|present|positive|pos|\+{1,4}|1\+|2\+|3\+|4\+|अनुपस्थित|उपस्थित|नहीं|नकारात्मक|सकारात्मक|आढळले नाही|आढळले|नाही)$/i;

/** Lines that are headers or metadata, never results. */
const SKIP_LINE = /^(test(?:\s*name)?|investigation|parameter|description|result|value|unit|reference|bio\.?\s*ref|page\s*\d|end of report|\*+|-{3,}|जाँच|परीक्षण|चाचणी|निकाल|परिणाम)\b/i;
const META_NAME = /^(age|sex|gender|date|collected|reported|received|registered|sample|specimen|method|remark|note|interpretation|उम्र|आयु|लिंग|वय|दिनांक|तारीख)\b/i;

function splitColumns(line: string): string[] {
  return line
    .split(/\t+|\s{2,}|\s*\|\s*/)
    .map((c) => c.trim())
    .filter(Boolean);
}

/** Try to read one result row from a line of text. */
export function parseLabLine(rawLine: string): LabRow | undefined {
  const line = normalisePunctuation(rawLine).replace(/\s+:\s+|\s*:\s+(?=[<>]?\d)/g, '  ').trim();
  if (!line || SKIP_LINE.test(line)) return undefined;

  // Column layout (most PDFs): name | value [flag] | unit | range
  const cols = splitColumns(line);
  if (cols.length >= 2) {
    const name = cols[0]!;
    if (META_NAME.test(name) || !/[A-Za-zऀ-ॿ]/.test(name)) return undefined;
    const valueCol = cols[1]!;
    const vm = new RegExp(String.raw`^(${VALUE_TOKEN})\s*(${FLAG_TOKEN})?$`, 'i').exec(valueCol);
    if (vm?.[1]) {
      let unit: string | undefined;
      let range: string | undefined;
      const rest = cols.slice(2);
      // A lone flag column right after the value.
      if (rest[0] && new RegExp(String.raw`^${FLAG_TOKEN}$`, 'i').test(rest[0])) rest.shift();
      for (const c of rest) {
        if (!range && parseRange(c)) range = c;
        else if (!unit && !range && !/^\d/.test(c)) unit = c;
        else if (!unit && range && !/^\d/.test(c) && /[a-zµ%/]/i.test(c)) unit = c;
      }
      // "13.0 - 17.0 g/dL" style combined range + unit.
      if (range && !unit) {
        const um = /^(.*?\d)\s+([a-zµ%/^0-9.*×ऀ-ॿ]+(?:\/[a-zµऀ-ॿ.]+)?)$/i.exec(range);
        if (um?.[2] && parseRange(um[1])) {
          range = um[1];
          unit = um[2];
        }
      }
      const row: LabRow = { name, value: vm[1].replace(/\s+/g, '') };
      if (unit) row.unit = unit;
      if (range) row.range = range;
      return row;
    }
    if (QUALITATIVE.test(valueCol) && matchTest(name)) {
      const row: LabRow = { name, value: valueCol };
      if (cols[2] && QUALITATIVE.test(cols[2])) row.range = cols[2];
      return row;
    }
  }

  // Single-spaced layout: "Haemoglobin 11.2 g/dL 13.0-17.0"
  const m = new RegExp(
    String.raw`^(.+?[A-Za-z0-9ऀ-ॿ)\]%])\s*[:-]?\s+(${VALUE_TOKEN})\s*(${FLAG_TOKEN}(?=\s|$))?\s*([^\d\s<>(][^\s(]*)?\s*(.*)$`,
    'i',
  ).exec(line);
  if (m?.[1] && m[2]) {
    const name = m[1].trim();
    if (META_NAME.test(name) || name.length > 60) return undefined;
    // Without a printed range, only accept the row if we recognise the test (avoids "Page 1 of 2").
    const rangeText = m[5]?.trim();
    const hasRange = !!parseRange(rangeText);
    if (!hasRange && !matchTest(name)) return undefined;
    const row: LabRow = { name, value: m[2].replace(/\s+/g, '') };
    if (m[4]) row.unit = m[4];
    if (hasRange && rangeText) row.range = rangeText;
    return row;
  }
  return undefined;
}

const SEX_RE = /(?:sex|gender|लिंग)\s*[:/-]?\s*(male|female|m|f|पुरुष|महिला|स्त्री)(?![a-zऀ-ॿ])/i;
const AGE_SEX_RE = /(?:age\s*\/\s*sex|age\s*\/\s*gender|उम्र\s*\/\s*लिंग|वय\s*\/\s*लिंग)\s*[:-]?\s*(\d{1,3})\s*(?:y(?:ea)?rs?|y|वर्ष)?\s*\/\s*(male|female|m|f|पुरुष|महिला|स्त्री)/i;
const AGE_RE = /(?:age|उम्र|आयु|वय)\s*[:/-]?\s*(\d{1,3})(?!\d)/i;
const DATE_RE =
  /(?:date|collected(?:\s*on)?|collection\s*date|reported(?:\s*on)?|report\s*date|sample\s*date|दिनांक|तारीख)\s*[:/-]?\s*(?:[a-z\s]*?)?(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/i;

function sexOf(raw: string | undefined): Sex {
  if (!raw) return 'unknown';
  const s = raw.toLowerCase();
  if (/^(male|m|पुरुष|पु)/.test(s)) return 'male';
  if (/^(female|f|महिला|स्त्री|म)/.test(s)) return 'female';
  return 'unknown';
}

export function parseDocument(text: string): ParsedDocument {
  const norm = normalisePunctuation(text);
  const lines = norm.split(/\r?\n/);
  const rows: LabRow[] = [];
  for (const l of lines) {
    if (parseMedicineLine(l)) continue;
    const r = parseLabLine(l);
    if (r) rows.push(r);
  }
  const medicines = parsePrescription(norm);

  let sex: Sex;
  let age: number | undefined;
  const as = AGE_SEX_RE.exec(norm);
  if (as) {
    age = Number(as[1]);
    sex = sexOf(as[2]);
  } else {
    sex = sexOf(SEX_RE.exec(norm)?.[1]);
    const am = AGE_RE.exec(norm);
    if (am?.[1]) age = Number(am[1]);
  }

  let date: string | undefined;
  const dm = DATE_RE.exec(norm);
  if (dm?.[1] && dm[2] && dm[3]) {
    const y = dm[3].length === 2 ? 2000 + Number(dm[3]) : Number(dm[3]);
    const d = Number(dm[1]);
    const mo = Number(dm[2]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) date = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  const kind: DocKind =
    rows.length && medicines.length ? 'mixed' : rows.length ? 'lab' : medicines.length ? 'prescription' : 'unknown';
  const title = lines.map((l) => l.trim()).find((l) => /lab|diagnostic|patholog|hospital|clinic|लैब|प्रयोगशाला|पॅथॉलॉजी|रुग्णालय|अस्पताल/i.test(l) && l.length < 80);
  const doc: ParsedDocument = { kind, rows, medicines, sex };
  if (age !== undefined) doc.age = age;
  if (date) doc.date = date;
  if (title) doc.title = title;
  return doc;
}
