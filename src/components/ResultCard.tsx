import { ChevronDown, LineChart, MessageCircleQuestion } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ClassifiedRow } from '../lib/classify';
import { explainRow } from '../lib/explain';
import type { Lang } from '../lib/i18n-types';
import { formatRange } from '../lib/ranges';
import { TESTS_BY_ID } from '../lib/tests-kb';
import { href } from '../app/router';
import { FlagPill } from './FlagPill';
import { RangeBar } from './RangeBar';

export function ResultCard({ row, lang, hasTrend, defaultOpen }: { row: ClassifiedRow; lang: Lang; hasTrend: boolean; defaultOpen: boolean }) {
  const { t } = useTranslation();
  const e = explainRow(row, lang);
  const info = row.testId ? TESTS_BY_ID.get(row.testId) : undefined;
  const range = row.parsedRange ? formatRange(row.parsedRange) + (row.rangeSource === 'default' && info ? ` ${info.unit}` : '') : row.range;
  const critical = row.flag.startsWith('critical');
  return (
    <li className={`card p-4 ${critical ? 'border-red-700 ring-2 ring-red-700/30' : ''}`} data-testid="result" data-test-id={row.testId ?? ''} data-flag={row.flag}>
      <details open={defaultOpen} className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-slate-900">{e.title}</span>
            {e.title !== row.name && <span className="block text-xs text-slate-600">{row.name}</span>}
          </span>
          <span className="text-right">
            <span className="block text-lg font-bold tabular-nums text-slate-900">
              {row.value}
              {row.unit && <span className="ml-1 text-sm font-medium text-slate-600">{row.unit}</span>}
            </span>
            {range && (
              <span className="block text-xs text-slate-600">
                {row.rangeSource === 'default' ? t('report.rangeDefault') : t('report.range')}: {range}
              </span>
            )}
          </span>
          <FlagPill flag={row.flag} lang={lang} />
          <ChevronDown aria-hidden="true" className="size-5 text-slate-500 transition group-open:rotate-180" />
          <span className="sr-only">{t('report.explain')}</span>
        </summary>
        <RangeBar row={row} />
        <div className="mt-3 space-y-1.5 text-sm text-slate-800">
          {e.lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
        {e.ask && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-brand-50 p-2.5 text-sm font-medium text-brand-900">
            <MessageCircleQuestion aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {e.ask}
          </p>
        )}
        {hasTrend && row.testId && (
          <a href={href({ name: 'history', test: row.testId })} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 underline underline-offset-2">
            <LineChart aria-hidden="true" className="size-4" />
            {t('report.trend')}
          </a>
        )}
      </details>
    </li>
  );
}
