import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classifyAll } from '../../src/lib/classify';
import { explainRow, ruleChecklist, ruleSummary } from '../../src/lib/explain';
import { LANGS } from '../../src/lib/i18n-types';
import { parseDocument } from '../../src/lib/parse-report';
import { redact } from '../../src/lib/redact';

interface Expected {
  kind: string;
  sex?: string;
  age?: number;
  date?: string;
  flags?: Record<string, string>;
  medicines?: string[];
  secrets: string[];
}

const dir = join(import.meta.dirname, '../../fixtures');
const expected = JSON.parse(readFileSync(join(dir, 'expected.json'), 'utf8')) as Record<string, Expected>;

describe.each(Object.entries(expected))('fixture %s', (file, exp) => {
  const raw = readFileSync(join(dir, file), 'utf8');
  const red = redact(raw);
  const doc = parseDocument(red.text);
  const rows = classifyAll(doc.rows, doc.sex);

  it('removes every personal identifier before parsing', () => {
    for (const s of exp.secrets) expect(red.text, `leaked "${s}"`).not.toContain(s);
  });
  it('detects document kind and metadata', () => {
    expect(doc.kind).toBe(exp.kind);
    if (exp.sex) expect(doc.sex).toBe(exp.sex);
    if (exp.age) expect(doc.age).toBe(exp.age);
    if (exp.date) expect(doc.date).toBe(exp.date);
  });
  if (exp.flags) {
    it('classifies every result as expected', () => {
      const got = Object.fromEntries(rows.filter((r) => r.testId).map((r) => [r.testId, r.flag]));
      expect(got).toEqual(exp.flags);
    });
    it('explains every row in every language', () => {
      for (const lang of LANGS) {
        for (const r of rows) {
          const e = explainRow(r, lang);
          expect(e.lines.length).toBeGreaterThan(1);
          if (r.flag !== 'normal' && r.flag !== 'unknown') expect(e.ask).toBeTruthy();
        }
        expect(ruleSummary(rows, lang).length).toBeGreaterThan(10);
        expect(ruleChecklist(rows, lang).length).toBeGreaterThan(1);
      }
    });
  }
  if (exp.medicines) {
    it('extracts medicines', () => {
      expect(doc.medicines.map((m) => m.name)).toEqual(exp.medicines);
    });
  }
});
