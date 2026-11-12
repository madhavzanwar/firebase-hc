import { describe, expect, it } from 'vitest';
import { decideRoute, mayUseCloud, type Capabilities, type Prefs } from '../../src/lib/routing';

const nanoEn: Capabilities = { nano: 'available', nanoLangs: ['en'], online: true, cloudConfigured: true };
const noNano: Capabilities = { nano: 'no_api', nanoLangs: [], online: true, cloudConfigured: true };
const offlineNano: Capabilities = { ...nanoEn, online: false };
const offlineNoNano: Capabilities = { ...noNano, online: false };
const open: Prefs = { onDeviceOnly: false, allowCloudForRedacted: true };
const strict: Prefs = { onDeviceOnly: true, allowCloudForRedacted: true };

describe('privacy routing policy', () => {
  it('never sends raw text to the cloud for PII detection', () => {
    for (const caps of [nanoEn, noNano, offlineNano]) {
      for (const prefs of [open, strict]) {
        const d = decideRoute('detect_pii', { lang: 'en', chars: 500 }, caps, prefs);
        expect(mayUseCloud(d.route)).toBe(false);
      }
    }
    expect(decideRoute('detect_pii', { lang: 'en', chars: 1 }, nanoEn, open).route).toBe('device');
    expect(decideRoute('detect_pii', { lang: 'en', chars: 1 }, noNano, open).route).toBe('local_rules');
  });

  it('only sends an image to the cloud with explicit consent', () => {
    const img = { lang: 'en' as const, chars: 0, imageMime: 'image/jpeg' };
    expect(decideRoute('read_image', img, nanoEn, open)).toMatchObject({ route: 'device' });
    expect(decideRoute('read_image', { ...img, imageConsent: true }, nanoEn, open)).toMatchObject({ route: 'hybrid' });
    expect(decideRoute('read_image', img, noNano, open)).toMatchObject({ route: 'blocked', reason: 'cloud_needs_image_consent' });
    expect(decideRoute('read_image', { ...img, imageConsent: true }, noNano, open)).toMatchObject({ route: 'cloud' });
    expect(decideRoute('read_image', { ...img, imageConsent: true }, noNano, strict)).toMatchObject({ route: 'blocked', reason: 'on_device_only_no_nano' });
    expect(decideRoute('read_image', { ...img, imageMime: 'image/webp' }, nanoEn, strict)).toMatchObject({ route: 'blocked', reason: 'image_type_not_on_device' });
    expect(decideRoute('read_image', { ...img, imageConsent: true }, offlineNoNano, open)).toMatchObject({ route: 'blocked', reason: 'offline' });
  });

  it('uses SDK hybrid mode for English summaries when both are allowed', () => {
    expect(decideRoute('summarise', { lang: 'en', chars: 800 }, nanoEn, open)).toEqual({ route: 'hybrid', reason: 'nano_ready_cloud_allowed', outputLang: 'en' });
    expect(decideRoute('summarise', { lang: 'en', chars: 800 }, nanoEn, strict)).toEqual({ route: 'device', reason: 'nano_ready', outputLang: 'en' });
  });

  it('routes Hindi/Marathi narrative to the cloud, or to English Nano when cloud is not allowed', () => {
    expect(decideRoute('summarise', { lang: 'hi', chars: 800 }, nanoEn, open)).toMatchObject({ route: 'cloud', reason: 'lang_not_on_device', outputLang: 'hi' });
    expect(decideRoute('summarise', { lang: 'mr', chars: 800 }, nanoEn, strict)).toMatchObject({ route: 'device', reason: 'lang_not_on_device', outputLang: 'en' });
    expect(decideRoute('summarise', { lang: 'hi', chars: 800 }, offlineNano, open)).toMatchObject({ route: 'device', outputLang: 'en' });
  });

  it('uses Nano for Hindi automatically if a future Nano supports it', () => {
    const nanoHi: Capabilities = { ...nanoEn, nanoLangs: ['en', 'hi'] };
    expect(decideRoute('summarise', { lang: 'hi', chars: 800 }, nanoHi, strict)).toMatchObject({ route: 'device', outputLang: 'hi' });
  });

  it('falls back to deterministic rules when no model may run', () => {
    expect(decideRoute('summarise', { lang: 'en', chars: 800 }, noNano, strict)).toMatchObject({ route: 'local_rules', reason: 'on_device_only_no_nano' });
    expect(decideRoute('answer', { lang: 'en', chars: 800 }, offlineNoNano, open)).toMatchObject({ route: 'local_rules', reason: 'offline' });
    expect(decideRoute('summarise', { lang: 'en', chars: 800 }, { ...noNano, cloudConfigured: false }, open)).toMatchObject({ route: 'local_rules', reason: 'cloud_not_configured' });
    expect(decideRoute('summarise', { lang: 'en', chars: 800 }, noNano, { onDeviceOnly: false, allowCloudForRedacted: false })).toMatchObject({ route: 'local_rules', reason: 'cloud_not_allowed' });
  });

  it('sends long documents to the cloud', () => {
    expect(decideRoute('summarise', { lang: 'en', chars: 50000 }, nanoEn, open)).toMatchObject({ route: 'cloud', reason: 'too_long_for_device' });
    expect(decideRoute('summarise', { lang: 'en', chars: 50000 }, nanoEn, strict)).toMatchObject({ route: 'local_rules', reason: 'too_long_for_device' });
  });

  it('prefers cloud for the doctor checklist but falls back to Nano offline', () => {
    expect(decideRoute('checklist', { lang: 'en', chars: 800 }, nanoEn, open)).toMatchObject({ route: 'cloud_first' });
    expect(decideRoute('checklist', { lang: 'hi', chars: 800 }, nanoEn, open)).toMatchObject({ route: 'cloud' });
    expect(decideRoute('checklist', { lang: 'en', chars: 800 }, offlineNano, open)).toMatchObject({ route: 'device' });
    expect(decideRoute('checklist', { lang: 'en', chars: 800 }, offlineNoNano, open)).toMatchObject({ route: 'local_rules' });
  });

  it('keeps deep analysis in the cloud only', () => {
    expect(decideRoute('deep_analysis', { lang: 'en', chars: 30000 }, nanoEn, open)).toMatchObject({ route: 'cloud' });
    expect(decideRoute('deep_analysis', { lang: 'en', chars: 30000 }, nanoEn, strict)).toMatchObject({ route: 'blocked', reason: 'on_device_only' });
  });

  it('never routes to the cloud when on-device-only is set (exhaustive)', () => {
    const tasks = ['detect_pii', 'read_image', 'structure_text', 'summarise', 'answer', 'checklist', 'deep_analysis'] as const;
    const capsList = [nanoEn, noNano, offlineNano, offlineNoNano, { ...nanoEn, nano: 'downloadable' as const }];
    for (const task of tasks)
      for (const caps of capsList)
        for (const lang of ['en', 'hi', 'mr'] as const)
          for (const imageConsent of [true, false]) {
            const d = decideRoute(task, { lang, chars: 900, imageMime: 'image/png', imageConsent }, caps, strict);
            expect(mayUseCloud(d.route), `${task}/${caps.nano}/${lang}`).toBe(false);
          }
  });
});
