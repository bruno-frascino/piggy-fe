import { describe, expect, it } from 'vitest';
import {
  calculateGainLossPerWeek,
  calculateReturnPctPerWeek,
  sumRealizedPnLForScope,
} from './performance-metrics';
import type { ClosedTrade } from './closed-trades-store';

function makeTrade(overrides: Partial<ClosedTrade> = {}): ClosedTrade {
  return {
    id: 't1',
    accountId: 'acc1',
    exchange: 'ASX',
    symbol: 'ABC',
    openDate: '2026-01-01',
    closeDate: '2026-01-10',
    unitsClosed: 10,
    buyPrice: 100,
    buyFee: 5,
    sellPrice: 110,
    sellFee: 5,
    periodDays: 9,
    ...overrides,
  };
}

describe('sumRealizedPnLForScope', () => {
  it('returns 0 when trades, accountId or exchange are missing', () => {
    expect(sumRealizedPnLForScope(undefined, 'acc1', 'ASX')).toBe(0);
    expect(sumRealizedPnLForScope([makeTrade()], undefined, 'ASX')).toBe(0);
    expect(sumRealizedPnLForScope([makeTrade()], 'acc1', undefined)).toBe(0);
  });

  it('sums realized P&L only for trades matching account+exchange', () => {
    const trades = [
      makeTrade({ id: 't1', unitsClosed: 10, buyPrice: 100, sellPrice: 110 }), // (1100-5) - (1000+5) = 90
      makeTrade({ id: 't2', accountId: 'acc2' }), // different account, excluded
      makeTrade({ id: 't3', exchange: 'NASDAQ' }), // different exchange, excluded
    ];

    const result = sumRealizedPnLForScope(trades, 'acc1', 'ASX');
    expect(result).toBeCloseTo(90);
  });

  it('handles losing trades (negative realized P&L)', () => {
    const trades = [
      makeTrade({ unitsClosed: 5, buyPrice: 200, sellPrice: 150 }), // (750-5) - (1000+5) = -260
    ];
    const result = sumRealizedPnLForScope(trades, 'acc1', 'ASX');
    expect(result).toBeCloseTo(-260);
  });

  it('aggregates multiple matching trades', () => {
    const trades = [
      makeTrade({ id: 't1', unitsClosed: 10, buyPrice: 100, sellPrice: 110 }), // 90
      makeTrade({
        id: 't2',
        unitsClosed: 4,
        buyPrice: 50,
        sellPrice: 60,
        buyFee: 0,
        sellFee: 0,
      }), // 40
    ];
    const result = sumRealizedPnLForScope(trades, 'acc1', 'ASX');
    expect(result).toBeCloseTo(130);
  });
});

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
