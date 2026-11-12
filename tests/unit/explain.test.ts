import { describe, expect, it } from 'vitest';
import { classifyRow } from '../../src/lib/classify';
import { explainRow, findingsPayload, ruleChecklist, ruleSummary } from '../../src/lib/explain';

describe('explain', () => {
  const hb = classifyRow({ name: 'Haemoglobin', value: '9.8', unit: 'g/dL', range: '12.0 - 15.5' });
  const k = classifyRow({ name: 'Potassium', value: '6.8', unit: 'mmol/L', range: '3.5 - 5.1' });
  const ok = classifyRow({ name: 'Calcium', value: '9', unit: 'mg/dL', range: '8.6 - 10.2' });

  it('explains a low value with a doctor prompt in each language', () => {
    expect(explainRow(hb, 'en')).toMatchObject({ title: 'Haemoglobin', flagLabel: 'Low', urgent: false });
    expect(explainRow(hb, 'en').lines.join(' ')).toContain("The report's normal range is 12–15.5.");
    expect(explainRow(hb, 'en').ask).toMatch(/^Talk to your doctor about the cause of anaemia/);
    expect(explainRow(hb, 'hi').ask).toContain('डॉक्टर');
    expect(explainRow(hb, 'mr').ask).toContain('डॉक्टरांशी');
  });
  it('marks critical values urgent', () => {
    const e = explainRow(k, 'en');
    expect(e.urgent).toBe(true);
    expect(e.lines.join(' ')).toMatch(/contact a doctor today/);
  });
  it('explains normal values without a doctor prompt', () => {
    expect(explainRow(ok, 'en').ask).toBeUndefined();
  });
  it('summarises deterministically', () => {
    expect(ruleSummary([hb, k, ok], 'en')).toBe('2 of 3 results are outside the normal range: Potassium (critically high), Haemoglobin (low). 1 result(s) need prompt medical attention.');
    expect(ruleSummary([], 'hi')).toContain('LabLens');
    expect(ruleChecklist([hb, k, ok], 'en')[0]).toMatch(/kidney function/);
  });
  it('builds a minimised payload with no free text', () => {
    const p = findingsPayload([hb, k], { age: 34, sex: 'female' });
    expect(p).toBe('Patient: age 34, female\n- Haemoglobin: 9.8 g/dL (range 12–15.5; low)\n- Potassium: 6.8 mmol/L (range 3.5–5.1; critical high)');
  });
});
