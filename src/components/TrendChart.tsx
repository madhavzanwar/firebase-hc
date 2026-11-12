import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Lang } from '../lib/i18n-types';
import { LANG_LABELS } from '../lib/i18n-types';

export interface TrendPoint {
  date: string;
  value: number;
  flag: string;
}

/** Line chart for one test over time, with the normal range shaded. Accompanied by a data table for screen readers. */
export function TrendChart({ points, low, high, unit, lang, label }: { points: TrendPoint[]; low?: number | undefined; high?: number | undefined; unit: string; lang: Lang; label: string }) {
  const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(LANG_LABELS[lang].bcp47, { month: 'short', year: '2-digit' });
  const values = points.map((p) => p.value);
  const min = Math.min(...values, low ?? Infinity);
  const max = Math.max(...values, high ?? -Infinity);
  const pad = (max - min) * 0.15 || 1;
  return (
    <figure>
      <div className="h-64 w-full" aria-hidden="true" data-testid="trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 10, right: 16, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            {(low !== undefined || high !== undefined) && <ReferenceArea y1={low ?? min - pad} y2={high ?? max + pad} fill="#6ee7b7" fillOpacity={0.25} />}
            <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 12, fill: '#334155' }} />
            <YAxis domain={[Math.floor(min - pad), Math.ceil(max + pad)]} tick={{ fontSize: 12, fill: '#334155' }} width={48} />
            <Tooltip labelFormatter={(v) => fmt(String(v))} formatter={(v) => [`${String(v)} ${unit}`, label]} />
            <Line type="monotone" dataKey="value" stroke="#0f766e" strokeWidth={3} dot={{ r: 5, fill: '#0f766e' }} activeDot={{ r: 7 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{label}</figcaption>
      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr className="text-left text-slate-600">
            <th scope="col" className="py-1 font-medium">Date</th>
            <th scope="col" className="py-1 font-medium">{label}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date} className="border-t border-slate-200">
              <td className="py-1">{fmt(p.date)}</td>
              <td className="py-1 font-semibold tabular-nums">
                {p.value} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
