import { Cpu, Download, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../app/state';

/** Live hybrid-AI status plus the user's privacy controls. */
export function StatusBar() {
  const { t } = useTranslation();
  const { caps, prefs, setPrefs, enableNano, downloadPct } = useApp();
  const [err, setErr] = useState(false);
  const status = downloadPct !== null ? 'downloading' : caps.nano;
  const label =
    status === 'downloading' ? t('status.nano_downloading', { pct: downloadPct ?? 0 }) : t(`status.nano_${status}`);
  const nanoTone = status === 'available' ? 'text-emerald-800' : status === 'downloadable' || status === 'downloading' ? 'text-amber-900' : 'text-slate-600';
  return (
    <div className="border-b border-slate-200 bg-slate-100/80">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 text-sm">
        <p className={`flex items-center gap-1.5 font-medium ${nanoTone}`} data-testid="nano-status" data-status={status} role="status">
          <Cpu aria-hidden="true" className="size-4" />
          {label}
        </p>
        {status === 'downloadable' && (
          <button
            type="button"
            className="btn-secondary min-h-9 px-3 py-1"
            onClick={() => {
              setErr(false);
              enableNano().catch(() => setErr(true));
            }}
          >
            <Download aria-hidden="true" className="size-4" />
            {t('status.enable')}
          </button>
        )}
        {(status === 'no_api' || status === 'unavailable' || err) && (
          <a href="#/help" className="font-medium text-brand-800 underline underline-offset-2">
            {t('status.setupHelp')}
          </a>
        )}
        <p className="flex items-center gap-1.5 text-slate-700">
          {caps.online ? <Wifi aria-hidden="true" className="size-4" /> : <WifiOff aria-hidden="true" className="size-4" />}
          {caps.online ? t('status.online') : t('status.offline')}
          {!caps.cloudConfigured && <span className="text-slate-600">· {t('status.cloudNotConfigured')}</span>}
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
          <label className="flex cursor-pointer items-center gap-2 font-semibold text-slate-800" title={t('status.onDeviceOnlyHint')}>
            <input
              type="checkbox"
              role="switch"
              aria-checked={prefs.onDeviceOnly}
              aria-describedby="odo-hint"
              checked={prefs.onDeviceOnly}
              onChange={(e) => setPrefs({ onDeviceOnly: e.target.checked })}
              className="peer sr-only"
              data-testid="on-device-only"
            />
            <span className="relative h-6 w-11 rounded-full bg-slate-400 transition peer-checked:bg-emerald-700 peer-focus-visible:outline-3 peer-focus-visible:outline-brand-600 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
            <ShieldCheck aria-hidden="true" className="size-4 text-emerald-800" />
            {t('status.onDeviceOnly')}
            <span id="odo-hint" className="sr-only">{t('status.onDeviceOnlyHint')}</span>
          </label>
          {!prefs.onDeviceOnly && (
            <label className="flex cursor-pointer items-center gap-2 text-slate-700" title={t('status.allowCloudHint')}>
              <input
                type="checkbox"
                checked={prefs.allowCloudForRedacted}
                onChange={(e) => setPrefs({ allowCloudForRedacted: e.target.checked })}
                className="size-4 accent-brand-700"
                aria-describedby="ac-hint"
              />
              {t('status.allowCloud')}
              <span id="ac-hint" className="sr-only">{t('status.allowCloudHint')}</span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
