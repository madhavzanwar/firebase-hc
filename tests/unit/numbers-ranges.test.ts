import { describe, expect, it } from 'vitest';
import { normaliseDigits, parseNumber, parseResultValue } from '../../src/lib/numbers';
import { formatRange, parseRange, positionInRange } from '../../src/lib/ranges';

describe('numbers', () => {
  it('converts Devanagari digits', () => {
    expect(normaliseDigits('१३.५ - १७')).toBe('13.5 - 17');
  });
  it.each([
    ['1,250', 1250],
    ['1,50,000', 150000],
    ['12.5', 12.5],
    ['.5', 0.5],
    ['+3', 3],
    ['abc', undefined],
    ['1.2.3', undefined],
    ['', undefined],
  ])('parseNumber(%s) = %s', (raw, expected) => {
    expect(parseNumber(raw)).toBe(expected);
  });
  it('parses comparator values', () => {
    expect(parseResultValue('<0.5')).toEqual({ value: 0.5, comparator: '<' });
    expect(parseResultValue('>= 90')).toEqual({ value: 90, comparator: '>=' });
    expect(parseResultValue('Nil')).toBeUndefined();
  });
});

describe('parseRange', () => {
  it.each([
    ['13.0 - 17.0', { low: 13, high: 17 }],
    ['13–17', { low: 13, high: 17 }],
    ['4,000 - 11,000', { low: 4000, high: 11000 }],
    ['1,50,000 - 4,10,000', { low: 150000, high: 410000 }],
    ['0.4 to 4.0', { low: 0.4, high: 4 }],
    ['(150-410)', { low: 150, high: 410 }],
    ['Normal: 70-100 mg/dL', { low: 70, high: 100 }],
    ['Bio. Ref. Interval: 12 - 15.5', { low: 12, high: 15.5 }],
    ['१३ - १७', { low: 13, high: 17 }],
    ['< 200', { high: 200, highExclusive: true }],
    ['<=5.6', { high: 5.6 }],
    ['Up to 45', { high: 45 }],
    ['upto 40', { high: 40 }],
    ['Less than 150', { high: 150, highExclusive: true }],
    ['> 40', { low: 40, lowExclusive: true }],
    ['>= 40', { low: 40 }],
    ['More than 60', { low: 60, lowExclusive: true }],
    ['40 or less', { high: 40 }],
    ['60 and above', { low: 60 }],
    ['Desirable: < 200', { high: 200, highExclusive: true }],
  ])('parses %s', (raw, expected) => {
    expect(parseRange(raw)).toEqual({ ...expected, text: raw });
  });
  it.each(['', 'Negative', 'See note', '17 - 13'])('rejects %s', (raw) => {
    expect(parseRange(raw)).toBeUndefined();
  });
  it('positions values with inclusive and exclusive bounds', () => {
    const r = parseRange('13 - 17')!;
    expect(positionInRange(13, r)).toBe('within');
    expect(positionInRange(12.9, r)).toBe('below');
    expect(positionInRange(17.1, r)).toBe('above');
    const lt = parseRange('< 200')!;
    expect(positionInRange(200, lt)).toBe('above');
    expect(positionInRange(199, lt)).toBe('within');
    const gt = parseRange('> 40')!;
    expect(positionInRange(40, gt)).toBe('below');
  });
  it('formats ranges', () => {
    expect(formatRange(parseRange('13-17')!)).toBe('13–17');
    expect(formatRange(parseRange('< 200')!)).toBe('< 200');
    expect(formatRange(parseRange('Up to 45')!)).toBe('≤ 45');
    expect(formatRange(parseRange('> 40')!)).toBe('> 40');
  });
});
