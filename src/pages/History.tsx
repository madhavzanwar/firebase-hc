import { CloudUpload, LogIn, LogOut, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isOutOfRange } from '../lib/classify';
import { LANG_LABELS } from '../lib/i18n-types';
import { TESTS_BY_ID } from '../lib/tests-kb';
import { isFirebaseConfigured } from '../ai/firebase';
import { readFile } from '../app/input';
import { analyse } from '../app/pipeline';
import { href, navigate } from '../app/router';
import { fetchSampleFile, SERIES } from '../app/samples';
import { useApp } from '../app/state';
import { signIn, signOutUser } from '../store/sync';
import { TrendChart, type TrendPoint } from '../components/TrendChart';

export function History({ test }: { test?: string | undefined }) {
  const { t } = useTranslation();
  const { reports, lang, user, syncNow, ctx, upsertReport } = useApp();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const series = useMemo(() => {
    const m = new Map<string, TrendPoint[]>();
    for (const r of reports)
      for (const row of r.rows)
        if (row.testId && row.canonicalValue !== undefined) {
          const pts = m.get(row.testId) ?? [];
          pts.push({ date: r.date, value: row.canonicalValue, flag: row.flag });
          m.set(row.testId, pts);
        }
    for (const pts of m.values()) pts.sort((a, b) => a.date.localeCompare(b.date));
    return new Map([...m].filter(([, p]) => p.length >= 2));
  }, [reports]);

  const ids = [...series.keys()];
  const selected = test && series.has(test) ? test : ids.includes('hba1c') ? 'hba1c' : ids[0];
  const info = selected ? TESTS_BY_ID.get(selected) : undefined;
  const range = info?.range?.any;

  const loadSeries = async () => {
    setBusy(true);
    try {
      for (const f of SERIES) {
        const { report } = await analyse(await readFile(await fetchSampleFile(f)), ctx(), { sample: f });
        await upsertReport(report);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">{t('history.title')}</h1>

      <section className="card" aria-labelledby="trend-h">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="trend-h" className="text-lg font-bold">{t('history.trend')}</h2>
          {ids.length > 0 && (
            <label className="ml-auto flex items-center gap-2 text-sm font-medium">
              {t('history.trendPick')}
              <select
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-2"
                value={selected}
                onChange={(e) => navigate({ name: 'history', test: e.target.value })}
                data-testid="trend-select"
              >
                {ids.map((id) => (
                  <option key={id} value={id}>
                    {TESTS_BY_ID.get(id)?.name[lang] ?? id}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {selected && info ? (
          <div className="mt-3">
            <TrendChart points={series.get(selected)!} low={range?.low} high={range?.high} unit={info.unit} lang={lang} label={info.name[lang]} />
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-slate-700">{t('history.trendEmpty')}</p>
            <button type="button" className="btn-secondary mt-3" disabled={busy} onClick={() => void loadSeries()} data-testid="load-series">
              {busy && <RefreshCw aria-hidden="true" className="size-4 animate-spin" />}
              {t('history.loadSamples')}
            </button>
          </div>
        )}
      </section>

      <section aria-labelledby="list-h">
        <h2 id="list-h" className="sr-only">{t('history.title')}</h2>
        {reports.length === 0 ? (
          <p className="card text-slate-700">{t('history.empty')}</p>
        ) : (
          <ul className="space-y-2" data-testid="history-list">
            {reports.map((r) => {
              const out = r.rows.filter((x) => isOutOfRange(x.flag)).length;
              return (
                <li key={r.id}>
                  <a href={href({ name: 'report', id: r.id })} className="card flex flex-wrap items-center gap-3 p-4 hover:border-brand-600">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-900">{r.title}</span>
                      <span className="text-sm text-slate-600">
                        {new Date(r.date + 'T00:00:00').toLocaleDateString(LANG_LABELS[lang].bcp47, { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
                        {r.rows.length ? t('history.results', { n: r.rows.length, out }) : t(`report.${r.kind}`)}
                      </span>
                    </span>
                    {out > 0 && <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-900 ring-1 ring-orange-600/40">{out}</span>}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isFirebaseConfigured && (
        <section className="card" aria-labelledby="sync-h">
          <h2 id="sync-h" className="flex items-center gap-2 text-lg font-bold">
            <CloudUpload aria-hidden="true" className="size-5 text-sky-700" />
            {t('history.sync')}
          </h2>
          <p className="mt-1 text-sm text-slate-700">{t('history.syncHint')}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {user ? (
              <>
                <span className="text-sm text-slate-700">{t('history.signedInAs', { name: user.displayName ?? user.email ?? '' })}</span>
                <button type="button" className="btn-primary" disabled={busy} onClick={() => void syncNow().then((n) => setMsg(t('history.synced', { n })))}>
                  <RefreshCw aria-hidden="true" className="size-4" />
                  {t('history.syncNow')}
                </button>
                <button type="button" className="btn-secondary" onClick={() => void signOutUser()}>
                  <LogOut aria-hidden="true" className="size-4" />
                  {t('history.signOut')}
                </button>
              </>
            ) : (
              <button type="button" className="btn-secondary" onClick={() => void signIn().then(() => syncNow()).catch((e) => setMsg(String(e?.code ?? e)))}>
                <LogIn aria-hidden="true" className="size-4" />
                {t('history.signIn')}
              </button>
            )}
          </div>
          {msg && <p className="mt-2 text-sm text-slate-700" role="status">{msg}</p>}
        </section>
      )}
    </div>
  );
}
