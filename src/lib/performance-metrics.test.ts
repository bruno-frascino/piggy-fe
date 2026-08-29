import { describe, expect, it } from 'vitest';
import {
  calculateGainLossPerWeek,
  calculateReturnPctPerWeek,
} from './performance-metrics';

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

describe('calculateReturnPctPerWeek', () => {
  it('returns weekly percentage velocity using days open', () => {
    const value = calculateReturnPctPerWeek(0.3, 30);
    expect(value).toBeCloseTo(0.07, 6);
  });

  it('returns negative weekly percentage velocity for losses', () => {
    const value = calculateReturnPctPerWeek(-0.1, 14);
    expect(value).toBeCloseTo(-0.05, 6);
  });

  it('returns null when days open is zero', () => {
    const value = calculateReturnPctPerWeek(0.2, 0);
    expect(value).toBeNull();
  });

  it('returns null for invalid numbers', () => {
    expect(calculateReturnPctPerWeek(Number.NaN, 12)).toBeNull();
    expect(
      calculateReturnPctPerWeek(0.15, Number.NEGATIVE_INFINITY)
    ).toBeNull();
  });
});
