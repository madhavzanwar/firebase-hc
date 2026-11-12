import { fetchAndActivate, getRemoteConfig, getValue } from 'firebase/remote-config';
import { InferenceMode } from 'firebase/ai';
import { getFirebaseApp } from './firebase';
import { DEFAULT_MAX_DEVICE_CHARS } from '../lib/routing';
import { isLang, type Lang } from '../lib/i18n-types';

/**
 * Settings that can be changed from the Firebase console (Remote Config)
 * without a redeploy: model names, the hybrid inference mode, the on-device
 * size budget, and a kill-switch for cloud image reading.
 */
export interface AiConfig {
  /** Main cloud model for reading images, deep analysis and checklists. */
  cloudModel: string;
  /** Cheaper cloud model used as the hybrid fallback for summaries and Q&A. */
  cloudModelLite: string;
  /** Inference mode used when both on-device and cloud are allowed. */
  hybridMode: typeof InferenceMode.PREFER_ON_DEVICE | typeof InferenceMode.PREFER_IN_CLOUD;
  maxDeviceChars: number;
  cloudImageEnabled: boolean;
  /** Extra output languages to probe Gemini Nano for (e.g. ["hi","mr"] once Chrome supports them). */
  nanoExtraLangs: Lang[];
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  cloudModel: 'gemini-3.8-flash',
  cloudModelLite: 'gemini-3.5-flash-lite',
  hybridMode: InferenceMode.PREFER_ON_DEVICE,
  maxDeviceChars: DEFAULT_MAX_DEVICE_CHARS,
  cloudImageEnabled: true,
  nanoExtraLangs: [],
};

let current: AiConfig = { ...DEFAULT_AI_CONFIG };

export function aiConfig(): AiConfig {
  return current;
}

export async function loadRemoteConfig(timeoutMs = 4000): Promise<AiConfig> {
  const app = getFirebaseApp();
  if (!app || !navigator.onLine) return current;
  try {
    const rc = getRemoteConfig(app);
    rc.settings.minimumFetchIntervalMillis = 60 * 60 * 1000;
    rc.settings.fetchTimeoutMillis = timeoutMs;
    rc.defaultConfig = {
      cloud_model: DEFAULT_AI_CONFIG.cloudModel,
      cloud_model_lite: DEFAULT_AI_CONFIG.cloudModelLite,
      hybrid_mode: DEFAULT_AI_CONFIG.hybridMode,
      max_device_chars: DEFAULT_AI_CONFIG.maxDeviceChars,
      cloud_image_enabled: DEFAULT_AI_CONFIG.cloudImageEnabled,
      nano_extra_langs: '',
    };
    await Promise.race([fetchAndActivate(rc), new Promise((r) => setTimeout(r, timeoutMs))]);
    const mode = getValue(rc, 'hybrid_mode').asString();
    current = {
      cloudModel: getValue(rc, 'cloud_model').asString() || DEFAULT_AI_CONFIG.cloudModel,
      cloudModelLite: getValue(rc, 'cloud_model_lite').asString() || DEFAULT_AI_CONFIG.cloudModelLite,
      hybridMode: mode === InferenceMode.PREFER_IN_CLOUD ? InferenceMode.PREFER_IN_CLOUD : InferenceMode.PREFER_ON_DEVICE,
      maxDeviceChars: getValue(rc, 'max_device_chars').asNumber() || DEFAULT_AI_CONFIG.maxDeviceChars,
      cloudImageEnabled: getValue(rc, 'cloud_image_enabled').asBoolean(),
      nanoExtraLangs: getValue(rc, 'nano_extra_langs').asString().split(',').map((x) => x.trim()).filter(isLang),
    };
  } catch (e) {
    console.info('[LabLens] Remote Config unavailable, using defaults', e);
  }
  return current;
}
