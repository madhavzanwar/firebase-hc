import { getGenerativeModel, InferenceMode, InferenceSource, type GenerativeModel, type ObjectSchema, type Part } from 'firebase/ai';
import type { Lang } from '../lib/i18n-types';
import { looksUnredacted, redact } from '../lib/redact';
import { mayUseCloud, type Decision, type Task } from '../lib/routing';
import type { PrivacyLogEntry, Source } from '../lib/types';
import { createOptionsFor, hasPromptApi } from './capabilities';
import { getAIService } from './firebase';
import { aiConfig } from './remote-config';

/**
 * The single choke-point for model calls. Every call goes through Firebase AI
 * Logic's hybrid GenerativeModel. Before a call this module:
 *  1. maps the privacy decision to an InferenceMode,
 *  2. refuses ONLY_ON_DEVICE when the Prompt API is missing (otherwise the SDK
 *     would silently fall back to the cloud: see docs/RESEARCH.md §2),
 *  3. re-checks that cloud-capable prompts contain no identifiers,
 * and afterwards it records the real `inferenceSource` in the privacy log.
 */

export class BlockedError extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = 'BlockedError';
  }
}

export interface RunArgs {
  task: Task;
  decision: Decision;
  prompt: string;
  image?: { data: string; mimeType: string };
  schema?: ObjectSchema;
  /** Use the larger cloud model (reading images, deep analysis). */
  heavy?: boolean;
}

export interface RunResult {
  text: string;
  source: Exclude<Source, 'rules'>;
  model?: string;
  ms: number;
}

type Listener = (e: PrivacyLogEntry) => void;
const listeners = new Set<Listener>();
export function onPrivacyEvent(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(e: Omit<PrivacyLogEntry, 'id' | 'at'>) {
  const entry: PrivacyLogEntry = { id: crypto.randomUUID(), at: Date.now(), ...e };
  for (const l of listeners) l(entry);
}

function modeFor(route: Decision['route']) {
  switch (route) {
    case 'device':
      return InferenceMode.ONLY_ON_DEVICE;
    case 'hybrid':
      return aiConfig().hybridMode;
    case 'cloud_first':
      return InferenceMode.PREFER_IN_CLOUD;
    case 'cloud':
      return InferenceMode.ONLY_IN_CLOUD;
    default:
      return undefined;
  }
}

const cache = new Map<string, GenerativeModel>();

function modelFor(mode: InferenceMode, cloudModel: string, outLang: Lang, withImage: boolean, schema?: ObjectSchema, schemaKey = ''): GenerativeModel {
  const key = [mode, cloudModel, outLang, withImage, schemaKey].join('|');
  const hit = cache.get(key);
  if (hit) return hit;
  const ai = getAIService();
  if (!ai) throw new BlockedError('cloud_not_configured');
  const model = getGenerativeModel(ai, {
    mode,
    inCloudParams: {
      model: cloudModel,
      generationConfig: {
        temperature: 0.2,
        ...(schema ? { responseMimeType: 'application/json', responseSchema: schema } : {}),
      },
    },
    onDeviceParams: {
      createOptions: createOptionsFor(outLang, withImage),
      ...(schema ? { promptOptions: { responseConstraint: schema } } : {}),
    },
  });
  cache.set(key, model);
  return model;
}

export async function runModel(args: RunArgs): Promise<RunResult> {
  const { task, decision } = args;
  const mode = modeFor(decision.route);
  if (!mode) throw new BlockedError(decision.reason);
  if (mode === InferenceMode.ONLY_ON_DEVICE && !hasPromptApi()) {
    emit({ task, route: decision.route, source: 'blocked', chars: 0, note: 'Prompt API missing: refused instead of letting the SDK fall back to the cloud' });
    throw new BlockedError('on_device_only_no_nano');
  }

  let prompt = args.prompt;
  let note: string | undefined;
  // Last line of defence: anything that might reach the cloud must look redacted.
  // (Images are only sent after explicit consent and the user's own masking.)
  if (mayUseCloud(decision.route) && task !== 'detect_pii' && looksUnredacted(prompt)) {
    prompt = redact(prompt).text;
    note = 'Extra identifiers were masked just before sending.';
  }

  const cfg = aiConfig();
  const cloudModel = args.heavy ? cfg.cloudModel : cfg.cloudModelLite;
  const model = modelFor(mode, cloudModel, decision.outputLang, !!args.image, args.schema, args.schema ? task : '');
  const parts: Array<string | Part> = [prompt];
  if (args.image) parts.push({ type: 'inlineData', inlineData: { data: args.image.data, mimeType: args.image.mimeType } });

  const t0 = performance.now();
  const result = await model.generateContent(parts);
  const ms = Math.round(performance.now() - t0);
  const source = result.response.inferenceSource === InferenceSource.ON_DEVICE ? 'on_device' : 'in_cloud';
  const text = result.response.text();

  const entry: Omit<PrivacyLogEntry, 'id' | 'at'> = { task, route: decision.route, source, chars: prompt.length };
  if (source === 'in_cloud') {
    entry.model = cloudModel;
    entry.payload = prompt;
    if (args.image) entry.imageSent = true;
  } else {
    entry.model = 'gemini-nano (Chrome)';
  }
  if (note) entry.note = note;
  emit(entry);
  return source === 'in_cloud' ? { text, source, model: cloudModel, ms } : { text, source, model: 'gemini-nano', ms };
}

/** Record a decision that ran on rules or was blocked, so the privacy log is complete. */
export function logLocal(task: Task, decision: Decision, note?: string) {
  const e: Omit<PrivacyLogEntry, 'id' | 'at'> = { task, route: decision.route, source: decision.route === 'blocked' ? 'blocked' : 'rules', chars: 0 };
  e.note = note ?? decision.reason;
  emit(e);
}

/**
 * Start (or resume) the Gemini Nano download. Must be called from a user
 * gesture (the SDK's requirement). Resolves when the model is ready.
 */
export async function initDeviceModel(onProgress: (p: number) => void): Promise<void> {
  const ai = getAIService();
  if (!ai || !hasPromptApi()) throw new BlockedError('on_device_only_no_nano');
  const model = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: { model: aiConfig().cloudModelLite },
    onDeviceParams: { createOptions: createOptionsFor('en') },
  });
  await model.initializeDeviceModel(onProgress);
}
