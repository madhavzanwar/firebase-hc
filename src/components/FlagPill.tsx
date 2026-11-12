import { AlertOctagon, ArrowDown, ArrowUp, Check, Minus, TriangleAlert } from 'lucide-react';
import type { Flag } from '../lib/classify';
import { FLAG_LABEL } from '../lib/explain';
import type { Lang } from '../lib/i18n-types';

export const FLAG_STYLE: Record<Flag, string> = {
  normal: 'bg-emerald-50 text-emerald-800 ring-emerald-600/30',
  borderline: 'bg-amber-50 text-amber-900 ring-amber-600/40',
  low: 'bg-orange-50 text-orange-900 ring-orange-600/40',
  high: 'bg-orange-50 text-orange-900 ring-orange-600/40',
  abnormal: 'bg-orange-50 text-orange-900 ring-orange-600/40',
  critical_low: 'bg-red-700 text-white ring-red-800',
  critical_high: 'bg-red-700 text-white ring-red-800',
  unknown: 'bg-slate-100 text-slate-700 ring-slate-500/30',
};

const ICON = {
  normal: Check,
  borderline: TriangleAlert,
  low: ArrowDown,
  high: ArrowUp,
  abnormal: TriangleAlert,
  critical_low: AlertOctagon,
  critical_high: AlertOctagon,
  unknown: Minus,
} as const;

/** Flag shown with colour AND icon AND text, so it never relies on colour alone. */
export function FlagPill({ flag, lang }: { flag: Flag; lang: Lang }) {
  const Icon = ICON[flag];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${FLAG_STYLE[flag]}`} data-flag={flag}>
      <Icon aria-hidden="true" className="size-3.5" />
      {FLAG_LABEL[flag][lang]}
    </span>
  );
}
