import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../app/state';

export function Help() {
  const { t } = useTranslation();
  const { wipe } = useApp();
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">{t('about.title')}</h1>
      <section className="card" aria-labelledby="nano-h">
        <h2 id="nano-h" className="text-lg font-bold">{t('about.nanoTitle')}</h2>
        <p className="mt-2 text-sm text-slate-700">{t('about.req')}</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-800">
          <li>{t('about.flag1')}</li>
          <li>{t('about.flag2')}</li>
          <li>{t('about.flag3')}</li>
        </ol>
      </section>
      <section className="card" aria-labelledby="off-h">
        <h2 id="off-h" className="text-lg font-bold">{t('about.offlineTitle')}</h2>
        <p className="mt-2 text-sm text-slate-700">{t('about.offline')}</p>
      </section>
      <section className="card" aria-labelledby="lim-h">
        <h2 id="lim-h" className="text-lg font-bold">{t('about.limitsTitle')}</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-800">
          <li>{t('about.limits1')}</li>
          <li>{t('about.limits2')}</li>
          <li>{t('about.limits3')}</li>
        </ul>
      </section>
      <section className="card border-amber-300 bg-amber-50" aria-labelledby="dis-h">
        <h2 id="dis-h" className="text-lg font-bold">{t('about.disclaimerTitle')}</h2>
        <p className="mt-2 text-sm text-amber-950">{t('about.disclaimer')}</p>
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-secondary text-red-800" onClick={() => void wipe().then(() => setDone(true))}>
          {t('about.data')}
        </button>
        {done && <span role="status" className="text-sm text-slate-700">{t('about.dataDone')}</span>}
        <a className="ml-auto text-sm font-semibold text-brand-800 underline underline-offset-2" href="https://github.com/madhavzanwar/firebase-hc" target="_blank" rel="noreferrer">
          {t('about.source')}
        </a>
      </div>
    </div>
  );
}
