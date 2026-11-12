import { describe, expect, it } from 'vitest';
import en from '../../src/i18n/en.json';
import hi from '../../src/i18n/hi.json';
import mr from '../../src/i18n/mr.json';

function flatten(o: Record<string, unknown>, p = ''): Record<string, string> {
  return Object.entries(o).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object') Object.assign(acc, flatten(v as Record<string, unknown>, key));
    else acc[key] = String(v);
    return acc;
  }, {});
}

describe('UI translations', () => {
  const E = flatten(en);
  it.each([
    ['hi', flatten(hi)],
    ['mr', flatten(mr)],
  ])('%s has exactly the English keys and the same placeholders', (_l, T) => {
    expect(Object.keys(T).sort()).toEqual(Object.keys(E).sort());
    for (const [k, v] of Object.entries(E)) {
      const ph = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();
      expect(ph(T[k]!), k).toEqual(ph(v));
      expect(T[k]!.trim().length, k).toBeGreaterThan(0);
    }
  });
});
