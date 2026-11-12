import type { Lang } from './i18n-types';

/**
 * The privacy routing policy. Every AI call in LabLens asks this function first.
 * It is pure, so the whole policy is unit-tested (tests/unit/routing.test.ts).
 *
 * Routes:
 *  - device       → Firebase AI Logic with InferenceMode.ONLY_ON_DEVICE (Gemini Nano)
 *  - hybrid       → InferenceMode.PREFER_ON_DEVICE: Nano if ready, else cloud (the SDK decides)
 *  - cloud_first  → InferenceMode.PREFER_IN_CLOUD: cloud if reachable, else Nano (works offline)
 *  - cloud        → InferenceMode.ONLY_IN_CLOUD
 *  - local_rules  → no model at all; LabLens's deterministic engine answers
 *  - blocked      → the user's settings or the situation do not allow this task
 */

export type Task =
  | 'detect_pii' // find names/addresses in raw text, so they can be masked
  | 'read_image' // read a photo/scan into structured rows (sees the raw image)
  | 'structure_text' // turn redacted text into structured rows when the parser can't
  | 'summarise' // plain-language summary of the redacted findings
  | 'answer' // follow-up question about the redacted findings
  | 'checklist' // questions to ask the doctor
  | 'deep_analysis'; // long multi-page reasoning over redacted text

export type NanoStatus = 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'no_api';

export interface Capabilities {
  nano: NanoStatus;
  /** Output languages Nano accepted when probed (en always tried; hi/mr probed too). */
  nanoLangs: Lang[];
  /** Nano accepts image input (needs the multimodal flag). Defaults to true. */
  nanoImage?: boolean;
  online: boolean;
  /** Firebase is configured (so cloud calls can be made). */
  cloudConfigured: boolean;
}

export interface Prefs {
  /** The "On-device only" switch: nothing may leave the device. */
  onDeviceOnly: boolean;
  /** Whether redacted, minimised text may be sent to the cloud. */
  allowCloudForRedacted: boolean;
}

export interface TaskInput {
  lang: Lang;
  /** Size of the prompt payload in characters. */
  chars: number;
  imageMime?: string;
  /** Explicit, per-image consent to send the (masked) image to the cloud. */
  imageConsent?: boolean;
}

export type Route = 'device' | 'hybrid' | 'cloud_first' | 'cloud' | 'local_rules' | 'blocked';

export type Reason =
  | 'nano_ready'
  | 'nano_ready_cloud_allowed'
  | 'never_cloud_raw_text'
  | 'no_nano_rules_only'
  | 'nano_unavailable'
  | 'on_device_only'
  | 'on_device_only_no_nano'
  | 'cloud_needs_image_consent'
  | 'image_type_not_on_device'
  | 'offline'
  | 'cloud_not_allowed'
  | 'cloud_not_configured'
  | 'lang_not_on_device'
  | 'too_long_for_device'
  | 'cloud_preferred'
  | 'cloud_preferred_device_fallback';

export interface Decision {
  route: Route;
  reason: Reason;
  /** Language the model should answer in (Nano may need English). */
  outputLang: Lang;
}

/** Gemini Nano's on-device budget is 9,216 tokens. We keep the prompt well under it. */
export const DEFAULT_MAX_DEVICE_CHARS = 12000;
const DEVICE_IMAGE_TYPES = ['image/png', 'image/jpeg'];

export function nanoUsable(c: Capabilities): boolean {
  // "downloadable"/"downloading" count as usable for ONLY_ON_DEVICE (the SDK waits), but not for prefer-mode.
  return c.nano === 'available';
}

export function decideRoute(task: Task, input: TaskInput, caps: Capabilities, prefs: Prefs, maxDeviceChars = DEFAULT_MAX_DEVICE_CHARS): Decision {
  const nano = nanoUsable(caps);
  const cloudPossible = caps.cloudConfigured && caps.online;
  const cloudAllowed = !prefs.onDeviceOnly && prefs.allowCloudForRedacted;
  const canCloud = cloudPossible && cloudAllowed;
  const langOnDevice = caps.nanoLangs.includes(input.lang);
  const fits = input.chars <= maxDeviceChars;
  const L = input.lang;

  const noCloudReason = (): Reason =>
    prefs.onDeviceOnly ? 'on_device_only' : !prefs.allowCloudForRedacted ? 'cloud_not_allowed' : !caps.cloudConfigured ? 'cloud_not_configured' : 'offline';

  switch (task) {
    case 'detect_pii':
      // Raw, unredacted text is never sent to the cloud, whatever the settings.
      return nano ? { route: 'device', reason: 'never_cloud_raw_text', outputLang: 'en' } : { route: 'local_rules', reason: 'no_nano_rules_only', outputLang: 'en' };

    case 'read_image': {
      const deviceType = !!input.imageMime && DEVICE_IMAGE_TYPES.includes(input.imageMime) && caps.nanoImage !== false;
      const cloudForImage = cloudPossible && !prefs.onDeviceOnly && !!input.imageConsent;
      if (nano && deviceType) {
        return cloudForImage ? { route: 'hybrid', reason: 'nano_ready_cloud_allowed', outputLang: 'en' } : { route: 'device', reason: 'nano_ready', outputLang: 'en' };
      }
      if (cloudForImage) return { route: 'cloud', reason: nano ? 'image_type_not_on_device' : 'nano_unavailable', outputLang: 'en' };
      if (prefs.onDeviceOnly) return { route: 'blocked', reason: nano ? 'image_type_not_on_device' : 'on_device_only_no_nano', outputLang: 'en' };
      if (!input.imageConsent) return { route: 'blocked', reason: 'cloud_needs_image_consent', outputLang: 'en' };
      return { route: 'blocked', reason: caps.cloudConfigured ? 'offline' : 'cloud_not_configured', outputLang: 'en' };
    }

    case 'structure_text':
    case 'summarise':
    case 'answer': {
      const deviceOk = nano && fits && (task === 'structure_text' || langOnDevice);
      if (deviceOk) {
        return canCloud ? { route: 'hybrid', reason: 'nano_ready_cloud_allowed', outputLang: L } : { route: 'device', reason: 'nano_ready', outputLang: L };
      }
      if (canCloud) {
        const reason: Reason = !nano ? 'nano_unavailable' : !fits ? 'too_long_for_device' : 'lang_not_on_device';
        return { route: 'cloud', reason, outputLang: L };
      }
      // No cloud: Nano in English if the language is the only problem.
      if (nano && fits && !langOnDevice && caps.nanoLangs.includes('en')) {
        return { route: 'device', reason: 'lang_not_on_device', outputLang: 'en' };
      }
      if (prefs.onDeviceOnly && !nano) return { route: 'local_rules', reason: 'on_device_only_no_nano', outputLang: L };
      if (nano && !fits) return { route: 'local_rules', reason: 'too_long_for_device', outputLang: L };
      return { route: 'local_rules', reason: noCloudReason(), outputLang: L };
    }

    case 'checklist': {
      if (canCloud) return nano && fits && langOnDevice ? { route: 'cloud_first', reason: 'cloud_preferred_device_fallback', outputLang: L } : { route: 'cloud', reason: 'cloud_preferred', outputLang: L };
      if (nano && fits) return { route: 'device', reason: langOnDevice ? 'nano_ready' : 'lang_not_on_device', outputLang: langOnDevice ? L : 'en' };
      return { route: 'local_rules', reason: noCloudReason(), outputLang: L };
    }

    case 'deep_analysis':
      if (canCloud) return { route: 'cloud', reason: 'cloud_preferred', outputLang: L };
      return { route: 'blocked', reason: noCloudReason(), outputLang: L };
  }
}

/** Does this route possibly send data to the cloud? Used for the privacy log and consent checks. */
export function mayUseCloud(route: Route): boolean {
  return route === 'hybrid' || route === 'cloud' || route === 'cloud_first';
}
