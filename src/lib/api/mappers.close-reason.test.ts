import { describe, expect, it } from 'vitest';
import { mapCloseEventToClosedTrade } from './mappers';

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
});
