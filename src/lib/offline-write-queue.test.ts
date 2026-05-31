// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

const createPositionMock = vi.fn();
const updatePositionMock = vi.fn();
const closePositionMock = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    createPosition: createPositionMock,
    updatePosition: updatePositionMock,
    closePosition: closePositionMock,
  },
}));

type QueueModule = typeof import('./offline-write-queue');

async function loadModule(): Promise<QueueModule> {
  vi.resetModules();
  return import('./offline-write-queue');
}

describe('offline-write-queue', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('enqueues an action and emits changed event', async () => {
    const queue = await loadModule();
    const listener = vi.fn();

    window.addEventListener(queue.OFFLINE_WRITE_QUEUE_CHANGED_EVENT, listener);

    const count = queue.enqueueQueuedWrite({
      type: 'create-position',
      payload: {
        symbol: 'AAPL',
        exchangeCode: 'NASDAQ',
        openDate: '2026-05-01',
        entryPrice: 100,
        quantity: 3,
      },
    });

    expect(count).toBe(1);
    expect(queue.getQueuedWritesCount()).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('replays all queued actions when execute succeeds', async () => {
    const queue = await loadModule();

    queue.enqueueQueuedWrite({
      type: 'create-position',
      payload: {
        symbol: 'AAPL',
        exchangeCode: 'NASDAQ',
        openDate: '2026-05-01',
        entryPrice: 100,
        quantity: 1,
      },
    });
    queue.enqueueQueuedWrite({
      type: 'create-position',
      payload: {
        symbol: 'MSFT',
        exchangeCode: 'NASDAQ',
        openDate: '2026-05-02',
        entryPrice: 200,
        quantity: 2,
      },
    });

    const execute = vi.fn().mockResolvedValue(undefined);
    const result = await queue.replayQueuedWrites(execute);

    expect(result).toEqual({ processed: 2, remaining: 0 });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(queue.getQueuedWritesCount()).toBe(0);
  });

  it('stops replay on first failure and keeps remaining entries', async () => {
    const queue = await loadModule();

    queue.enqueueQueuedWrite({
      type: 'create-position',
      payload: {
        symbol: 'AAPL',
        exchangeCode: 'NASDAQ',
        openDate: '2026-05-01',
        entryPrice: 100,
        quantity: 1,
      },
    });
    queue.enqueueQueuedWrite({
      type: 'create-position',
      payload: {
        symbol: 'TSLA',
        exchangeCode: 'NASDAQ',
        openDate: '2026-05-03',
        entryPrice: 300,
        quantity: 1,
      },
    });

    const execute = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('boom'));

    const result = await queue.replayQueuedWrites(execute);

    expect(result).toEqual({ processed: 1, remaining: 1 });
    expect(queue.getQueuedWritesCount()).toBe(1);
  });

  it('syncQueuedWritesNow dispatches actions to apiClient', async () => {
    const queue = await loadModule();
    createPositionMock.mockResolvedValue(undefined);
    updatePositionMock.mockResolvedValue(undefined);
    closePositionMock.mockResolvedValue(undefined);

    queue.enqueueQueuedWrite({
      type: 'create-position',
      payload: {
        symbol: 'AAPL',
        exchangeCode: 'NASDAQ',
        openDate: '2026-05-01',
        entryPrice: 100,
        quantity: 1,
      },
    });
    queue.enqueueQueuedWrite({
      type: 'update-position',
      positionId: 'p1',
      payload: { quantity: 5 },
    });
    queue.enqueueQueuedWrite({
      type: 'close-position',
      positionId: 'p2',
      payload: {
        closeDate: '2026-05-10',
        exitPrice: 150,
        quantity: 1,
        fees: 0,
        notes: 'close',
      },
    });

    const result = await queue.syncQueuedWritesNow();

    expect(result).toEqual({ processed: 3, remaining: 0 });
    expect(createPositionMock).toHaveBeenCalledTimes(1);
    expect(updatePositionMock).toHaveBeenCalledTimes(1);
    expect(closePositionMock).toHaveBeenCalledTimes(1);
    expect(queue.getQueuedWritesCount()).toBe(0);
  });

  it('clearQueuedWrites removes all queued actions', async () => {
    const queue = await loadModule();

    queue.enqueueQueuedWrite({
      type: 'create-position',
      payload: {
        symbol: 'AAPL',
        exchangeCode: 'NASDAQ',
        openDate: '2026-05-01',
        entryPrice: 100,
        quantity: 1,
      },
    });

    queue.clearQueuedWrites();

    expect(queue.getQueuedWritesCount()).toBe(0);
  });
});
