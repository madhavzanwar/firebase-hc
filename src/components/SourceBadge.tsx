import { Cpu, Cloud, Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Source } from '../lib/types';

const STYLE: Record<Source, string> = {
  on_device: 'bg-emerald-50 text-emerald-800 ring-emerald-600/30',
  in_cloud: 'bg-sky-50 text-sky-800 ring-sky-600/30',
  rules: 'bg-slate-100 text-slate-700 ring-slate-500/30',
};

/** The "Processed on device / in cloud" badge shown on every answer. */
export function SourceBadge({ source, model }: { source: Source; model?: string | undefined }) {
  const { t } = useTranslation();
  const Icon = source === 'on_device' ? Cpu : source === 'in_cloud' ? Cloud : Scale;
  const title = t(`source.${source}_long`) + (model ? ` (${model})` : '');
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STYLE[source]}`}
      title={title}
      data-testid="source-badge"
      data-source={source}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {t(`source.${source}`)}
      <span className="sr-only">: {title}</span>
    </span>
  );
}
