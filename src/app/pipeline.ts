import { classifyAll, type LabRow, type Sex } from '../lib/classify';
import { explainRow, findingsPayload, ruleChecklist, ruleSummary, displayName } from '../lib/explain';
import type { Lang } from '../lib/i18n-types';
import { matchTest } from '../lib/match';
import { parseDocument } from '../lib/parse-report';
import { redact, summariseFindings, type PiiType } from '../lib/redact';
import { decideRoute, type Capabilities, type Decision, type Prefs, type Task } from '../lib/routing';
import { parseMedicineLine, type Medicine } from '../lib/rx';
import type { Narrative, SavedReport, Source } from '../lib/types';
import { BlockedError, logLocal, runModel } from '../ai/engine';
import { aiConfig } from '../ai/remote-config';
import {
  answerPrompt, checklistPrompt, checklistSchema, ChecklistOut, deepPrompt, extractSchema, ExtractOut,
  parseJson, piiPrompt, PiiOut, piiSchema, readImagePrompt, structurePrompt, summaryPrompt,
} from '../ai/prompts';
import type { DocInput } from './input';

export type StepId = 'read' | 'redact' | 'classify' | 'explain';
export interface StepEvent {
  id: StepId;
  status: 'running' | 'done' | 'skipped' | 'error';
  source?: Source;
  detail?: string;
}

export interface Ctx {
  caps: Capabilities;
  prefs: Prefs;
  lang: Lang;
  onStep?: (e: StepEvent) => void;
  /** Ask the user for consent (and masking) before a raw image goes to the cloud. Null = declined. */
  requestImageConsent?: (input: Extract<DocInput, { type: 'image' }>) => Promise<Extract<DocInput, { type: 'image' }> | null>;
}

function decide(task: Task, ctx: Ctx, input: { chars: number; lang?: Lang; imageMime?: string; imageConsent?: boolean }): Decision {
  return decideRoute(task, { lang: input.lang ?? ctx.lang, ...input }, ctx.caps, ctx.prefs, aiConfig().maxDeviceChars);
}

function isModelRoute(d: Decision): boolean {
  return d.route !== 'local_rules' && d.route !== 'blocked';
}

const todayIso = () => new Date().toISOString().slice(0, 10);

function toIsoDate(d?: string): string | undefined {
  const m = d && /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(d);
  if (!m) return undefined;
  const y = m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return `${y}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
}

/** Defence in depth: scrub anything a model returned before we store it. */
function scrubRows(rows: LabRow[]): LabRow[] {
  return rows
    .map((r) => ({ ...r, name: redact(r.name).text }))
    .filter((r) => r.name && r.value && !/^\[(NAME|PHONE|EMAIL|ADDRESS|ID|DOB|DOCTOR)\]$/.test(r.name));
}

export interface AnalyseResult {
  report: SavedReport;
  notes: string[];
}

export async function analyse(input: DocInput, ctx: Ctx, opts: { sample?: string; title?: string } = {}): Promise<AnalyseResult> {
  const step = (e: StepEvent) => ctx.onStep?.(e);
  const notes: string[] = [];
  let rows: LabRow[];
  let medicines: Medicine[];
  let sex: Sex;
  let age: number | undefined;
  let date: string | undefined;
  let title: string | undefined;
  let kind: SavedReport['kind'];
  let readSource: Source = 'rules';
  let redactions: Partial<Record<PiiType, number>> = {};
  let redactedText: string | undefined;

  if (input.type === 'text') {
    step({ id: 'read', status: 'done', source: 'rules', detail: input.pages > 1 ? `${input.pages} pages` : undefined });
    // 1. Find identifiers: Gemini Nano on device if available, always plus deterministic rules.
    step({ id: 'redact', status: 'running' });
    const piiDecision = decide('detect_pii', ctx, { chars: input.text.length, lang: 'en' });
    let extra: Array<{ text: string; type: PiiType }> = [];
    let redactSource: Source = 'rules';
    if (isModelRoute(piiDecision)) {
      try {
        const res = await runModel({ task: 'detect_pii', decision: piiDecision, prompt: piiPrompt(input.text.slice(0, aiConfig().maxDeviceChars)), schema: piiSchema });
        extra = parseJson(res.text, PiiOut).entities;
        redactSource = res.source;
      } catch (e) {
        notes.push('nano_pii_failed');
        console.info('[LabLens] on-device PII detection failed, using rules only', e);
      }
    } else logLocal('detect_pii', piiDecision);
    const red = redact(input.text, { extraEntities: extra });
    redactedText = red.text;
    redactions = summariseFindings(red.findings);
    step({ id: 'redact', status: 'done', source: redactSource, detail: String(red.findings.length) });

    // 2. Parse deterministically; ask a model to structure only if the parser found nothing.
    const doc = parseDocument(red.text);
    ({ rows, medicines, sex, kind } = doc);
    age = doc.age;
    date = doc.date;
    title = doc.title;
    if (rows.length < 2 && medicines.length === 0) {
      const d = decide('structure_text', ctx, { chars: red.text.length, lang: 'en' });
      if (isModelRoute(d)) {
        step({ id: 'read', status: 'running' });
        try {
          const res = await runModel({ task: 'structure_text', decision: d, prompt: structurePrompt(red.text), schema: extractSchema });
          const out = parseJson(res.text, ExtractOut);
          rows = scrubRows(out.rows);
          medicines = out.medicines.map((l) => parseMedicineLine(l)).filter((m): m is Medicine => !!m);
          kind = out.kind === 'other' ? 'unknown' : out.kind;
          readSource = res.source;
          step({ id: 'read', status: 'done', source: res.source });
        } catch (e) {
          notes.push('structure_failed');
          step({ id: 'read', status: 'error' });
          console.info('[LabLens] structuring failed', e);
        }
      } else logLocal('structure_text', d);
    }
  } else {
    // Image: Nano reads it on device; the cloud only sees it after consent + masking.
    step({ id: 'read', status: 'running' });
    let image = input;
    let d = decide('read_image', ctx, { chars: 0, imageMime: image.mimeType, imageConsent: false, lang: 'en' });
    if (!isModelRoute(d) && d.reason === 'cloud_needs_image_consent' && ctx.requestImageConsent && aiConfig().cloudImageEnabled) {
      const masked = await ctx.requestImageConsent(image);
      if (!masked) throw new BlockedError('consent_declined');
      image = masked;
      d = decide('read_image', ctx, { chars: 0, imageMime: image.mimeType, imageConsent: true, lang: 'en' });
    }
    if (!isModelRoute(d)) {
      logLocal('read_image', d);
      step({ id: 'read', status: 'error' });
      throw new BlockedError(d.reason);
    }
    let res;
    try {
      res = await runModel({ task: 'read_image', decision: d, prompt: readImagePrompt(), image, schema: extractSchema, heavy: true });
    } catch (e) {
      // Nano failed on this image: offer the cloud (with consent) as a fallback.
      if (d.route === 'device' && ctx.requestImageConsent && !ctx.prefs.onDeviceOnly && ctx.caps.online && ctx.caps.cloudConfigured) {
        const masked = await ctx.requestImageConsent(image);
        if (!masked) throw new BlockedError('consent_declined');
        const d2 = decide('read_image', ctx, { chars: 0, imageMime: masked.mimeType, imageConsent: true, lang: 'en' });
        res = await runModel({ task: 'read_image', decision: { ...d2, route: 'cloud' }, prompt: readImagePrompt(), image: masked, schema: extractSchema, heavy: true });
      } else throw e;
    }
    const out = parseJson(res.text, ExtractOut);
    readSource = res.source;
    step({ id: 'read', status: 'done', source: res.source });
    step({ id: 'redact', status: 'running' });
    rows = scrubRows(out.rows);
    medicines = out.medicines.map((l) => parseMedicineLine(redact(l).text)).filter((m): m is Medicine => !!m);
    kind = out.kind === 'other' ? (rows.length ? 'lab' : 'unknown') : out.kind;
    sex = out.sex ?? 'unknown';
    age = out.age && out.age > 0 && out.age < 120 ? out.age : undefined;
    date = toIsoDate(out.date);
    step({ id: 'redact', status: 'done', source: 'rules', detail: '0' });
  }

  step({ id: 'classify', status: 'running' });
  const classified = classifyAll(rows, sex);
  step({ id: 'classify', status: 'done', source: 'rules', detail: String(classified.length) });

  const now = Date.now();
  const report: SavedReport = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    date: date ?? todayIso(),
    title: opts.title ?? title ?? input.fileName.replace(/\.[a-z0-9]+$/i, ''),
    kind,
    sex,
    rows: classified,
    medicines,
    readSource,
    redactions,
    summaries: {},
  };
  if (age !== undefined) report.age = age;
  if (redactedText) report.redactedText = redactedText;
  if (opts.sample) report.sample = opts.sample;

  step({ id: 'explain', status: 'running' });
  report.summaries[ctx.lang] = await summarise(report, ctx.lang, ctx);
  step({ id: 'explain', status: 'done', source: report.summaries[ctx.lang]!.source });
  return { report, notes };
}

function payloadFor(report: SavedReport): string {
  const meds = report.medicines.length ? '\nMedicines:\n' + report.medicines.map((m) => `- ${m.raw}`).join('\n') : '';
  return findingsPayload(report.rows, { sex: report.sex, ...(report.age ? { age: report.age } : {}) }) + meds;
}

export async function summarise(report: SavedReport, lang: Lang, ctx: Ctx): Promise<Narrative> {
  const payload = payloadFor(report);
  const d = decide('summarise', ctx, { chars: payload.length + 600, lang });
  if (isModelRoute(d) && (report.rows.length || report.medicines.length)) {
    try {
      const res = await runModel({ task: 'summarise', decision: d, prompt: summaryPrompt(payload, d.outputLang, report.kind) });
      return { text: res.text.trim(), source: res.source, model: res.model, lang: d.outputLang, at: Date.now() };
    } catch (e) {
      console.info('[LabLens] summary model failed, using rules', e);
    }
  } else logLocal('summarise', d);
  return { text: ruleSummary(report.rows, lang), source: 'rules', lang, at: Date.now() };
}

export async function answer(report: SavedReport, question: string, lang: Lang, ctx: Ctx): Promise<{ a: string; source: Source; lang: Lang }> {
  const q = redact(question).text.slice(0, 500);
  const payload = payloadFor(report);
  const d = decide('answer', ctx, { chars: payload.length + q.length + 400, lang });
  if (isModelRoute(d)) {
    try {
      const res = await runModel({ task: 'answer', decision: d, prompt: answerPrompt(payload, q, d.outputLang) });
      return { a: res.text.trim(), source: res.source, lang: d.outputLang };
    } catch (e) {
      console.info('[LabLens] answer model failed, using rules', e);
    }
  } else logLocal('answer', d);
  return { a: localAnswer(report, q, lang), source: 'rules', lang };
}

/** Offline, model-free answer: explain any test the question mentions. */
export function localAnswer(report: SavedReport, q: string, lang: Lang): string {
  const words = q.toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);
  const grams = new Set<string>();
  for (let n = 1; n <= 3; n++) for (let i = 0; i + n <= words.length; i++) grams.add(words.slice(i, i + n).join(' '));
  const hit = report.rows.find((r) => [...grams].some((g) => matchTest(g)?.id === r.testId && r.testId));
  if (hit) {
    const e = explainRow(hit, lang);
    return [e.title + ': ' + e.flagLabel, ...e.lines, e.ask ?? ''].filter(Boolean).join(' ');
  }
  const fallback = {
    en: 'AI answers need Gemini Nano on this device or a connection to the cloud. Meanwhile, here is the summary: ',
    hi: 'AI उत्तर के लिए इस डिवाइस पर Gemini Nano या क्लाउड कनेक्शन चाहिए। तब तक सारांश: ',
    mr: 'AI उत्तरासाठी या डिव्हाइसवर Gemini Nano किंवा क्लाउड कनेक्शन हवे. तोपर्यंत सारांश: ',
  } as const;
  return fallback[lang] + ruleSummary(report.rows, lang);
}

export async function checklist(report: SavedReport, lang: Lang, ctx: Ctx): Promise<{ items: string[]; source: Source }> {
  const payload = payloadFor(report);
  const d = decide('checklist', ctx, { chars: payload.length + 500, lang });
  if (isModelRoute(d)) {
    try {
      const res = await runModel({ task: 'checklist', decision: d, prompt: checklistPrompt(payload, d.outputLang), schema: checklistSchema, heavy: true });
      const items = parseJson(res.text, ChecklistOut).questions.map((s) => s.trim()).filter(Boolean);
      if (items.length) return { items, source: res.source };
    } catch (e) {
      console.info('[LabLens] checklist model failed, using rules', e);
    }
  } else logLocal('checklist', d);
  return { items: ruleChecklist(report.rows, lang), source: 'rules' };
}

export async function deepAnalysis(report: SavedReport, lang: Lang, ctx: Ctx): Promise<Narrative> {
  const payload = payloadFor(report);
  const text = report.redactedText ?? report.rows.map((r) => `${displayName(r, 'en')} ${r.value} ${r.unit ?? ''} ${r.range ?? ''}`).join('\n');
  const d = decide('deep_analysis', ctx, { chars: text.length + payload.length, lang });
  if (!isModelRoute(d)) {
    logLocal('deep_analysis', d);
    throw new BlockedError(d.reason);
  }
  const res = await runModel({ task: 'deep_analysis', decision: d, prompt: deepPrompt(text, payload, lang), heavy: true });
  return { text: res.text.trim(), source: res.source, model: res.model, lang, at: Date.now() };
}
