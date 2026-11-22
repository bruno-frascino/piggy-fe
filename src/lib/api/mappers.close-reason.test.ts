import { describe, expect, it } from 'vitest';
import { mapCloseEventToClosedTrade } from './mappers';
import { closedTradeAmounts } from '../closed-trade-math';

const event = (closeReason?: unknown) => ({
  id: 'tx1',
  date: '2026-02-01T00:00:00.000Z',
  quantity: 5,
  price: 9,
  fees: 0,
  closeReason,
  position: {
    id: 'p1',
    openDate: '2026-01-01T00:00:00.000Z',
    entryPrice: 10,
    buyFees: 0,
    asset: { symbol: 'AAPL', name: 'Apple', exchange: { code: 'NASDAQ' } },
    transactions: [{ type: 'BUY', quantity: 5 }],
  },
});

describe('mapCloseEventToClosedTrade closeReason', () => {
  it('maps a known reason', () => {
    expect(mapCloseEventToClosedTrade(event('STOP_LOSS'))?.closeReason).toBe(
      'STOP_LOSS'
    );
  });

  it('leaves null or unrecognised values undefined', () => {
    expect(
      mapCloseEventToClosedTrade(event(null))?.closeReason
    ).toBeUndefined();
    expect(
      mapCloseEventToClosedTrade(event('WHIM'))?.closeReason
    ).toBeUndefined();
  });

  it('maps correction metadata only when the complete revision context is present', () => {
    const metadata = {
      operationId: 'operation1',
      expectedRevisionId: 'revision1',
      expectedSourceFingerprint: 'a'.repeat(64),
      effectiveDate: '2026-02-01',
      sequence: 2,
    };
    expect(
      mapCloseEventToClosedTrade({
        ...event(),
        cashCorrection: metadata,
      })?.cashCorrection
    ).toEqual(metadata);
    expect(
      mapCloseEventToClosedTrade({
        ...event(),
        cashCorrection: { ...metadata, sequence: 1.5 },
      })?.cashCorrection
    ).toBeUndefined();
  });

  it('uses allocated split cost for history amounts without changing the historical buy price', () => {
    const trade = mapCloseEventToClosedTrade({
      ...event(),
      quantity: 6,
      price: 7,
      fees: 1,
      position: { ...event().position, buyFees: 10 },
      splitAdjustedSale: {
        costBasis: '33.000000000000',
        buyFees: '3.000000000000',
      },
    });
    expect(trade).not.toBeNull();
    expect(trade).toMatchObject({
      buyPrice: 10,
      buyFee: 3,
      splitAdjustedCostBasis: 33,
    });
    const amounts = closedTradeAmounts(trade!);
    expect(amounts.open).toBe(30);
    expect(amounts.close).toBe(42);
    expect(amounts.pl).toBe(8);
    expect(amounts.returnFraction).toBeCloseTo(8 / 33);
  });

  it('rejects malformed allocated split cost rather than falling back to unsplit arithmetic', () => {
    for (const splitAdjustedSale of [
      null,
      { costBasis: 'bad', buyFees: '3' },
      { costBasis: '2', buyFees: '3' },
    ]) {
      expect(() =>
        mapCloseEventToClosedTrade({ ...event(), splitAdjustedSale })
      ).toThrow('Invalid split-adjusted sale cost');
    }
  });

  it('retains the precision of split-adjusted sold units', () => {
    const trade = mapCloseEventToClosedTrade({
      ...event(),
      quantity: 0.00000012,
      splitAdjustedSale: {
        costBasis: '0.000001200000',
        buyFees: '0.000000000000',
      },
    });
    expect(trade?.unitsClosed).toBe(0.00000012);
  });
});
