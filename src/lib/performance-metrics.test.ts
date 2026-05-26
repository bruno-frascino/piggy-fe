import { describe, expect, it } from 'vitest';
import { calculateGainLossPerWeek } from './performance-metrics';

describe('calculateGainLossPerWeek', () => {
  it('returns gain or loss per week using days open', () => {
    const value = calculateGainLossPerWeek(120, 30);
    expect(value).toBe(28);
  });

  it('returns negative values for weekly loss', () => {
    const value = calculateGainLossPerWeek(-70, 14);
    expect(value).toBe(-35);
  });

  it('returns null when days open is zero', () => {
    const value = calculateGainLossPerWeek(50, 0);
    expect(value).toBeNull();
  });

  it('returns null for invalid numbers', () => {
    expect(calculateGainLossPerWeek(Number.NaN, 10)).toBeNull();
    expect(calculateGainLossPerWeek(10, Number.POSITIVE_INFINITY)).toBeNull();
  });
});
