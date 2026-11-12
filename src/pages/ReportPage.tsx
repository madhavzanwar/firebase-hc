import { AlertOctagon, ArrowLeft, ClipboardList, EyeOff, Loader2, Microscope, Pill, RefreshCw, Send, Sun, Sunrise, Moon, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isCritical, isOutOfRange, sortByConcern } from '../lib/classify';
import { displayName } from '../lib/explain';
import { LANG_LABELS, type Lang } from '../lib/i18n-types';
import { describeMedicine } from '../lib/rx';
import type { SavedReport } from '../lib/types';
import { BlockedError } from '../ai/engine';
import { answer, checklist, deepAnalysis, summarise } from '../app/pipeline';
import { navigate } from '../app/router';
import { useApp } from '../app/state';
import { Markdown } from '../components/Markdown';
import { ResultCard } from '../components/ResultCard';
import { SourceBadge } from '../components/SourceBadge';

function formatDate(iso: string, lang: Lang) {
  const d = new Date(iso + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(LANG_LABELS[lang].bcp47, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ReportPage({ id }: { id: string }) {
  const { t } = useTranslation();
  const { reports, lang, ctx, upsertReport, removeReport, prefs, caps } = useApp();
  const report = reports.find((r) => r.id === id);
  const [filter, setFilter] = useState<'all' | 'out'>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const genFor = useRef<string>('');

  const latest = useRef(report);
  useEffect(() => {
    latest.current = report;
  }, [report]);
  const save = async (patch: (r: SavedReport) => SavedReport) => {
    const cur = latest.current;
    if (!cur) return;
    const next = { ...patch(cur), updatedAt: Date.now() };
    latest.current = next;
    await upsertReport(next);
  };

  // Generate the narrative for a newly selected language on demand.
  useEffect(() => {
    if (!report || report.summaries[lang] || genFor.current === `${report.id}:${lang}`) return;
    genFor.current = `${report.id}:${lang}`;
    setBusy('summary');
    void summarise(report, lang, ctx())
      .then((n) => save((r) => ({ ...r, summaries: { ...r.summaries, [lang]: n } })))
      .finally(() => setBusy(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id, lang]);

  const trendTests = useMemo(() => {
    const count = new Map<string, number>();
    for (const r of reports) for (const row of r.rows) if (row.testId && row.canonicalValue !== undefined) count.set(row.testId, (count.get(row.testId) ?? 0) + 1);
    return new Set([...count].filter(([, n]) => n >= 2).map(([k]) => k));
  }, [reports]);

  if (!report) {
    return (
      <div className="card">
        <p>{t('errors.generic')}</p>
        <a href="#/" className="btn-primary mt-3">{t('report.back')}</a>
      </div>
    );
  }

  const rows = sortByConcern(report.rows);
  const out = rows.filter((r) => isOutOfRange(r.flag));
  const critical = rows.filter((r) => isCritical(r.flag));
  const shown = filter === 'out' ? out : rows;
  const summary = report.summaries[lang];
  const checklistItems = report.checklist?.[lang];
  const deep = report.deep?.[lang];
  const qa = report.qa ?? [];
  const redactionTotal = Object.values(report.redactions).reduce((a, b) => a + (b ?? 0), 0);
  const deepAllowed = !prefs.onDeviceOnly && prefs.allowCloudForRedacted && caps.online && caps.cloudConfigured;

  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof BlockedError ? e.reason : 'generic');
      if (!(e instanceof BlockedError)) console.error(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="space-y-5" aria-labelledby="report-title" data-testid="report">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-ghost -ml-3" onClick={() => navigate({ name: 'home' })}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t('report.back')}
        </button>
        <button
          type="button"
          className="btn-ghost ml-auto text-red-800 hover:bg-red-50"
          onClick={() => void removeReport(report.id).then(() => navigate({ name: 'history' }))}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          {t('report.delete')}
        </button>
      </div>

      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-800">{t(`report.${report.kind}`)}</p>
        <h1 id="report-title" className="text-2xl font-extrabold tracking-tight">{report.title}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-700">
          <span>
            {t('report.date')}: {formatDate(report.date, lang)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1.5">
            {t('report.readBy')} <SourceBadge source={report.readSource} />
          </span>
          <span aria-hidden="true">·</span>
          <span>{t('report.saved')}</span>
        </p>
      </header>

      {critical.length > 0 && (
        <div role="alert" className="flex gap-3 rounded-2xl bg-red-700 p-4 text-white shadow-lg" data-testid="urgent-banner">
          <AlertOctagon aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          <div>
            <p className="text-lg font-bold">{t('report.urgentTitle')}</p>
            <p className="mt-1">
              {t('report.urgentBody', {
                tests: critical.map((r) => displayName(r, lang)).join(', '),
                verb: critical.length === 1 ? t('report.urgentVerbOne') : t('report.urgentVerbMany'),
              })}
            </p>
          </div>
        </div>
      )}

      <section className="card" aria-labelledby="sum-h" data-testid="summary">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="sum-h" className="text-lg font-bold">{t('report.summary')}</h2>
          {summary && <SourceBadge source={summary.source} model={summary.model} />}
          <button
            type="button"
            className="btn-ghost ml-auto min-h-9 px-2 text-sm"
            disabled={busy === 'summary'}
            onClick={() =>
              void act('summary', async () => {
                const n = await summarise(report, lang, ctx());
                await save((r) => ({ ...r, summaries: { ...r.summaries, [lang]: n } }));
              })
            }
          >
            <RefreshCw aria-hidden="true" className={`size-4 ${busy === 'summary' ? 'animate-spin' : ''}`} />
            {t('report.regenerate')}
          </button>
        </div>
        {busy === 'summary' && !summary ? (
          <p className="mt-3 flex items-center gap-2 text-slate-600">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />…
          </p>
        ) : summary ? (
          <div className="mt-3" lang={LANG_LABELS[summary.lang].bcp47} data-testid="summary-text">
            <Markdown text={summary.text} />
            {summary.lang !== lang && <p className="mt-3 text-sm text-slate-600">{t('report.langNote', { lang: LANG_LABELS[lang].native })}</p>}
          </div>
        ) : null}
        <p className="mt-4 text-xs text-slate-600">{t('report.disclaimer')}</p>
      </section>

      <section className="card" aria-labelledby="priv-h">
        <h2 id="priv-h" className="flex items-center gap-2 font-bold">
          <EyeOff aria-hidden="true" className="size-5 text-emerald-700" />
          {t('report.privacy')}
        </h2>
        {report.redactedText === undefined ? (
          <p className="mt-2 text-sm text-slate-700">{t('report.privacyImage')}</p>
        ) : redactionTotal === 0 ? (
          <p className="mt-2 text-sm text-slate-700">{t('report.privacyNone')}</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2" data-testid="redactions">
            {Object.entries(report.redactions).map(([k, n]) => (
              <li key={k} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-600/30">
                [{k}] × {n}
              </li>
            ))}
          </ul>
        )}
        {report.redactedText && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-brand-800">{t('report.viewRedacted')}</summary>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs text-slate-100" data-testid="redacted-text">
              {report.redactedText}
            </pre>
          </details>
        )}
      </section>

      {rows.length > 0 && (
        <section aria-labelledby="res-h">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="res-h" className="text-lg font-bold">{t('report.results')}</h2>
            <div role="group" aria-label={t('report.results')} className="ml-auto flex rounded-xl border border-slate-300 bg-white p-0.5 text-sm">
              {(['all', 'out'] as const).map((f) => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`min-h-9 rounded-lg px-3 font-semibold ${filter === f ? 'bg-slate-900 text-white' : 'text-slate-700'}`}>
                  {f === 'all' ? t('report.showAll', { n: rows.length }) : t('report.showOut', { n: out.length })}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-600">{t('flags.legend')}</p>
          <ul className="mt-3 space-y-3">
            {shown.map((r, i) => (
              <ResultCard key={`${r.name}-${i}`} row={r} lang={lang} hasTrend={!!r.testId && trendTests.has(r.testId)} defaultOpen={isOutOfRange(r.flag)} />
            ))}
          </ul>
        </section>
      )}

      {report.medicines.length > 0 && (
        <section className="card" aria-labelledby="med-h" data-testid="medicines">
          <h2 id="med-h" className="flex items-center gap-2 text-lg font-bold">
            <Pill aria-hidden="true" className="size-5 text-brand-700" />
            {t('report.medicines')}
          </h2>
          <ul className="mt-3 divide-y divide-slate-200">
            {report.medicines.map((m, i) => (
              <li key={i} className="py-3">
                <p className="font-semibold text-slate-900">
                  {m.name} {m.strength && <span className="font-medium text-slate-600">{m.strength}</span>}
                </p>
                {m.pattern && (
                  <p className="mt-1 flex gap-3 text-sm" aria-hidden="true">
                    {[Sunrise, Sun, Moon].map((Icon, k) => (
                      <span key={k} className={`flex items-center gap-1 rounded-lg px-2 py-0.5 ${m.pattern![k] ? 'bg-brand-50 font-bold text-brand-900' : 'text-slate-400'}`}>
                        <Icon className="size-4" />
                        {m.pattern![k] ?? 0}
                      </span>
                    ))}
                  </p>
                )}
                <p className="mt-1 text-sm text-slate-800">
                  <span className="sr-only">{t('report.schedule')}: </span>
                  {describeMedicine(m, lang)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-600">{t('report.verifyMeds')}</p>
        </section>
      )}

      {rows.length === 0 && report.medicines.length === 0 && <p className="card text-slate-700">{t('report.noRows')}</p>}

      <section className="card" aria-labelledby="ask-h">
        <h2 id="ask-h" className="text-lg font-bold">{t('report.ask')}</h2>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            const question = q.trim();
            if (!question) return;
            void act('ask', async () => {
              const res = await answer(report, question, lang, ctx());
              setQ('');
              await save((r) => ({ ...r, qa: [...(r.qa ?? []), { q: question, a: res.a, source: res.source, lang: res.lang, at: Date.now() }] }));
            });
          }}
        >
          <label htmlFor="ask-input" className="sr-only">{t('report.ask')}</label>
          <input
            id="ask-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('report.askPlaceholder')}
            className="min-h-11 flex-1 rounded-xl border border-slate-300 px-3"
            aria-describedby="ask-hint"
            data-testid="ask-input"
          />
          <button type="submit" className="btn-primary" disabled={busy === 'ask' || !q.trim()}>
            {busy === 'ask' ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Send aria-hidden="true" className="size-4" />}
            {t('report.askButton')}
          </button>
        </form>
        <p id="ask-hint" className="mt-1 text-xs text-slate-600">{t('report.askHint')}</p>
        {qa.length > 0 && (
          <ul className="mt-4 space-y-3" aria-live="polite" data-testid="qa">
            {qa.map((x, i) => (
              <li key={i} className="rounded-xl bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">{x.q}</p>
                <div className="mt-1 text-sm" lang={LANG_LABELS[x.lang].bcp47}>
                  <Markdown text={x.a} />
                </div>
                <div className="mt-2">
                  <SourceBadge source={x.source} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card" aria-labelledby="chk-h">
          <h2 id="chk-h" className="flex items-center gap-2 text-lg font-bold">
            <ClipboardList aria-hidden="true" className="size-5 text-brand-700" />
            {t('report.checklist')}
          </h2>
          {checklistItems ? (
            <>
              <div className="mt-2">
                <SourceBadge source={checklistItems.source} />
              </div>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-800" data-testid="checklist">
                {checklistItems.items.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ol>
            </>
          ) : (
            <button
              type="button"
              className="btn-secondary mt-3"
              disabled={busy === 'checklist'}
              onClick={() =>
                void act('checklist', async () => {
                  const res = await checklist(report, lang, ctx());
                  await save((r) => ({ ...r, checklist: { ...r.checklist, [lang]: { ...res, at: Date.now() } } }));
                })
              }
              data-testid="checklist-button"
            >
              {busy === 'checklist' && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {t('report.checklistButton')}
            </button>
          )}
        </section>

        <section className="card" aria-labelledby="deep-h">
          <h2 id="deep-h" className="flex items-center gap-2 text-lg font-bold">
            <Microscope aria-hidden="true" className="size-5 text-sky-700" />
            {t('report.deep')}
          </h2>
          <p className="mt-1 text-sm text-slate-700">{t('report.deepHint')}</p>
          {deep ? (
            <div className="mt-3" data-testid="deep">
              <SourceBadge source={deep.source} model={deep.model} />
              <div className="mt-2 text-sm">
                <Markdown text={deep.text} />
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary mt-3"
                disabled={!deepAllowed || busy === 'deep'}
                onClick={() =>
                  void act('deep', async () => {
                    const n = await deepAnalysis(report, lang, ctx());
                    await save((r) => ({ ...r, deep: { ...r.deep, [lang]: n } }));
                  })
                }
              >
                {busy === 'deep' && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
                {t('report.deepButton')}
              </button>
              {!deepAllowed && <p className="mt-2 text-xs text-slate-600">{t('report.deepBlocked')}</p>}
            </>
          )}
        </section>
      </div>

      {err && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-900 ring-1 ring-red-600/30">
          {t(`errors.${err}`, { defaultValue: t('errors.generic') })}
        </p>
      )}
    </article>
  );
}
