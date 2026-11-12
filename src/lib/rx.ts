import type { L10n, Lang } from './i18n-types';
import { normaliseDigits } from './numbers';

/** A medicine line from a prescription. */
export interface Medicine {
  form?: string;
  name: string;
  strength?: string;
  /** Morning-noon-night pattern, e.g. [1,0,1]. */
  pattern?: number[];
  /** Frequency abbreviation (OD, BD, TDS…) if written that way. */
  frequency?: string;
  timing?: 'before_food' | 'after_food' | 'with_food' | 'empty_stomach' | 'bedtime';
  duration?: string;
  asNeeded?: boolean;
  raw: string;
}

const t = (en: string, hi: string, mr: string): L10n => ({ en, hi, mr });

export const FREQUENCIES: Record<string, { perDay: number | null; text: L10n }> = {
  OD: { perDay: 1, text: t('once a day', 'दिन में एक बार', 'दिवसातून एकदा') },
  QD: { perDay: 1, text: t('once a day', 'दिन में एक बार', 'दिवसातून एकदा') },
  BD: { perDay: 2, text: t('twice a day', 'दिन में दो बार', 'दिवसातून दोनदा') },
  BID: { perDay: 2, text: t('twice a day', 'दिन में दो बार', 'दिवसातून दोनदा') },
  TDS: { perDay: 3, text: t('three times a day', 'दिन में तीन बार', 'दिवसातून तीनदा') },
  TID: { perDay: 3, text: t('three times a day', 'दिन में तीन बार', 'दिवसातून तीनदा') },
  QID: { perDay: 4, text: t('four times a day', 'दिन में चार बार', 'दिवसातून चार वेळा') },
  QDS: { perDay: 4, text: t('four times a day', 'दिन में चार बार', 'दिवसातून चार वेळा') },
  HS: { perDay: 1, text: t('at bedtime', 'सोने से पहले', 'झोपण्यापूर्वी') },
  SOS: { perDay: null, text: t('only when needed', 'केवल ज़रूरत पड़ने पर', 'फक्त गरज असेल तेव्हा') },
  PRN: { perDay: null, text: t('only when needed', 'केवल ज़रूरत पड़ने पर', 'फक्त गरज असेल तेव्हा') },
  STAT: { perDay: null, text: t('immediately, once', 'तुरंत, एक बार', 'लगेच, एकदा') },
  WEEKLY: { perDay: null, text: t('once a week', 'हफ़्ते में एक बार', 'आठवड्यातून एकदा') },
};

export const TIMINGS: Record<NonNullable<Medicine['timing']>, L10n> = {
  before_food: t('before food', 'खाने से पहले', 'जेवणापूर्वी'),
  after_food: t('after food', 'खाने के बाद', 'जेवणानंतर'),
  with_food: t('with food', 'खाने के साथ', 'जेवणासोबत'),
  empty_stomach: t('on an empty stomach', 'खाली पेट', 'उपाशीपोटी'),
  bedtime: t('at bedtime', 'सोने से पहले', 'झोपण्यापूर्वी'),
};

const FORMS: Record<string, L10n> = {
  tab: t('tablet', 'गोली', 'गोळी'),
  cap: t('capsule', 'कैप्सूल', 'कॅप्सूल'),
  syp: t('syrup', 'सिरप', 'सिरप'),
  inj: t('injection', 'इंजेक्शन', 'इंजेक्शन'),
  drop: t('drops', 'ड्रॉप्स', 'थेंब'),
  oint: t('ointment', 'मलहम', 'मलम'),
  cream: t('cream', 'क्रीम', 'क्रीम'),
  gel: t('gel', 'जेल', 'जेल'),
  sachet: t('sachet', 'पाउच', 'पाकीट'),
  inhaler: t('inhaler', 'इनहेलर', 'इनहेलर'),
};

const FORM_RE =
  /^(?:\d+\s*[.)]\s*)?(?:℞\s*)?(tab(?:let)?s?|cap(?:sule)?s?|syp|syrup|inj(?:ection)?|drops?|oint(?:ment)?|cream|gel|sachet|inhaler|गोली|टॅब|टैब|कॅप|कैप|सिरप|इंजेक्शन)\.?\s+/i;

function formKey(raw: string): string {
  const s = raw.toLowerCase();
  if (/^tab|गोली|टॅब|टैब/.test(s)) return 'tab';
  if (/^cap|कॅप|कैप/.test(s)) return 'cap';
  if (/^syp|^syrup|सिरप/.test(s)) return 'syp';
  if (/^inj|इंजेक्शन/.test(s)) return 'inj';
  if (/^drop/.test(s)) return 'drop';
  if (/^oint/.test(s)) return 'oint';
  return s.replace(/s$/, '');
}

const STRENGTH_RE = /\b(\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|ml|iu|units?|%)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g))?)\b/i;
const PATTERN_RE = /\b([0-4](?:\.5)?|½)\s*-\s*([0-4](?:\.5)?|½)\s*-\s*([0-4](?:\.5)?|½)(?:\s*-\s*([0-4](?:\.5)?|½))?\b/;
const FREQ_RE = /\b(OD|QD|BD|BID|TDS|TID|QID|QDS|HS|SOS|PRN|STAT|weekly|once\s+a\s+week)\b/i;
const DURATION_RE = /(?:x|×|for|के\s*लिए|साठी)?\s*(\d+\s*(?:days?|d|weeks?|wks?|w|months?|m|दिन|हफ़्ते|सप्ताह|महीने|दिवस|आठवडे|महिने))\b/i;

function decodePattern(m: RegExpExecArray): number[] {
  return m
    .slice(1)
    .filter((x): x is string => x !== undefined)
    .map((x) => (x === '½' ? 0.5 : Number(x)));
}

function timingOf(s: string): Medicine['timing'] {
  if (/\b(a\.?c\.?|before\s+(?:food|meals?|breakfast))\b|खाने\s*से\s*पहले|जेवणापूर्वी|जेवणाआधी/i.test(s)) return 'before_food';
  if (/\b(p\.?c\.?|after\s+(?:food|meals?|breakfast|lunch|dinner))\b|खाने\s*के\s*बाद|जेवणानंतर/i.test(s)) return 'after_food';
  if (/\bwith\s+(?:food|meals?)\b|खाने\s*के\s*साथ|जेवणासोबत/i.test(s)) return 'with_food';
  if (/\bempty\s+stomach\b|खाली\s*पेट|उपाशीपोटी/i.test(s)) return 'empty_stomach';
  if (/\b(h\.?s\.?|at\s+bed\s*time|bedtime|at\s+night)\b|सोने\s*से\s*पहले|झोपण्यापूर्वी/i.test(s)) return 'bedtime';
  return undefined;
}

/** Parse one prescription line. Returns undefined if it doesn't look like a medicine. */
export function parseMedicineLine(line: string): Medicine | undefined {
  const raw = line.trim();
  const s = normaliseDigits(raw).replace(/[‐-―−]/g, '-');
  const fm = FORM_RE.exec(s);
  if (!fm?.[1]) return undefined;
  const rest = s.slice(fm[0].length);
  const strength = STRENGTH_RE.exec(rest);
  const nameEnd = Math.min(
    ...[strength?.index, PATTERN_RE.exec(rest)?.index, FREQ_RE.exec(rest)?.index, rest.search(/\s[-–(]|\s{2,}|,/)]
      .filter((x): x is number => typeof x === 'number' && x > 0),
    rest.length,
  );
  const name = rest.slice(0, nameEnd).trim().replace(/[,;:-]+$/, '');
  if (!name || !/[A-Za-zऀ-ॿ]/.test(name)) return undefined;
  const med: Medicine = { form: formKey(fm[1]), name, raw };
  if (strength?.[1]) med.strength = strength[1].replace(/\s+/g, ' ');
  const pm = PATTERN_RE.exec(rest);
  if (pm) med.pattern = decodePattern(pm);
  const fq = FREQ_RE.exec(rest);
  if (fq?.[1]) {
    const f = fq[1].toUpperCase().replace(/\s+/g, ' ');
    med.frequency = f === 'ONCE A WEEK' ? 'WEEKLY' : f;
    if (med.frequency === 'SOS' || med.frequency === 'PRN') med.asNeeded = true;
  }
  const tm = timingOf(rest);
  if (tm) med.timing = tm;
  else if (med.frequency === 'HS') med.timing = 'bedtime';
  const du = DURATION_RE.exec(rest);
  if (du?.[1]) med.duration = du[1].replace(/\s+/g, ' ');
  return med;
}

export function parsePrescription(text: string): Medicine[] {
  return text
    .split(/\r?\n/)
    .map(parseMedicineLine)
    .filter((m): m is Medicine => !!m);
}

const SLOT: L10n[] = [t('morning', 'सुबह', 'सकाळी'), t('afternoon', 'दोपहर', 'दुपारी'), t('night', 'रात', 'रात्री'), t('bedtime', 'सोते समय', 'झोपताना')];

/** Plain-language schedule for a medicine, e.g. "1 tablet in the morning and 1 at night, after food, for 30 days". */
export function describeMedicine(m: Medicine, lang: Lang): string {
  const parts: string[] = [];
  const form = m.form && FORMS[m.form] ? FORMS[m.form]![lang] : '';
  if (m.pattern) {
    const slots = m.pattern
      .map((n, i) => (n > 0 ? `${n === 0.5 ? '½' : n} ${form ? form + ' ' : ''}${joinWord(lang, 'in')}${SLOT[i]?.[lang] ?? ''}`.trim() : ''))
      .filter(Boolean);
    if (slots.length) parts.push(slots.join(lang === 'en' ? ', ' : ', '));
  }
  if (m.frequency && FREQUENCIES[m.frequency]) parts.push(FREQUENCIES[m.frequency]!.text[lang]);
  if (m.timing) parts.push(TIMINGS[m.timing][lang]);
  if (m.duration) parts.push(durationText(m.duration, lang));
  return parts.join(' · ');
}

function joinWord(lang: Lang, w: 'in'): string {
  if (lang === 'en' && w === 'in') return 'in the ';
  return '';
}

function durationText(d: string, lang: Lang): string {
  const m = /(\d+)\s*(\S+)/.exec(d);
  if (!m) return d;
  const n = m[1];
  const u = (m[2] ?? '').toLowerCase();
  const unit: L10n = /^(d|day|days|दिन|दिवस)$/.test(u)
    ? t('days', 'दिन', 'दिवस')
    : /^(w|wk|wks|week|weeks|हफ़्ते|सप्ताह|आठवडे)$/.test(u)
      ? t('weeks', 'हफ़्ते', 'आठवडे')
      : t('months', 'महीने', 'महिने');
  const forWord: L10n = t(`for ${n} ${unit.en}`, `${n} ${unit.hi} तक`, `${n} ${unit.mr}`);
  return forWord[lang];
}

/** Total tablets per day from a pattern or frequency, if known. */
export function dosesPerDay(m: Medicine): number | null {
  if (m.pattern) return m.pattern.reduce((a, b) => a + b, 0);
  if (m.frequency) return FREQUENCIES[m.frequency]?.perDay ?? null;
  return null;
}
