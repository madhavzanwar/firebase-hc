import { isCritical, isOutOfRange, sortByConcern, type ClassifiedRow, type Flag } from './classify';
import type { L10n, Lang } from './i18n-types';
import { formatRange } from './ranges';
import { TESTS_BY_ID } from './tests-kb';

const t = (en: string, hi: string, mr: string): L10n => ({ en, hi, mr });

export const FLAG_LABEL: Record<Flag, L10n> = {
  normal: t('Normal', 'सामान्य', 'सामान्य'),
  borderline: t('Borderline', 'सीमा पर', 'सीमारेषेवर'),
  low: t('Low', 'कम', 'कमी'),
  high: t('High', 'अधिक', 'जास्त'),
  critical_low: t('Critically low', 'बहुत कम (गंभीर)', 'खूप कमी (गंभीर)'),
  critical_high: t('Critically high', 'बहुत अधिक (गंभीर)', 'खूप जास्त (गंभीर)'),
  abnormal: t('Abnormal', 'असामान्य', 'असामान्य'),
  unknown: t('No range', 'सीमा नहीं दी', 'मर्यादा दिलेली नाही'),
};

function fill(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}

const TPL = {
  value: t('Your result: {value}{unit}.', 'आपका परिणाम: {value}{unit}।', 'तुमचा निकाल: {value}{unit}.'),
  rangeReport: t("The report's normal range is {range}.", 'रिपोर्ट में सामान्य सीमा {range} है।', 'अहवालातील सामान्य मर्यादा {range} आहे.'),
  rangeDefault: t('A typical adult range is {range} (the report did not print one).', 'वयस्कों की सामान्य सीमा लगभग {range} है (रिपोर्ट में नहीं दी गई)।', 'प्रौढांची साधारण मर्यादा {range} आहे (अहवालात दिलेली नाही).'),
  band: t('This is in the {band}.', 'यह {band} में है।', 'हे {band} मध्ये आहे.'),
  ask: t('Talk to your doctor about {ask}.', 'अपने डॉक्टर से {ask} के बारे में बात करें।', 'तुमच्या डॉक्टरांशी {ask} याबद्दल बोला.'),
  askGeneric: t('Talk to your doctor about what this result means for you.', 'इस परिणाम का आपके लिए क्या अर्थ है, इस बारे में डॉक्टर से बात करें।', 'या निकालाचा तुमच्यासाठी काय अर्थ आहे, याबद्दल डॉक्टरांशी बोला.'),
  normal: t('This is within the normal range.', 'यह सामान्य सीमा में है।', 'हे सामान्य मर्यादेत आहे.'),
  noRange: t('No reference range was printed, so LabLens cannot say whether this is normal.', 'कोई संदर्भ सीमा नहीं दी गई, इसलिए LabLens नहीं बता सकता कि यह सामान्य है या नहीं।', 'संदर्भ मर्यादा दिलेली नाही, त्यामुळे हे सामान्य आहे का ते LabLens सांगू शकत नाही.'),
  urgent: t('This value is far outside the usual range. Please contact a doctor today, or go to emergency care if you feel unwell.', 'यह मान सामान्य से बहुत दूर है। कृपया आज ही डॉक्टर से संपर्क करें, या तबीयत ख़राब लगे तो आपातकालीन सेवा लें।', 'हे मूल्य सामान्यपेक्षा खूप दूर आहे. कृपया आजच डॉक्टरांशी संपर्क साधा, किंवा अस्वस्थ वाटल्यास आपत्कालीन सेवा घ्या.'),
  abnormalQual: t('This was reported as present; normally it is absent.', 'यह उपस्थित बताया गया है; सामान्यतः यह अनुपस्थित होता है।', 'हे उपस्थित असल्याचे नोंदवले आहे; सामान्यतः ते अनुपस्थित असते.'),
};

export interface Explanation {
  testId?: string;
  title: string;
  flagLabel: string;
  lines: string[];
  ask?: string;
  urgent: boolean;
}

export function displayName(row: ClassifiedRow, lang: Lang): string {
  const info = row.testId ? TESTS_BY_ID.get(row.testId) : undefined;
  return info ? info.name[lang] : row.name;
}

/** Deterministic, localised explanation of one result. No model involved. */
export function explainRow(row: ClassifiedRow, lang: Lang): Explanation {
  const info = row.testId ? TESTS_BY_ID.get(row.testId) : undefined;
  const lines: string[] = [];
  if (info) lines.push(info.what[lang]);
  lines.push(fill(TPL.value[lang], { value: row.value, unit: row.unit ? ` ${row.unit}` : '' }));
  if (row.parsedRange) {
    const range = formatRange(row.parsedRange) + (row.rangeSource === 'default' && info ? ` ${info.unit}` : '');
    lines.push(fill((row.rangeSource === 'report' ? TPL.rangeReport : TPL.rangeDefault)[lang], { range }));
  }
  const urgent = isCritical(row.flag);
  const lowish = row.flag === 'low' || row.flag === 'critical_low';
  const highish = row.flag === 'high' || row.flag === 'critical_high' || row.flag === 'abnormal' || (row.flag === 'borderline' && row.band?.level !== 'low');
  if (row.band) lines.push(fill(TPL.band[lang], { band: row.band.label[lang] }));
  if (row.flag === 'normal') lines.push(TPL.normal[lang]);
  else if (row.flag === 'unknown' && !row.parsedRange && !info?.qualitativeNormal) lines.push(TPL.noRange[lang]);
  else if (row.flag === 'abnormal') lines.push(TPL.abnormalQual[lang]);
  if (lowish && info?.low) lines.push(info.low[lang]);
  if (highish && info?.high) lines.push(info.high[lang]);
  if (urgent) lines.push(TPL.urgent[lang]);

  let ask: string | undefined;
  if (isOutOfRange(row.flag)) {
    const a = lowish ? info?.askLow : info?.askHigh;
    ask = a ? fill(TPL.ask[lang], { ask: a[lang] }) : TPL.askGeneric[lang];
  }
  const out: Explanation = { title: displayName(row, lang), flagLabel: FLAG_LABEL[row.flag][lang], lines, urgent };
  if (row.testId) out.testId = row.testId;
  if (ask) out.ask = ask;
  return out;
}

const SUM = {
  allNormal: t('All {n} results are within the printed ranges.', 'सभी {n} परिणाम दी गई सीमा में हैं।', 'सर्व {n} निकाल दिलेल्या मर्यादेत आहेत.'),
  some: t('{k} of {n} results are outside the normal range: {list}.', '{n} में से {k} परिणाम सामान्य सीमा से बाहर हैं: {list}।', '{n} पैकी {k} निकाल सामान्य मर्यादेबाहेर आहेत: {list}.'),
  urgent: t('{k} result(s) need prompt medical attention.', '{k} परिणाम पर जल्दी डॉक्टरी ध्यान ज़रूरी है।', '{k} निकालांकडे लवकर वैद्यकीय लक्ष देणे आवश्यक आहे.'),
  none: t('LabLens could not find any test results in this document.', 'LabLens को इस दस्तावेज़ में कोई जाँच परिणाम नहीं मिला।', 'LabLens ला या दस्तऐवजात कोणतेही तपासणी निकाल सापडले नाहीत.'),
};

/** A short deterministic summary: used offline, or when no model may run. */
export function ruleSummary(rows: ClassifiedRow[], lang: Lang): string {
  if (rows.length === 0) return SUM.none[lang];
  const out = sortByConcern(rows.filter((r) => isOutOfRange(r.flag)));
  const parts: string[] = [];
  if (out.length === 0) parts.push(fill(SUM.allNormal[lang], { n: String(rows.length) }));
  else {
    const list = out
      .slice(0, 6)
      .map((r) => `${displayName(r, lang)} (${FLAG_LABEL[r.flag][lang].toLowerCase()})`)
      .join(', ');
    parts.push(fill(SUM.some[lang], { k: String(out.length), n: String(rows.length), list }));
  }
  const urgent = rows.filter((r) => isCritical(r.flag)).length;
  if (urgent) parts.push(fill(SUM.urgent[lang], { k: String(urgent) }));
  return parts.join(' ');
}

/** Deterministic doctor-question checklist, used when no model is allowed or reachable. */
export function ruleChecklist(rows: ClassifiedRow[], lang: Lang): string[] {
  const out = sortByConcern(rows.filter((r) => isOutOfRange(r.flag)));
  const qs = out.map((r) => explainRow(r, lang).ask).filter((x): x is string => !!x);
  const generic: L10n[] = [
    t('Do any of these results change my current medicines?', 'क्या इन परिणामों से मेरी मौजूदा दवाएँ बदलेंगी?', 'या निकालांमुळे माझी सध्याची औषधे बदलतील का?'),
    t('When should I repeat these tests?', 'मुझे ये जाँचें दोबारा कब करानी चाहिए?', 'या तपासण्या पुन्हा केव्हा कराव्यात?'),
  ];
  return [...new Set([...qs, ...generic.map((g) => g[lang])])];
}

/**
 * The minimised, redacted payload a model gets: only test names, values,
 * units, ranges and flags (no free text, no identifiers). The privacy log shows this.
 */
export function findingsPayload(rows: ClassifiedRow[], meta: { sex?: string; age?: number } = {}): string {
  const lines = rows.map((r) => {
    const range = r.parsedRange ? formatRange(r.parsedRange) : 'not printed';
    return `- ${r.name}: ${r.value}${r.unit ? ' ' + r.unit : ''} (range ${range}; ${r.flag.replace('_', ' ')})`;
  });
  const who = [meta.age ? `age ${meta.age}` : '', meta.sex && meta.sex !== 'unknown' ? meta.sex : ''].filter(Boolean).join(', ');
  return (who ? `Patient: ${who}\n` : '') + lines.join('\n');
}
