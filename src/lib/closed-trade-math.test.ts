import { describe, expect, it } from 'vitest';
import { closedTradeAmounts } from './closed-trade-math';

describe('closedTradeAmounts', () => {
  it('keeps open/close gross and nets fees only in P/L', () => {
    const a = closedTradeAmounts({
      unitsClosed: 100,
      buyPrice: 1.59,
      buyFee: 3,
      sellPrice: 1.58,
      sellFee: 0,
    });
    expect(a.open).toBeCloseTo(159);
    expect(a.close).toBeCloseTo(158);
    expect(a.pl).toBeCloseTo(-4);
    expect(a.returnFraction).toBeCloseTo(-4 / 162);
  });

  it('deducts the sell fee from P/L', () => {
    const a = closedTradeAmounts({
      unitsClosed: 10,
      buyPrice: 10,
      buyFee: 0,
      sellPrice: 12,
      sellFee: 2,
    });
    expect(a.close).toBe(120);
    expect(a.pl).toBe(18);
  });
});
