import { describe, expect, it } from 'vitest';
import { looksUnredacted, redact, summariseFindings } from '../../src/lib/redact';

describe('redact', () => {
  it('masks labelled fields but keeps age, sex and results', () => {
    const input = 'Patient Name : Mrs. Priya Deshmukh      Age/Sex : 34 Y / F\nHaemoglobin  9.8  g/dL  12.0 - 15.5';
    const { text, findings } = redact(input);
    expect(text).not.toMatch(/Priya|Deshmukh/);
    expect(text).toContain('Age/Sex : 34 Y / F');
    expect(text).toContain('Haemoglobin  9.8  g/dL  12.0 - 15.5');
    expect(summariseFindings(findings).NAME).toBeGreaterThan(0);
  });
  it('masks Indian phone numbers in all common formats', () => {
    for (const p of ['98765 43210', '+91 98765 43210', '+91-9876543210', '09876543210', '9876543210']) {
      expect(redact(`call ${p} now`).text).toBe('call [PHONE] now');
    }
    expect(redact('Phone : 022-2456 7890').text).toBe('Phone : [PHONE]');
  });
  it('masks Aadhaar, ABHA, PAN and email', () => {
    expect(redact('id 2345 6789 0123').text).toBe('id [ID]');
    expect(redact('ABHA 91-1234-5678-9012').text).toBe('ABHA [ID]');
    expect(redact('PAN ABCDE1234F').text).toBe('PAN [ID]');
    expect(redact('mail me a.b+c@example.co.in').text).toBe('mail me [EMAIL]');
  });
  it('masks honorific names and doctors', () => {
    expect(redact('Seen by Dr. Anil Kulkarni today').text).toBe('Seen by [DOCTOR] today');
    expect(redact('for Shri Ganesh Patil').text).toBe('for [NAME]');
    expect(redact('रोगी श्रीमती सुनीता अग्रवाल').text).toBe('रोगी [NAME]');
  });
  it('masks Hindi and Marathi labelled fields', () => {
    const hi = redact('रोगी का नाम : श्रीमती सुनीता अग्रवाल      उम्र : 45 वर्ष\nपता : 22, गांधी नगर, जयपुर - 302015');
    expect(hi.text).not.toMatch(/सुनीता|अग्रवाल|गांधी|302015/);
    expect(hi.text).toContain('उम्र : 45 वर्ष');
    const mr = redact('रुग्णाचे नाव : श्री अमोल जाधव      वय : 28 वर्ष\nपत्ता : 7, गंगापूर रोड');
    expect(mr.text).not.toMatch(/अमोल|जाधव|गंगापूर/);
    expect(mr.text).toContain('वय : 28 वर्ष');
  });
  it('masks IDs with labels', () => {
    expect(redact('UHID : SDL-2026-004512      Ref. By : Dr. Anil').text).toBe('UHID : [ID]      Ref. By : [DOCTOR]');
    expect(redact('Lab No : ML-77341').text).toBe('Lab No : [ID]');
  });
  it('masks names proposed by the on-device model everywhere, including surname alone', () => {
    const { text } = redact('Report for Kavya Nair.\nNote: Nair to repeat test.', { extraEntities: [{ text: 'Kavya Nair', type: 'NAME' }] });
    expect(text).not.toMatch(/Kavya|Nair/);
  });
  it('never masks lab values, urine pH or test names, even if the model suggests them', () => {
    const input = 'Platelet Count  250000  /cumm  150000 - 410000\npH : 6.0\nGlucose  98  mg/dL  70 - 100';
    const { text } = redact(input, { extraEntities: [{ text: 'Glucose', type: 'NAME' }] });
    expect(text).toBe(input);
  });
  it('keeps the collection date (needed for trends) but masks date of birth', () => {
    const { text } = redact('DOB : 12/01/1980\nCollected On : 14/02/2026');
    expect(text).toBe('DOB : [DOB]\nCollected On : 14/02/2026');
  });
  it('looksUnredacted is a final safety check', () => {
    expect(looksUnredacted('Haemoglobin 9.8 g/dL')).toBe(false);
    expect(looksUnredacted('call 98765 43210')).toBe(true);
    expect(looksUnredacted(redact('call 98765 43210').text)).toBe(false);
  });
});
