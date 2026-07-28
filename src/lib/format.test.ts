import { describe, expect, it } from 'vitest';
import { formatCurrency, formatPct, returnClass } from './format';

describe('formatCurrency', () => {
  it('formats a positive number with the default USD currency', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('formats using the provided currency code', () => {
    expect(formatCurrency(10, 'AUD')).toBe('A$10.00');
  });
});

describe('formatPct', () => {
  it('prefixes non-negative values with a plus sign', () => {
    expect(formatPct(0.1234)).toBe('+12.34%');
    expect(formatPct(0)).toBe('+0.00%');
  });

  it('keeps the minus sign for negative values', () => {
    expect(formatPct(-0.05)).toBe('-5.00%');
  });
});

describe('returnClass', () => {
  it('returns the green class for non-negative values', () => {
    expect(returnClass(0)).toBe('text-green-600');
    expect(returnClass(1)).toBe('text-green-600');
  });

  it('returns the red class for negative values', () => {
    expect(returnClass(-0.01)).toBe('text-red-600');
  });
});
