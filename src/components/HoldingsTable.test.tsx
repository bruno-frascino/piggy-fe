// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MASKED_VALUE } from '@/lib/format';

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
  useRealizedPnLMock,
  updatePositionMock,
  recalculateDrawdownMock,
  mutationMock,
  showToastMock,
  privacyState,
} = vi.hoisted(() => ({
  useHoldingsMock: vi.fn(),
  useQuotesMock: vi.fn(),
  useRealizedPnLMock: vi.fn(),
  updatePositionMock: vi.fn(),
  recalculateDrawdownMock: vi.fn(),
  mutationMock: vi.fn(),
  showToastMock: vi.fn(),
  privacyState: { hidden: false },
}));

vi.mock('@/hooks/api', () => ({
  useHoldings: useHoldingsMock,
  useQuotes: useQuotesMock,
  useRealizedPnL: useRealizedPnLMock,
  useTradingAccounts: () => ({ data: undefined, isError: false }),
  useStockSearch: () => ({ data: undefined, isError: false }),
  useCreatePosition: () => ({ mutateAsync: mutationMock }),
  useUpdatePosition: () => ({ mutateAsync: updatePositionMock }),
  useRecalculateDrawdown: () => ({ mutateAsync: recalculateDrawdownMock }),
  useClosePosition: () => ({ mutateAsync: mutationMock }),
  useDeletePosition: () => ({ mutateAsync: mutationMock }),
}));

vi.mock('@/lib/offline-write-queue', () => ({
  enqueueQueuedWrite: vi.fn(() => 0),
  syncQueuedWritesNow: vi.fn(async () => ({ processed: 0, remaining: 0 })),
}));

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: showToastMock }),
}));

vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({
    hidden: privacyState.hidden,
    toggle: vi.fn(),
    hide: vi.fn(),
    mask: (v: string) => (privacyState.hidden ? MASKED_VALUE : v),
  }),
}));

import HoldingsTable from './HoldingsTable';

function renderTable(onLiveTotals?: (t: unknown) => void, isDemo = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HoldingsTable
        selectedAccountId='acc-1'
        selectedAccountName='Main'
        isDemo={isDemo}
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
  useRealizedPnLMock.mockReturnValue({ data: 0 });
  updatePositionMock.mockResolvedValue({ success: true });
  recalculateDrawdownMock.mockResolvedValue({ success: true });
  mutationMock.mockResolvedValue({ success: true });
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: true,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  privacyState.hidden = false;
});

describe('HoldingsTable row/total computation', () => {
  it('uses the dashboard chart height as both its minimum and maximum height', () => {
    setHoldings([]);
    setQuotes([]);

    renderTable();

    const card = screen.getByText('Holdings · Main').closest('.p-card');
    expect(card).toHaveClass('h-[26rem]', 'sm:h-[28rem]', 'md:h-[32rem]');
  });

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

describe('HoldingsTable demo gain highlight', () => {
  const quote = (price: number) => ({
    symbol: 'AAPL',
    price,
    change: 0,
    changePercent: 0,
    currency: 'USD',
  });

  const gainRows = (container: HTMLElement) => ({
    desktop: container.querySelectorAll('tr.position-in-gain'),
    mobile: container.querySelectorAll(
      '.holdings-portrait-cards .position-in-gain'
    ),
  });

  it('highlights positions in gain for a demo account', () => {
    setHoldings([{ ...baseHolding }]);
    setQuotes([quote(120)]);

    const { container } = renderTable(undefined, true);

    expect(gainRows(container).desktop).toHaveLength(1);
    expect(gainRows(container).mobile).toHaveLength(1);
  });

  it('does not highlight gains for a non-demo account', () => {
    setHoldings([{ ...baseHolding }]);
    setQuotes([quote(120)]);

    const { container } = renderTable();

    expect(gainRows(container).desktop).toHaveLength(0);
    expect(gainRows(container).mobile).toHaveLength(0);
  });

  it('leaves losing positions that have not hit the stop loss untouched', () => {
    setHoldings([{ ...baseHolding, stopLoss: 80 }]);
    setQuotes([quote(90)]);

    const { container } = renderTable(undefined, true);

    expect(gainRows(container).desktop).toHaveLength(0);
    expect(container.querySelectorAll('tr.stop-loss-triggered')).toHaveLength(
      0
    );
  });

  it('tints a triggered stop as a gain when the position is still above entry', () => {
    setHoldings([{ ...baseHolding, stopLoss: 115 }]);
    setQuotes([quote(110)]);

    const { container } = renderTable(undefined, true);

    expect(gainRows(container).desktop).toHaveLength(1);
    expect(gainRows(container).mobile).toHaveLength(1);
    expect(container.querySelectorAll('tr.stop-loss-triggered')).toHaveLength(
      0
    );
    const icons = screen.getAllByRole('img', { name: 'Stop loss triggered' });
    expect(icons.length).toBe(2);
    icons.forEach(icon => expect(icon).toHaveClass('stop-loss-in-gain-icon'));
  });

  it('keeps the stop-loss tint when a triggered stop is below entry', () => {
    setHoldings([{ ...baseHolding, stopLoss: 95 }]);
    setQuotes([quote(90)]);

    const { container } = renderTable(undefined, true);

    expect(container.querySelectorAll('tr.stop-loss-triggered')).toHaveLength(
      1
    );
    expect(gainRows(container).desktop).toHaveLength(0);
  });
});

describe('HoldingsTable stop-loss highlight', () => {
  const quote = (price: number) => ({
    symbol: 'AAPL',
    price,
    change: 0,
    changePercent: 0,
    currency: 'USD',
  });

  function triggeredRows(container: HTMLElement) {
    return {
      desktop: container.querySelectorAll('tr.stop-loss-triggered'),
      mobile: container.querySelectorAll(
        '.holdings-portrait-cards .stop-loss-triggered'
      ),
    };
  }

  it('highlights desktop and mobile rows when the live price is below the stop loss', () => {
    setHoldings([{ ...baseHolding, stopLoss: 95 }]);
    setQuotes([quote(90)]);

    const { container } = renderTable();

    const { desktop, mobile } = triggeredRows(container);
    expect(desktop).toHaveLength(1);
    expect(mobile).toHaveLength(1);
    expect(
      screen.getAllByRole('img', { name: 'Stop loss triggered' }).length
    ).toBe(2);
  });

  it('highlights when the price exactly equals the stop loss', () => {
    setHoldings([{ ...baseHolding, stopLoss: 95 }]);
    setQuotes([quote(95)]);

    const { container } = renderTable();

    expect(triggeredRows(container).desktop).toHaveLength(1);
  });

  it('does not highlight when the price is above the stop loss', () => {
    setHoldings([{ ...baseHolding, stopLoss: 95 }]);
    setQuotes([quote(96)]);

    const { container } = renderTable();

    const { desktop, mobile } = triggeredRows(container);
    expect(desktop).toHaveLength(0);
    expect(mobile).toHaveLength(0);
    expect(
      screen.queryByRole('img', { name: 'Stop loss triggered' })
    ).not.toBeInTheDocument();
  });

  it.each([undefined, 0])(
    'does not highlight when no stop loss is set (%s)',
    stopLoss => {
      setHoldings([{ ...baseHolding, stopLoss }]);
      setQuotes([quote(1)]);

      const { container } = renderTable();

      const { desktop, mobile } = triggeredRows(container);
      expect(desktop).toHaveLength(0);
      expect(mobile).toHaveLength(0);
    }
  );

  it('falls back to the stored price when no live quote exists', () => {
    setHoldings([{ ...baseHolding, stopLoss: 105, currentPrice: 100 }]);
    setQuotes([]);

    const { container } = renderTable();

    expect(triggeredRows(container).desktop).toHaveLength(1);
  });

  it('shows a dash instead of $0.00 in the Stop Loss column when unset', () => {
    setHoldings([
      { ...baseHolding, stopLoss: 95 },
      { ...baseHolding, id: 'p2', symbol: 'MSFT', stopLoss: undefined },
    ]);
    setQuotes([]);

    const { container } = renderTable();

    const cells = Array.from(
      container.querySelectorAll('.holdings-table tbody tr')
    ).map(tr => tr.textContent ?? '');
    expect(cells.some(text => text.includes('$95.00'))).toBe(true);
    expect(cells.some(text => text.includes('—'))).toBe(true);
    expect(container.textContent).not.toContain('$0.00 ');
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
      expect(updatePositionMock).toHaveBeenCalledWith({
        id: 'p1',
        payload: { currentPrice: 90 },
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
    expect(updatePositionMock).not.toHaveBeenCalled();
  });

  it('registers a new peak when the live price exceeds the stored max run-up', async () => {
    setHoldings([
      { ...baseHolding, maxDrawdownPercent: 0, maxRunUpPercent: 5 },
    ]);
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

    await waitFor(() =>
      expect(updatePositionMock).toHaveBeenCalledWith({
        id: 'p1',
        payload: { currentPrice: 110 },
      })
    );
  });

  it('shows the stored max run-up and lets the user reset it', async () => {
    setHoldings([{ ...baseHolding, maxRunUpPercent: 15 }]);
    setQuotes([]);

    renderTable();

    expect(screen.getByText('Max Run-up %')).toBeInTheDocument();
    expect(screen.getByText('+15.00%')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Reset max run-up'));
    await waitFor(() =>
      expect(updatePositionMock).toHaveBeenCalledWith({
        id: 'p1',
        payload: { maxRunUpPercent: null },
      })
    );
  });

  it('does not update when there is no live quote for the symbol', async () => {
    setHoldings([{ ...baseHolding }]);
    setQuotes([]);

    renderTable();

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(updatePositionMock).not.toHaveBeenCalled();
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
    expect(updatePositionMock).not.toHaveBeenCalled();
  });

  it('does not update when the live price is above entry but within the stored peak', async () => {
    setHoldings([
      { ...baseHolding, maxDrawdownPercent: 0, maxRunUpPercent: 15 },
    ]);
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
    expect(updatePositionMock).not.toHaveBeenCalled();
  });
});

describe('HoldingsTable privacy mode', () => {
  it('masks units and money amounts but keeps prices and percentages visible', () => {
    privacyState.hidden = true;
    setHoldings([{ ...baseHolding }]);
    setQuotes([]);

    renderTable();

    // Units (mobile card) and Buy price (desktop column) render side by side —
    // units must be masked, the per-unit buy price must not.
    expect(screen.getAllByText(MASKED_VALUE).length).toBeGreaterThan(0);
    expect(screen.getAllByText('$100.00').length).toBeGreaterThan(0);
  });

  it('uses no green or red colours while hidden', () => {
    privacyState.hidden = true;
    setHoldings([{ ...baseHolding }]);
    setQuotes([]);

    const { container } = renderTable();

    expect(container.querySelector('.text-green-600')).toBeNull();
    expect(container.querySelector('.text-red-600')).toBeNull();
  });
});
