import { describe, expect, it } from 'vitest';
import { parseDocument, parseLabLine } from '../../src/lib/parse-report';
import { describeMedicine, dosesPerDay, parseMedicineLine } from '../../src/lib/rx';

describe('parseLabLine', () => {
  it.each([
    ['Haemoglobin            9.8   L     g/dL           12.0 - 15.5', { name: 'Haemoglobin', value: '9.8', unit: 'g/dL', range: '12.0 - 15.5' }],
    ['Glucose Fasting (FBS)          142  H    mg/dL    70 - 100', { name: 'Glucose Fasting (FBS)', value: '142', unit: 'mg/dL', range: '70 - 100' }],
    ['Total Cholesterol              236       mg/dL    < 200', { name: 'Total Cholesterol', value: '236', unit: 'mg/dL', range: '< 200' }],
    ['SGPT (ALT)                 88   H    U/L      Up to 45', { name: 'SGPT (ALT)', value: '88', unit: 'U/L', range: 'Up to 45' }],
    ['Haemoglobin 11.2 g/dL 13.0-17.0', { name: 'Haemoglobin', value: '11.2', unit: 'g/dL', range: '13.0-17.0' }],
    ['Haemoglobin : 11.2 g/dL (13.0-17.0)', { name: 'Haemoglobin', value: '11.2', unit: 'g/dL', range: '(13.0-17.0)' }],
    ['Vitamin B12 450 pg/mL 200 - 900', { name: 'Vitamin B12', value: '450', unit: 'pg/mL', range: '200 - 900' }],
    ['TSH 2.1', { name: 'TSH', value: '2.1' }],
    ['Urine Protein              Trace', { name: 'Urine Protein', value: 'Trace' }],
    ['हीमोग्लोबिन                12.6       g/dL        12.0 - 15.5', { name: 'हीमोग्लोबिन', value: '12.6', unit: 'g/dL', range: '12.0 - 15.5' }],
    ['Range  13.0 - 17.0 g/dL', undefined],
  ])('parses %s', (line, expected) => {
    const r = parseLabLine(line);
    if (expected === undefined) expect(r).toBeUndefined();
    else expect(r).toMatchObject(expected);
  });
  it.each(['Test Name   Result   Unit   Bio. Ref. Interval', 'Age : 34 Y', 'Page 1 of 2', '*** End of Report ***', ''])('skips %s', (line) => {
    expect(parseLabLine(line)).toBeUndefined();
  });
});

describe('parseDocument metadata', () => {
  it('reads age/sex and dates', () => {
    const d = parseDocument('Age/Sex : 34 Y / F\nCollected On : 14/02/2026\nHaemoglobin  9.8  g/dL  12 - 15.5');
    expect(d).toMatchObject({ age: 34, sex: 'female', date: '2026-02-14', kind: 'lab' });
  });
  it('reads Hindi metadata', () => {
    const d = parseDocument('उम्र : 45 वर्ष      लिंग : महिला\nदिनांक : 05/08/2026');
    expect(d).toMatchObject({ age: 45, sex: 'female', date: '2026-08-05' });
  });
});

describe('prescriptions', () => {
  it('parses morning-noon-night patterns, timing and duration', () => {
    const m = parseMedicineLine('1. Tab. Metformin 500 mg   1-0-1   after food   x 30 days')!;
    expect(m).toMatchObject({ form: 'tab', name: 'Metformin', strength: '500 mg', pattern: [1, 0, 1], timing: 'after_food', duration: '30 days' });
    expect(dosesPerDay(m)).toBe(2);
    expect(describeMedicine(m, 'en')).toBe('1 tablet in the morning, 1 tablet in the night · after food · for 30 days');
    expect(describeMedicine(m, 'hi')).toContain('खाने के बाद');
    expect(describeMedicine(m, 'mr')).toContain('जेवणानंतर');
  });
  it('parses abbreviations', () => {
    expect(parseMedicineLine('Tab. Telmisartan 40 mg   OD   before breakfast')).toMatchObject({ frequency: 'OD', timing: 'before_food' });
    expect(parseMedicineLine('Tab. Paracetamol 650 mg SOS for fever')).toMatchObject({ frequency: 'SOS', asNeeded: true });
    expect(parseMedicineLine('Cap. Vitamin D3 60000 IU weekly x 8 weeks')).toMatchObject({ name: 'Vitamin D3', frequency: 'WEEKLY', duration: '8 weeks' });
    expect(parseMedicineLine('Tab. Thyroxine 50 mcg   1-0-0   खाली पेट')).toMatchObject({ timing: 'empty_stomach', pattern: [1, 0, 0] });
  });
  it('ignores non-medicine lines', () => {
    expect(parseMedicineLine('Review after 1 month with FBS, HbA1c.')).toBeUndefined();
    expect(parseMedicineLine('Haemoglobin 9.8 g/dL')).toBeUndefined();
  });
});
