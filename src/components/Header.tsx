import { useTranslation } from 'react-i18next';
import { LANGS, LANG_LABELS } from '../lib/i18n-types';
import { useApp } from '../app/state';
import { href, type Route } from '../app/router';

const NAV: Array<{ key: string; route: Route }> = [
  { key: 'nav.analyse', route: { name: 'home' } },
  { key: 'nav.history', route: { name: 'history' } },
  { key: 'nav.privacy', route: { name: 'privacy' } },
  { key: 'nav.about', route: { name: 'help' } },
];

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0f766e" />
      <circle cx="14" cy="14" r="7" fill="none" stroke="#fff" strokeWidth="2.6" />
      <path d="M19.5 19.5 25 25" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M10.5 14h2l1-2.5 1.6 5 1-2.5h1.4" fill="none" stroke="#5eead4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Header({ current }: { current: Route['name'] }) {
  const { t } = useTranslation();
  const { lang, setLang } = useApp();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <a href="#main" className="sr-only-focusable absolute left-2 top-2 z-50 rounded bg-white px-3 py-2 font-semibold text-brand-800 shadow">
        {t('app.skip')}
      </a>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <a href="#/" className="flex items-center gap-2 font-bold text-slate-900" aria-label="LabLens home">
          <Logo />
          <span className="text-lg tracking-tight">LabLens</span>
        </a>
        <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {NAV.map((n) => {
            const active = n.route.name === current || (current === 'report' && n.route.name === 'home');
            return (
              <a
                key={n.key}
                href={href(n.route)}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${active ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                {t(n.key)}
              </a>
            );
          })}
        </nav>
        <div role="group" aria-label={t('lang.label')} className="ml-auto flex rounded-xl border border-slate-300 p-0.5">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              lang={LANG_LABELS[l].bcp47}
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              className={`min-h-9 rounded-lg px-2.5 text-sm font-semibold ${lang === l ? 'bg-brand-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
              data-testid={`lang-${l}`}
            >
              {LANG_LABELS[l].native}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
