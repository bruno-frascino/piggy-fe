// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Regression: a stop loss entered while creating a position must reach the API
// (and survive being queued offline) instead of being silently dropped.

const { createPositionMock, enqueueMock, submitValue, emptyResult } =
  vi.hoisted(() => ({
    emptyResult: { data: [] as unknown[] },
    createPositionMock: vi.fn(),
    enqueueMock: vi.fn(() => 0),
    submitValue: {
      current: {
        symbol: 'AAPL',
        name: 'Apple',
        openDate: '2026-01-01',
        units: 10,
        buyPrice: 100,
        buyFee: 1,
        industry: '',
        accountName: 'Main',
        exchangeCode: 'NASDAQ',
        stopLoss: 90 as number | undefined,
      },
    },
  }));

vi.mock('@/hooks/api', () => ({
  useHoldings: () => emptyResult,
  useQuotes: () => emptyResult,
  useRealizedPnL: () => ({ data: 0 }),
  useCreatePosition: () => ({ mutateAsync: createPositionMock }),
  useUpdatePosition: () => ({ mutateAsync: vi.fn() }),
  useRecalculateDrawdown: () => ({ mutateAsync: vi.fn() }),
  useClosePosition: () => ({ mutateAsync: vi.fn() }),
  useDeletePosition: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/lib/offline-write-queue', () => ({
  enqueueQueuedWrite: enqueueMock,
  syncQueuedWritesNow: vi.fn(async () => ({ processed: 0, remaining: 0 })),
}));

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: vi.fn() }),
}));

vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({
    hidden: false,
    toggle: vi.fn(),
    hide: vi.fn(),
    mask: (v: string) => v,
  }),
}));

vi.mock('@/components/AddHoldingsDialog', () => ({
  default: ({
    visible,
    onSubmit,
  }: {
    visible: boolean;
    onSubmit: (value: unknown) => void;
  }) =>
    visible ? (
      <button onClick={() => onSubmit(submitValue.current)}>Submit stub</button>
    ) : null,
}));

import HoldingsTable from './HoldingsTable';

function renderTable() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HoldingsTable selectedAccountId='acc-1' selectedAccountName='Main' />
    </QueryClientProvider>
  );
}

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

beforeEach(() => {
  createPositionMock.mockResolvedValue(undefined);
  submitValue.current.stopLoss = 90;
  setOnline(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('HoldingsTable create flow', () => {
  it('sends the stop loss when creating a position', async () => {
    renderTable();

    fireEvent.click(screen.getByRole('button', { name: 'Add Position' }));
    fireEvent.click(screen.getByText('Submit stub'));

    await vi.waitFor(() => expect(createPositionMock).toHaveBeenCalled());
    expect(createPositionMock).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'AAPL', stopLossPrice: 90 })
    );
  });

  it('omits stopLossPrice when no stop loss was entered', async () => {
    submitValue.current.stopLoss = undefined;
    renderTable();

    fireEvent.click(screen.getByRole('button', { name: 'Add Position' }));
    fireEvent.click(screen.getByText('Submit stub'));

    await vi.waitFor(() => expect(createPositionMock).toHaveBeenCalled());
    expect(createPositionMock.mock.calls[0][0]).not.toHaveProperty(
      'stopLossPrice'
    );
  });

  it('keeps the stop loss when the create is queued offline', async () => {
    setOnline(false);
    renderTable();

    fireEvent.click(screen.getByRole('button', { name: 'Add Position' }));
    fireEvent.click(screen.getByText('Submit stub'));

    await vi.waitFor(() => expect(enqueueMock).toHaveBeenCalled());
    expect(enqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'create-position',
        payload: expect.objectContaining({ stopLossPrice: 90 }),
      })
    );
  });
});
