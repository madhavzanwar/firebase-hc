import { describe, expect, it } from 'vitest';
import { classifyRow, inferScale, sortByConcern } from '../../src/lib/classify';
import { matchTest } from '../../src/lib/match';
import { parseRange } from '../../src/lib/ranges';
import { TESTS, TESTS_BY_ID } from '../../src/lib/tests-kb';
import { LANGS } from '../../src/lib/i18n-types';

describe('matchTest', () => {
  it.each([
    ['Haemoglobin', 'haemoglobin'],
    ['Hemoglobin (Hb)', 'haemoglobin'],
    ['हीमोग्लोबिन', 'haemoglobin'],
    ['Glucose - Fasting (FBS)', 'glucose_fasting'],
    ['उपाशीपोटी रक्तशर्करा', 'glucose_fasting'],
    ['HDL Cholesterol', 'hdl'],
    ['LDL Cholesterol', 'ldl'],
    ['Total Cholesterol', 'cholesterol_total'],
    ['S. Creatinine', 'creatinine'],
    ['SGPT (ALT)', 'alt'],
    ['25-OH Vitamin D', 'vitamin_d'],
    ['Vitamin B12', 'vitamin_b12'],
    ['Platelet Count', 'platelets'],
    ['पांढऱ्या रक्तपेशी', 'wbc'],
    ['Urine Glucose', 'urine_glucose'],
    ['K', 'potassium'],
  ])('%s → %s', (name, id) => {
    expect(matchTest(name)?.id).toBe(id);
  });
  it.each(['LDL/HDL Ratio', 'Page 1 of 2', 'Remarks', 'Vitamin K drink', 'Urine Colour'])('does not match %s', (name) => {
    expect(matchTest(name)).toBeUndefined();
  });
});

describe('knowledge base', () => {
  it('has every string in every language and unique ids', () => {
    const ids = new Set<string>();
    for (const test of TESTS) {
      expect(ids.has(test.id)).toBe(false);
      ids.add(test.id);
      for (const field of ['name', 'what', 'low', 'high', 'askLow', 'askHigh'] as const) {
        const v = test[field];
        if (!v) continue;
        for (const l of LANGS) expect(v[l], `${test.id}.${field}.${l}`).toMatch(/\S/);
      }
      if (test.low) expect(test.askLow, `${test.id}.askLow`).toBeDefined();
      if (test.high) expect(test.askHigh, `${test.id}.askHigh`).toBeDefined();
    }
    expect(TESTS.length).toBeGreaterThanOrEqual(30);
  });
});

describe('classifyRow', () => {
  it('uses the report range over defaults', () => {
    const r = classifyRow({ name: 'Haemoglobin', value: '12.5', unit: 'g/dL', range: '13 - 17' });
    expect(r.flag).toBe('low');
    expect(r.rangeSource).toBe('report');
  });
  it('falls back to sex-specific default ranges', () => {
    expect(classifyRow({ name: 'Haemoglobin', value: '12.5' }, 'female').flag).toBe('normal');
    expect(classifyRow({ name: 'Haemoglobin', value: '12.5' }, 'male').flag).toBe('low');
    expect(classifyRow({ name: 'Haemoglobin', value: '12.5' }, 'male').rangeSource).toBe('default');
  });
  it('flags critical values from canonical thresholds', () => {
    expect(classifyRow({ name: 'Potassium', value: '6.8', range: '3.5 - 5.1' }).flag).toBe('critical_high');
    expect(classifyRow({ name: 'Haemoglobin', value: '6.2', range: '12 - 15' }).flag).toBe('critical_low');
    expect(classifyRow({ name: 'Glucose Random', value: '45', range: '70 - 140' }).flag).toBe('critical_low');
  });
  it('converts lakh platelet counts before checking critical limits', () => {
    const p = classifyRow({ name: 'Platelet Count', value: '0.15', unit: 'lakh/cumm', range: '1.5 - 4.1' });
    expect(p.canonicalValue).toBe(15000);
    expect(p.flag).toBe('critical_low');
    const ok = classifyRow({ name: 'Platelet Count', value: '2.4', unit: 'lakh/cumm', range: '1.5 - 4.1' });
    expect(ok.flag).toBe('normal');
    expect(ok.canonicalValue).toBe(240000);
  });
  it('infers scale from the range when the unit is unclear', () => {
    const test = TESTS_BY_ID.get('platelets')!;
    expect(inferScale(test, '/cumm', parseRange('150 - 410'))).toBe(1000);
    expect(inferScale(test, '', parseRange('150000 - 410000'))).toBe(1);
    expect(inferScale(TESTS_BY_ID.get('glucose_fasting')!, 'mmol/L', parseRange('3.9 - 5.6'))).toBe(18);
  });
  it('applies clinical bands (HbA1c, vitamin D)', () => {
    expect(classifyRow({ name: 'HbA1c', value: '6.0', range: '4 - 6.2' }).flag).toBe('borderline');
    expect(classifyRow({ name: 'HbA1c', value: '7.2', range: '4 - 5.6' }).band?.label.en).toBe('diabetes range');
    expect(classifyRow({ name: 'Vitamin D', value: '25', range: '20 - 100' }).flag).toBe('borderline');
  });
  it('handles qualitative urine results', () => {
    expect(classifyRow({ name: 'Urine Protein', value: 'Nil' }).flag).toBe('normal');
    expect(classifyRow({ name: 'Urine Protein', value: '++' }).flag).toBe('abnormal');
    expect(classifyRow({ name: 'Urine Glucose', value: 'Absent' }).flag).toBe('normal');
  });
  it('leaves unknown tests without a range as unknown', () => {
    expect(classifyRow({ name: 'Mystery Marker', value: '12' }).flag).toBe('unknown');
  });
  it('handles below-detection values', () => {
    expect(classifyRow({ name: 'CRP', value: '<0.5', range: '< 6' }).flag).toBe('normal');
  });
  it('sorts by concern', () => {
    const rows = [
      classifyRow({ name: 'Haemoglobin', value: '14', range: '13-17' }),
      classifyRow({ name: 'Potassium', value: '7', range: '3.5-5.1' }),
      classifyRow({ name: 'Sodium', value: '130', range: '135-145' }),
    ];
    expect(sortByConcern(rows).map((r) => r.testId)).toEqual(['potassium', 'sodium', 'haemoglobin']);
  });
});
