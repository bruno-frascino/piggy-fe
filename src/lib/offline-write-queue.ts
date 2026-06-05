import { apiClient } from '@/lib/api-client';

const OFFLINE_WRITE_QUEUE_KEY = 'truffles.offlineWriteQueue.v1';
export const OFFLINE_WRITE_QUEUE_CHANGED_EVENT =
  'truffles:offline-write-queue-changed';

type CreatePositionPayload = {
  symbol: string;
  exchangeCode: string;
  accountId?: string;
  accountName?: string;
  openDate: string;
  entryPrice: number;
  quantity: number;
  buyFees?: number;
  assetName?: string;
  industry?: string;
  notes?: string;
};

type UpdatePositionPayload = {
  symbol?: string;
  exchangeCode?: string;
  accountId?: string;
  accountName?: string;
  openDate?: string;
  entryPrice?: number;
  quantity?: number;
  buyFees?: number;
  assetName?: string;
  industry?: string;
  stopLossPrice?: number | null;
  takeProfitPrice?: number | null;
  notes?: string;
  currentPrice?: number;
};

type ClosePositionPayload = {
  closeDate: string;
  exitPrice: number;
  quantity?: number;
  fees?: number;
  notes?: string;
};

export type QueuedWriteAction =
  | {
      id: string;
      type: 'create-position';
      createdAt: string;
      payload: CreatePositionPayload;
    }
  | {
      id: string;
      type: 'update-position';
      createdAt: string;
      positionId: string;
      payload: UpdatePositionPayload;
    }
  | {
      id: string;
      type: 'close-position';
      createdAt: string;
      positionId: string;
      payload: ClosePositionPayload;
    };

export type QueuedWriteActionInput =
  | {
      type: 'create-position';
      payload: CreatePositionPayload;
    }
  | {
      type: 'update-position';
      positionId: string;
      payload: UpdatePositionPayload;
    }
  | {
      type: 'close-position';
      positionId: string;
      payload: ClosePositionPayload;
    };

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function readQueue(): QueuedWriteAction[] {
  const storage = getStorage();
  if (!storage) return [];

  const raw = storage.getItem(OFFLINE_WRITE_QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedWriteAction[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedWriteAction[]) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(OFFLINE_WRITE_QUEUE_KEY, JSON.stringify(queue));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(OFFLINE_WRITE_QUEUE_CHANGED_EVENT, {
        detail: { count: queue.length },
      })
    );
  }
}

export function getQueuedWritesCount() {
  return readQueue().length;
}

export function clearQueuedWrites() {
  writeQueue([]);
}

export function enqueueQueuedWrite(action: QueuedWriteActionInput) {
  const queue = readQueue();
  const next: QueuedWriteAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
  } as QueuedWriteAction;
  queue.push(next);
  writeQueue(queue);
  return queue.length;
}

export async function replayQueuedWrites(
  execute: (action: QueuedWriteAction) => Promise<void>
) {
  const queue = readQueue();
  if (!queue.length) {
    return { processed: 0, remaining: 0 };
  }

  const remaining: QueuedWriteAction[] = [];
  let processed = 0;

  for (let i = 0; i < queue.length; i += 1) {
    const action = queue[i];
    try {
      await execute(action);
      processed += 1;
    } catch {
      remaining.push(...queue.slice(i));
      break;
    }
  }

  writeQueue(remaining);
  return {
    processed,
    remaining: remaining.length,
  };
}

export async function syncQueuedWritesNow() {
  return replayQueuedWrites(async action => {
    if (action.type === 'create-position') {
      await apiClient.createPosition(action.payload);
      return;
    }

    if (action.type === 'update-position') {
      await apiClient.updatePosition(action.positionId, action.payload);
      return;
    }

    await apiClient.closePosition(
      action.positionId,
      action.payload.closeDate,
      action.payload.exitPrice,
      action.payload.quantity,
      action.payload.fees,
      action.payload.notes
    );
  });
}
