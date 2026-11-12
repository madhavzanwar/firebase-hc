import { Ban, Cloud, Cpu, Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LANG_LABELS } from '../lib/i18n-types';
import { useApp } from '../app/state';

export function Privacy() {
  const { t } = useTranslation();
  const { log, clearLog, lang } = useApp();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{t('privacy.title')}</h1>
        {log.length > 0 && (
          <button type="button" className="btn-secondary ml-auto" onClick={() => void clearLog()}>
            {t('privacy.clear')}
          </button>
        )}
      </div>
      <p className="text-slate-700">{t('privacy.intro')}</p>
      {log.length === 0 ? (
        <p className="card text-slate-700">{t('privacy.empty')}</p>
      ) : (
        <ol className="space-y-2" data-testid="privacy-log">
          {log.map((e) => {
            const Icon = e.source === 'on_device' ? Cpu : e.source === 'in_cloud' ? Cloud : e.source === 'blocked' ? Ban : Scale;
            const tone = e.source === 'on_device' ? 'text-emerald-700' : e.source === 'in_cloud' ? 'text-sky-700' : e.source === 'blocked' ? 'text-red-700' : 'text-slate-600';
            return (
              <li key={e.id} className="card p-4" data-source={e.source}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Icon aria-hidden="true" className={`size-5 ${tone}`} />
                  <span className="font-semibold">{t(`privacy.task.${e.task}`, { defaultValue: e.task })}</span>
                  <span className="text-sm text-slate-700">
                    {e.source === 'in_cloud' ? t('source.in_cloud') : e.source === 'on_device' ? t('privacy.stayed') : e.source === 'blocked' ? t('privacy.blocked') : t('source.rules')}
                    {e.model ? ` · ${e.model}` : ''}
                  </span>
                  <time className="ml-auto text-xs text-slate-600" dateTime={new Date(e.at).toISOString()}>
                    {new Date(e.at).toLocaleString(LANG_LABELS[lang].bcp47)}
                  </time>
                </div>
                {e.note && <p className="mt-1 text-xs text-slate-600">{e.note}</p>}
                {e.payload !== undefined && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-semibold text-sky-800">
                      {t('privacy.sent')} ({e.chars} chars)
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs text-slate-100" data-testid="payload">{e.payload}</pre>
                  </details>
                )}
                {e.imageSent && <p className="mt-1 text-sm font-medium text-sky-800">{t('privacy.imageSent')}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
