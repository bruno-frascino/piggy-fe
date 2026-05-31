// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

type ClosedTradesModule = typeof import('./closed-trades-store');

async function loadModule(): Promise<ClosedTradesModule> {
  vi.resetModules();
  return import('./closed-trades-store');
}

function sampleTrade(id: string) {
  return {
    id,
    symbol: 'AAPL',
    openDate: '2026-01-01',
    closeDate: '2026-01-10',
    unitsClosed: 2,
    buyPrice: 100,
    buyFee: 1,
    sellPrice: 110,
    sellFee: 1,
    periodDays: 9,
  };
}

describe('closed-trades-store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads empty list when storage is empty', async () => {
    const store = await loadModule();
    expect(store.getClosedTrades()).toEqual([]);
  });

  it('adds and persists a closed trade', async () => {
    const store = await loadModule();

    store.addClosedTrade(sampleTrade('t1'));

    expect(store.getClosedTrades()).toHaveLength(1);
    expect(store.getClosedTrades()[0]?.id).toBe('t1');
    expect(
      JSON.parse(localStorage.getItem('closedTrades') || '[]')
    ).toHaveLength(1);
  });

  it('updates an existing trade', async () => {
    const store = await loadModule();
    store.addClosedTrade(sampleTrade('t1'));

    store.updateClosedTrade('t1', {
      sellPrice: 120,
      sellComments: 'take profit',
    });

    const updated = store.getClosedTrades()[0];
    expect(updated?.sellPrice).toBe(120);
    expect(updated?.sellComments).toBe('take profit');
  });

  it('deletes a trade by id', async () => {
    const store = await loadModule();
    store.addClosedTrade(sampleTrade('t1'));
    store.addClosedTrade(sampleTrade('t2'));

    store.deleteClosedTrade('t1');

    const trades = store.getClosedTrades();
    expect(trades).toHaveLength(1);
    expect(trades[0]?.id).toBe('t2');
  });

  it('clears all trades', async () => {
    const store = await loadModule();
    store.addClosedTrade(sampleTrade('t1'));

    store.clearClosedTrades();

    expect(store.getClosedTrades()).toEqual([]);
    expect(localStorage.getItem('closedTrades')).toBe('[]');
  });

  it('returns empty list for invalid JSON payload', async () => {
    localStorage.setItem('closedTrades', '{broken-json');

    const store = await loadModule();

    expect(store.getClosedTrades()).toEqual([]);
  });
});
