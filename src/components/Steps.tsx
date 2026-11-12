import { CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { StepEvent, StepId } from '../app/pipeline';
import { SourceBadge } from './SourceBadge';

const ORDER: StepId[] = ['read', 'redact', 'classify', 'explain'];

export function Steps({ steps }: { steps: Partial<Record<StepId, StepEvent>> }) {
  const { t } = useTranslation();
  return (
    <ol className="space-y-2" aria-label="Progress" aria-live="polite" data-testid="steps">
      {ORDER.map((id) => {
        const s = steps[id];
        const Icon = !s ? CircleDashed : s.status === 'running' ? Loader2 : s.status === 'error' ? XCircle : CheckCircle2;
        const tone = !s ? 'text-slate-400' : s.status === 'error' ? 'text-red-700' : s.status === 'running' ? 'text-brand-700' : 'text-emerald-700';
        return (
          <li key={id} className="flex flex-wrap items-center gap-2 text-sm">
            <Icon aria-hidden="true" className={`size-5 ${tone} ${s?.status === 'running' ? 'animate-spin' : ''}`} />
            <span className={s ? 'font-medium text-slate-900' : 'text-slate-600'}>{t(`steps.${id}`)}</span>
            {s?.status === 'done' && s.source && <SourceBadge source={s.source} />}
            {id === 'redact' && s?.status === 'done' && s.detail && s.detail !== '0' && (
              <span className="text-xs text-slate-600">{t('steps.masked', { count: Number(s.detail) })}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
