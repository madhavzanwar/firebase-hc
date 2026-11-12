import type { ClassifiedRow } from '../lib/classify';

/**
 * A small visual of where the value sits relative to the normal range.
 * Purely decorative (aria-hidden): the same information is in the text.
 */
export function RangeBar({ row }: { row: ClassifiedRow }) {
  const r = row.parsedRange;
  const v = row.numeric;
  if (!r || v === undefined || (r.low === undefined && r.high === undefined)) return null;
  const lo = r.low ?? 0;
  const hi = r.high ?? lo * 2 + 1;
  const span = Math.max(hi - lo, Math.abs(hi) * 0.1, 1e-6);
  const min = Math.min(lo - span * 0.6, v);
  const max = Math.max(hi + span * 0.6, v);
  const pct = (x: number) => ((x - min) / (max - min)) * 100;
  const left = r.low !== undefined ? pct(lo) : 0;
  const right = r.high !== undefined ? pct(hi) : 100;
  const out = row.flag !== 'normal' && row.flag !== 'unknown';
  return (
    <div aria-hidden="true" className="relative mt-3 h-2 w-full rounded-full bg-slate-200">
      <div className="absolute inset-y-0 rounded-full bg-emerald-300" style={{ left: `${left}%`, width: `${Math.max(right - left, 1)}%` }} />
      <div
        className={`absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 border-white shadow ${out ? 'bg-orange-600' : 'bg-emerald-700'} ${row.flag.startsWith('critical') ? 'bg-red-700' : ''}`}
        style={{ left: `${Math.min(Math.max(pct(v), 2), 98)}%` }}
      />
    </div>
  );
}
