import { describe, expect, it } from 'vitest';
import type { ImportPlannedSell } from '@/lib/types';
import {
  initialAllocationInput,
  remainingToAllocate,
  toAllocationPayload,
  validateAllocation,
} from './import-allocation';

const sell: ImportPlannedSell = {
  eventId: 's1',
  externalId: 'KRAKEN:order:S',
  occurredAt: '2026-03-01T01:00:00.000Z',
  sellDate: '2026-03-01T00:00:00.000Z',
  baseAsset: 'BTC',
  quoteCurrency: 'AUD',
  quantity: '1.5',
  orderType: 'limit',
  closeReason: null,
  allocations: [
    {
      positionRef: 'p1',
      quantity: '1',
      price: '1',
      totalValue: '1',
      fees: '0',
      notes: null,
    },
  ],
  userOverridden: false,
  dustIgnored: null,
  resolved: true,
  eligible: [
    {
      positionRef: 'p1',
      remaining: '1',
      acquiredAt: '2026-01-01T00:00:00.000Z',
      currency: 'AUD',
    },
    {
      positionRef: 'p2',
      remaining: '2',
      acquiredAt: '2026-01-02T00:00:00.000Z',
      currency: 'AUD',
    },
  ],
};

describe('import allocation helpers', () => {
  it('starts from the planned allocation', () => {
    expect(initialAllocationInput(sell)).toEqual({ p1: '1' });
  });

  it('computes what is left to allocate', () => {
    expect(remainingToAllocate(sell, { p1: '1' })).toBeCloseTo(0.5, 12);
    expect(remainingToAllocate(sell, { p1: '1', p2: '0.5' })).toBeCloseTo(
      0,
      12
    );
    expect(remainingToAllocate(sell, { p1: 'abc' })).toBeCloseTo(1.5, 12);
  });

  it('accepts a complete allocation', () => {
    expect(validateAllocation(sell, { p1: '0.5', p2: '1' })).toBeNull();
  });

  it('flags incomplete allocations with the remaining amount', () => {
    expect(validateAllocation(sell, { p1: '1' })).toEqual({
      kind: 'not-complete',
      remaining: 0.5,
    });
  });

  it('flags a parcel asked for more than it has left, and unknown parcels', () => {
    expect(validateAllocation(sell, { p1: '1.5' })).toEqual({
      kind: 'exceeds',
      positionRef: 'p1',
    });
    expect(validateAllocation(sell, { p9: '1.5' })).toEqual({
      kind: 'exceeds',
      positionRef: 'p9',
    });
  });

  it('flags negative quantities', () => {
    expect(validateAllocation(sell, { p1: '-1', p2: '2.5' })).toEqual({
      kind: 'negative',
      positionRef: 'p1',
    });
  });

  it('sends only positive quantities', () => {
    expect(toAllocationPayload({ p1: '0', p2: '1.5', p3: '' })).toEqual([
      { positionRef: 'p2', quantity: '1.5' },
    ]);
  });
});
