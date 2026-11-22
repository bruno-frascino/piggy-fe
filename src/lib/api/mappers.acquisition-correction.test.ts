import { describe, expect, it } from 'vitest';
import {
  mapAcquisitionCorrection,
  mapPositionToHolding,
  mapCloseEventToClosedTrade,
} from './mappers';
const metadata = {
  operationId: 'op1',
  transactionId: 'buy1',
  expectedRevisionId: 'r1',
  expectedSourceFingerprint: 'a'.repeat(64),
  effectiveDate: '2026-10-02',
  sequence: 3,
  quantity: '10.000000000001',
  price: '12.345678901234',
  fees: '0.12345678',
};
const importedMetadata = {
  eventId: 'event1',
  transactionId: 'buy1',
  operationId: 'import-op1',
  expectedRevisionId: 'revision1',
  expectedSourceFingerprint: 'b'.repeat(64),
  effectiveDate: '2026-10-02',
  sequence: 3,
  price: '12.345678901234',
  fees: '0.12345678',
  currency: 'USD',
};
const position = {
  id: 'p1',
  openDate: '2026-10-02',
  quantity: 6,
  entryPrice: metadata.price,
  buyFees: metadata.fees,
  account: { id: 'a1', name: 'Main' },
  asset: {
    symbol: 'AAPL',
    name: 'Apple',
    exchange: { code: 'NASDAQ', currency: 'USD' },
  },
  transactions: [
    { type: 'BUY', quantity: 10 },
    { type: 'SELL', quantity: 4 },
  ],
};
describe('acquisition correction transport metadata', () => {
  it('excludes retained voids from effective holdings and close events', () => {
    const voidedAt = '2026-10-04T01:00:00.000Z';
    expect(mapPositionToHolding({ ...position, voidedAt })).toBeNull();
    expect(
      mapPositionToHolding({
        ...position,
        quantity: 10,
        transactions: [
          { type: 'BUY', quantity: 10 },
          { type: 'SELL', quantity: 4, voidedAt },
        ],
      })?.units
    ).toBe(10);
    const event = {
      id: 'sale1',
      date: '2026-10-03',
      quantity: 4,
      price: '20',
      fees: '1',
      position,
    };
    expect(mapCloseEventToClosedTrade({ ...event, voidedAt })).toBeNull();
    expect(
      mapCloseEventToClosedTrade({
        ...event,
        position: { ...position, voidedAt },
      })
    ).toBeNull();
  });
  it('keeps full exact acquisition values separate from prorated holding and history values', () => {
    const holding = mapPositionToHolding({
      ...position,
      acquisitionCorrection: metadata,
    });
    expect(holding).toMatchObject({
      units: 6,
      acquisitionCorrection: metadata,
    });
    const closed = mapCloseEventToClosedTrade({
      id: 'sale1',
      date: '2026-10-03',
      quantity: 4,
      price: '20',
      fees: '1',
      position,
      acquisitionCorrection: metadata,
      importedAcquisitionCorrection: importedMetadata,
      importedExecutionCorrection: {
        ...importedMetadata,
        eventId: 'sell-event',
        transactionId: 'sale1',
      },
    });
    expect(closed).toMatchObject({
      unitsClosed: 4,
      acquisitionCorrection: metadata,
      importedAcquisitionCorrection: importedMetadata,
      importedExecutionCorrection: {
        ...importedMetadata,
        eventId: 'sell-event',
        transactionId: 'sale1',
      },
    });
  });

  it('uses validated split-adjusted inventory without rewriting historical acquisition price', () => {
    const holding = mapPositionToHolding({
      ...position,
      quantity: 16,
      splitAdjustedInventory: {
        remainingQuantity: '16',
        remainingCostBasis: '88.000000000000',
        remainingBuyFees: '8.000000000000',
        averageUnitCost: '5.500000000000',
      },
    });
    expect(holding).toMatchObject({
      units: 16,
      buyPrice: Number(metadata.price),
      buyFee: 8,
      currentPrice: 5.5,
      splitAdjustedInventory: {
        remainingQuantity: 16,
        remainingCostBasis: 88,
        remainingBuyFees: 8,
        averageUnitCost: 5.5,
      },
    });
    expect(() =>
      mapPositionToHolding({
        ...position,
        splitAdjustedInventory: {
          remainingQuantity: 'invalid',
          remainingCostBasis: '88',
          remainingBuyFees: '8',
          averageUnitCost: '5.5',
        },
      })
    ).toThrow('Invalid split-adjusted inventory');
  });

  it('retains the stop-loss review flag even when the split was reversed', () => {
    expect(
      mapPositionToHolding({ ...position, stopLossReviewRequired: true })
        ?.stopLossReviewRequired
    ).toBe(true);
    expect(
      mapPositionToHolding({ ...position, stopLossReviewRequired: false })
        ?.stopLossReviewRequired
    ).toBe(false);
    expect(() =>
      mapPositionToHolding({ ...position, stopLossReviewRequired: 'invalid' })
    ).toThrow('Invalid stop-loss review state');
  });

  it('retains and validates the price-history review flag without active split inventory', () => {
    expect(
      mapPositionToHolding({ ...position, priceHistoryReviewRequired: true })
        ?.priceHistoryReviewRequired
    ).toBe(true);
    expect(() =>
      mapPositionToHolding({ ...position, priceHistoryReviewRequired: 'yes' })
    ).toThrow('Invalid price-history review state');
    const event = {
      id: 'sale1',
      date: '2026-10-03',
      quantity: 4,
      price: '20',
      fees: '1',
      position: { ...position, priceHistoryReviewRequired: true },
    };
    expect(mapCloseEventToClosedTrade(event)?.priceHistoryReviewRequired).toBe(
      true
    );
    expect(() =>
      mapCloseEventToClosedTrade({
        ...event,
        position: { ...position, priceHistoryReviewRequired: 'yes' },
      })
    ).toThrow('Invalid price-history review state');
  });

  it('does not invent correction controls for legacy or malformed metadata', () => {
    expect(
      mapPositionToHolding(position)?.acquisitionCorrection
    ).toBeUndefined();
    for (const raw of [
      undefined,
      {},
      { ...metadata, sequence: 0 },
      { ...metadata, quantity: 10 },
      { ...metadata, expectedSourceFingerprint: 'invalid' },
    ])
      expect(mapAcquisitionCorrection(raw)).toBeUndefined();
  });
});
