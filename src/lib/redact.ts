import { normaliseDigits } from './numbers';
import { matchTest } from './match';
import { TESTS } from './tests-kb';

/**
 * Deterministic redaction of personal identifiers in report text. This runs
 * on the device before anything can be sent to the cloud. When Gemini Nano
 * is available it also proposes names and addresses (`extraEntities`), and
 * those are masked here too. The model never sees text that leaves the device.
 */

export type PiiType = 'NAME' | 'DOCTOR' | 'PHONE' | 'EMAIL' | 'ADDRESS' | 'ID' | 'DOB';

export interface Finding {
  type: PiiType;
  /** How the identifier was found: a labelled field, a pattern, or the on-device model. */
  via: 'label' | 'pattern' | 'model';
}

export interface RedactionResult {
  text: string;
  findings: Finding[];
}

export const placeholder = (t: PiiType) => `[${t}]`;

/** Label → PII type. Labels match at a line start or after 2+ spaces / a separator. */
const LABELS: Array<[RegExp, PiiType]> = [
  [/(?:patient'?s?\s*name|name\s*of\s*(?:the\s*)?patient|pt\.?\s*name|patient|name|रोगी\s*का\s*नाम|मरीज़?\s*का\s*नाम|रुग्णाचे\s*नाव|रुग्णाचे\s*नांव|नाम|नाव|नांव)/i, 'NAME'],
  [/(?:ref(?:erred)?\.?\s*by(?:\s*dr\.?)?|ref\.?\s*(?:doctor|dr\.?|physician)|referring\s*(?:doctor|physician)|consultant|doctor|treating\s*doctor|सन्दर्भित|संदर्भित\s*डॉक्टर|डॉक्टर)/i, 'DOCTOR'],
  [/(?:address|addr\.?|residence|पता|पत्ता)/i, 'ADDRESS'],
  [/(?:mobile(?:\s*no\.?)?|mob\.?(?:\s*no\.?)?|phone(?:\s*no\.?)?|ph\.(?:\s*no\.?)?|ph\s+no\.?|contact(?:\s*no\.?)?|tel\.?|मोबाइल|मोबाईल|फ़ोन|फोन|संपर्क)/i, 'PHONE'],
  [/(?:e-?mail(?:\s*id)?|ईमेल|ई-मेल)/i, 'EMAIL'],
  [/(?:d\.?o\.?b\.?|date\s*of\s*birth|birth\s*date|जन्म\s*तिथि|जन्मतिथि|जन्मतारीख|जन्म\s*तारीख)/i, 'DOB'],
  [/(?:uhid|mrn|mr\s*no\.?|ip\s*no\.?|op\s*no\.?|opd\s*no\.?|reg(?:istration)?\.?\s*(?:no\.?|id)|patient\s*id|pid|lab\s*(?:no\.?|id)|sample\s*(?:no\.?|id)|barcode(?:\s*no\.?)?|accession\s*(?:no\.?|id)|visit\s*(?:no\.?|id)|aadhaa?r(?:\s*no\.?)?|abha(?:\s*(?:no\.?|number|id))?|pan(?:\s*no\.?)?|policy\s*no\.?|आधार(?:\s*क्रमांक|\s*नंबर)?|रजिस्ट्रेशन\s*नंबर|नोंदणी\s*क्रमांक)/i, 'ID'],
];

/** Labels that legitimately follow a name on the same line ("Name: X   Age: 40"). We stop the value there. */
const NEXT_FIELD = /\s{2,}|\s*[|;]\s*|\s+(?=(?:age|sex|gender|date|collected|reported|received|registered|ref|uhid|mrn|sample|lab|उम्र|आयु|लिंग|वय|दिनांक|तारीख)\b\s*[:/.-]?)/i;

const HONORIFIC = String.raw`(?:[Mm][Rr][Ss]?|[Mm][Ss]|[Mm]iss|MISS|[Mm]st|[Mm]aster|[Bb]aby|[Ss]mt|SMT|[Ss]hri|SHRI|[Ss]hree|[Ss]ri|[Kk]um|[Kk]m|[Dd][Rr])\.?`;
const LATIN_NAME = String.raw`[A-Z][a-zA-Z'’-]+(?:\s+[A-Z]\.?(?![a-zA-Z]))*(?:\s+[A-Z][a-zA-Z'’-]+){0,3}`;
const DEVA_HONORIFIC = String.raw`(?:श्री|श्रीमती|सौ\.?|कु\.|कुमारी|डॉ\.?|श्रीयुत)`;
const DEVA_WORD = String.raw`[ऀ-ॿ]+`;

const PATTERNS: Array<[RegExp, PiiType]> = [
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, 'EMAIL'],
  // ABHA number: 14 digits written 2-4-4-4.
  [/\b\d{2}-\d{4}-\d{4}-\d{4}\b/g, 'ID'],
  // Aadhaar: 12 digits, first digit 2-9, often grouped 4-4-4.
  [/\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g, 'ID'],
  // Indian mobile numbers, optionally +91 / 0 prefixed, optionally split 5-5.
  [/(?:\+91[\s-]?|(?<!\d))0?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g, 'PHONE'],
  // Landline with STD code: 020-2567 8901, (022) 23456789.
  [/\(?\b0\d{2,4}\)?[\s-]\d{3,4}[\s-]?\d{4}\b/g, 'PHONE'],
  // PAN.
  [/\b[A-Z]{5}\d{4}[A-Z]\b/g, 'ID'],
];

const NAME_RE = new RegExp(String.raw`\b${HONORIFIC}\s+${LATIN_NAME}`, 'g');
const DEVA_NAME_RE = new RegExp(String.raw`${DEVA_HONORIFIC}\s*${DEVA_WORD}(?:\s+${DEVA_WORD}){0,2}`, 'g');
/** "Dr. X" is a doctor, everything else a patient name. */
const DR_PREFIX = /^(?:dr\.?|डॉ\.?)/i;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Words that must never be treated as names, even if the model suggests them. */
const NEVER_NAMES = new Set(['report', 'test', 'result', 'blood', 'serum', 'sample', 'patient', 'name', 'doctor', 'normal', 'high', 'low']);

/** Every word used in a test alias ("glucose", "cholesterol"…): never a person's name. */
const ALIAS_WORDS = new Set(TESTS.flatMap((x) => x.aliases.flatMap((a) => a.split(/\s+/))).filter((w) => w.length >= 3));

function isMedicalWord(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((w) => ALIAS_WORDS.has(w) || NEVER_NAMES.has(w));
}

function redactLabelledLine(line: string, findings: Finding[]): string {
  let out = line;
  for (const [label, type] of LABELS) {
    const re = new RegExp(String.raw`(^|\s{2,}|[|;,]\s*|\s)(${label.source})(\s*[:：=\-.]\s*|\s+-\s+)`, 'gi');
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re.exec(out)) && guard++ < 10) {
      // A bare "Name" or "Patient" with no colon/dash separator is too ambiguous to redact.
      const valueStart = m.index + m[0].length;
      const rest = out.slice(valueStart);
      const stop = NEXT_FIELD.exec(rest);
      const value = (stop ? rest.slice(0, stop.index) : rest).trim();
      if (!value || /^\[[A-Z]+\]$/.test(value)) continue;
      // Do not swallow a lab row by mistake ("Name" label inside a table header).
      if (type === 'NAME' && /^(?:test|investigation|parameter|result)s?\b/i.test(value)) continue;
      const valueEnd = valueStart + (stop ? stop.index : rest.length);
      const keepTrail = out.slice(valueStart, valueEnd).match(/\s*$/)?.[0] ?? '';
      out = out.slice(0, valueStart) + placeholder(type) + keepTrail + out.slice(valueEnd);
      findings.push({ type, via: 'label' });
      re.lastIndex = valueStart + placeholder(type).length;
    }
  }
  return out;
}

export interface RedactOptions {
  /** Names/addresses/IDs proposed by the on-device model. */
  extraEntities?: Array<{ text: string; type: PiiType }>;
}

export function redact(input: string, opts: RedactOptions = {}): RedactionResult {
  const findings: Finding[] = [];
  let text = normaliseDigits(input.replace(/\r\n?/g, '\n'));

  // 1. Labelled fields, line by line.
  text = text
    .split('\n')
    .map((line) => redactLabelledLine(line, findings))
    .join('\n');

  // 2. Model-proposed entities (exact string, case-insensitive), longest first.
  const extras = [...(opts.extraEntities ?? [])]
    .map((e) => ({ ...e, text: e.text.trim() }))
    .filter((e) => e.text.length >= 3 && !isMedicalWord(e.text) && !matchTest(e.text))
    .sort((a, b) => b.text.length - a.text.length);
  for (const e of extras) {
    const re = new RegExp(escapeRegExp(e.text), 'gi');
    if (re.test(text)) {
      text = text.replace(re, placeholder(e.type));
      findings.push({ type: e.type, via: 'model' });
    }
    // Also mask the surname / given names on their own (e.g. "Mr. Sharma" later in the report).
    if (e.type === 'NAME') {
      for (const part of e.text.split(/\s+/)) {
        if (part.length < 4 || isMedicalWord(part) || matchTest(part)) continue;
        const pr = new RegExp(String.raw`(?<![\p{L}\p{M}])${escapeRegExp(part)}(?![\p{L}\p{M}])`, 'giu');
        if (pr.test(text)) {
          text = text.replace(pr, placeholder('NAME'));
          findings.push({ type: 'NAME', via: 'model' });
        }
      }
    }
  }

  // 3. Honorific + name.
  text = text.replace(NAME_RE, (m) => {
    const type: PiiType = DR_PREFIX.test(m) ? 'DOCTOR' : 'NAME';
    findings.push({ type, via: 'pattern' });
    return placeholder(type);
  });
  text = text.replace(DEVA_NAME_RE, (m) => {
    const type: PiiType = DR_PREFIX.test(m) ? 'DOCTOR' : 'NAME';
    findings.push({ type, via: 'pattern' });
    return placeholder(type);
  });

  // 4. Identifier patterns.
  for (const [re, type] of PATTERNS) {
    text = text.replace(re, () => {
      findings.push({ type, via: 'pattern' });
      return placeholder(type);
    });
  }

  // 5. Collapse adjacent duplicates ("[NAME] [NAME]") left by overlapping rules.
  text = text.replace(/(\[(?:NAME|DOCTOR|ADDRESS|ID|PHONE)\])(?:[\s,]+\1)+/g, '$1');
  return { text, findings };
}

export function summariseFindings(findings: Finding[]): Partial<Record<PiiType, number>> {
  const out: Partial<Record<PiiType, number>> = {};
  for (const f of findings) out[f.type] = (out[f.type] ?? 0) + 1;
  return out;
}

/**
 * A last-line safety check before any cloud call: does the text still contain
 * something that looks like a phone number, email, Aadhaar or labelled name?
 */
export function looksUnredacted(text: string): boolean {
  const again = redact(text);
  return again.findings.length > 0;
}
