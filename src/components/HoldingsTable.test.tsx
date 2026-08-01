// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Characterization tests for HoldingsTable's two riskiest, untested effects:
//  1. Live-quote-driven row/total computation (effectivePrice, currentPosition,
//     totals) bubbled up to the parent via onLiveTotals.
//  2. The rate-limited max-drawdown ratchet effect that PATCHes currentPrice
//     whenever a live quote shows a new worse drawdown than the stored max.
//
// These exist to pin down current behavior BEFORE any hook-extraction refactor
// of HoldingsTable.tsx, since this component has no other automated coverage
// and a past bug here (see /memories/repo/portfolio-behavior.md) required live
// browser verification to catch a subtle effect-timing regression.

const {
  useHoldingsMock,
  useQuotesMock,
  useClosedPositionsMock,
  apiUpdatePositionMock,
  mutationMock,
  showToastMock,
  emptyHoldings,
} = vi.hoisted(() => ({
  useHoldingsMock: vi.fn(),
  useQuotesMock: vi.fn(),
  useClosedPositionsMock: vi.fn(),
  apiUpdatePositionMock: vi.fn(),
  mutationMock: vi.fn(),
  showToastMock: vi.fn(),
  emptyHoldings: [] as unknown[],
}));

vi.mock('@/hooks/api', () => ({
  useHoldings: useHoldingsMock,
  useQuotes: useQuotesMock,
  useClosedPositions: useClosedPositionsMock,
  useCreatePosition: () => ({ mutateAsync: mutationMock }),
  useUpdatePosition: () => ({ mutateAsync: mutationMock }),
  useClosePosition: () => ({ mutateAsync: mutationMock }),
  useDeletePosition: () => ({ mutateAsync: mutationMock }),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    updatePosition: apiUpdatePositionMock,
    deletePosition: vi.fn(),
    recalculateDrawdown: vi.fn(),
  },
}));

vi.mock('@/lib/offline-write-queue', () => ({
  enqueueQueuedWrite: vi.fn(() => 0),
  syncQueuedWritesNow: vi.fn(async () => ({ processed: 0, remaining: 0 })),
}));

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: showToastMock }),
}));

import HoldingsTable from './HoldingsTable';

function renderTable(onLiveTotals?: (t: unknown) => void) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HoldingsTable
        selectedAccountId='acc-1'
        selectedAccountName='Main'
        onLiveTotals={onLiveTotals}
      />
    </QueryClientProvider>
  );
}

const baseHolding = {
  id: 'p1',
  symbol: 'AAPL',
  name: 'Apple',
  openDate: '2026-01-01',
  units: 10,
  buyPrice: 100,
  buyFee: 5,
  industry: '',
  currentPrice: 100,
  accountName: 'Main',
  exchangeCode: 'NASDAQ',
  maxDrawdownPercent: 5,
};

function setHoldings(holdings: unknown[]) {
  useHoldingsMock.mockReturnValue({ data: holdings });
}

function setQuotes(quotes: unknown[]) {
  useQuotesMock.mockReturnValue({ data: quotes });
}

beforeEach(() => {
  useClosedPositionsMock.mockReturnValue({ data: emptyHoldings });
  apiUpdatePositionMock.mockResolvedValue({ success: true });
  mutationMock.mockResolvedValue({ success: true });
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: true,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('HoldingsTable row/total computation', () => {
  it('derives effectivePrice/currentPosition from the live quote and bubbles totals to the parent', async () => {
    setHoldings([{ ...baseHolding }]);
    setQuotes([
      {
        symbol: 'AAPL',
        price: 90,
        change: -2,
        changePercent: -2.17,
        currency: 'USD',
      },
    ]);
    const onLiveTotals = vi.fn();

    renderTable(onLiveTotals);

    await waitFor(() => {
      expect(onLiveTotals).toHaveBeenCalled();
    });

    const lastCall =
      onLiveTotals.mock.calls[onLiveTotals.mock.calls.length - 1][0];
    // openPosition = 10*100 + 5 = 1005; currentPosition = 10*90 = 900
    expect(lastCall.totalEquity).toBeCloseTo(900);
    expect(lastCall.totalPL).toBeCloseTo(900 - 1005);
    // dayPL = change * units = -2 * 10
    expect(lastCall.dayPL).toBeCloseTo(-20);
  });

  it('falls back to the stored currentPrice when no live quote exists for the symbol', async () => {
    setHoldings([{ ...baseHolding }]);
    setQuotes([]);
    const onLiveTotals = vi.fn();

    renderTable(onLiveTotals);

    await waitFor(() => {
      expect(onLiveTotals).toHaveBeenCalled();
    });

    const lastCall =
      onLiveTotals.mock.calls[onLiveTotals.mock.calls.length - 1][0];
    // effectivePrice falls back to stored currentPrice (100) -> currentPosition = 1000
    expect(lastCall.totalEquity).toBeCloseTo(1000);
    expect(lastCall.totalPL).toBeCloseTo(1000 - 1005);
    expect(lastCall.dayPL).toBeCloseTo(0);
  });
});

describe('HoldingsTable max-drawdown ratchet effect', () => {
  it('persists a new worse drawdown via updatePosition when a live quote exceeds the stored max', async () => {
    setHoldings([{ ...baseHolding }]);
    setQuotes([
      {
        symbol: 'AAPL',
        price: 90,
        change: -2,
        changePercent: -2.17,
        currency: 'USD',
      },
    ]);

    renderTable();

    // priceDrawdownPct = (90-100)/100*100 = -10%, abs 10% > existing 5% + 0.01
    await waitFor(() => {
      expect(apiUpdatePositionMock).toHaveBeenCalledWith('p1', {
        currentPrice: 90,
      });
    });
  });

  it('does not update when offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    setHoldings([{ ...baseHolding }]);
    setQuotes([
      {
        symbol: 'AAPL',
        price: 90,
        change: -2,
        changePercent: -2.17,
        currency: 'USD',
      },
    ]);

    renderTable();

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(apiUpdatePositionMock).not.toHaveBeenCalled();
  });

  it('does not update when there is no live quote for the symbol', async () => {
    setHoldings([{ ...baseHolding }]);
    setQuotes([]);

    renderTable();

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(apiUpdatePositionMock).not.toHaveBeenCalled();
  });

  it('does not update when the new drawdown does not exceed the stored max', async () => {
    setHoldings([{ ...baseHolding, maxDrawdownPercent: 20 }]);
    setQuotes([
      {
        symbol: 'AAPL',
        price: 97,
        change: -0.5,
        changePercent: -0.5,
        currency: 'USD',
      },
    ]);

    renderTable();

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(apiUpdatePositionMock).not.toHaveBeenCalled();
  });

  it('does not update when the live price is above entry (positive return, no drawdown)', async () => {
    setHoldings([{ ...baseHolding, maxDrawdownPercent: 0 }]);
    setQuotes([
      {
        symbol: 'AAPL',
        price: 110,
        change: 2,
        changePercent: 1.85,
        currency: 'USD',
      },
    ]);

    renderTable();

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(apiUpdatePositionMock).not.toHaveBeenCalled();
  });
});
