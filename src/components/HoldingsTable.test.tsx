// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
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
  checkStopLossMock,
  mutationMock,
  showToastMock,
  privacyState,
} = vi.hoisted(() => ({
  useHoldingsMock: vi.fn(),
  useQuotesMock: vi.fn(),
  useRealizedPnLMock: vi.fn(),
  updatePositionMock: vi.fn(),
  recalculateDrawdownMock: vi.fn(),
  checkStopLossMock: vi.fn(),
  mutationMock: vi.fn(),
  showToastMock: vi.fn(),
  privacyState: { hidden: false },
}));

vi.mock('@/hooks/api', () => ({
  useExchanges: () => ({ data: undefined }),
  useHoldings: useHoldingsMock,
  useQuotes: useQuotesMock,
  useRealizedPnL: useRealizedPnLMock,
  useTradingAccounts: () => ({ data: undefined, isError: false }),
  useStockSearch: () => ({ data: undefined, isError: false }),
  useCreatePosition: () => ({ mutateAsync: mutationMock }),
  useUpdatePosition: () => ({ mutateAsync: updatePositionMock }),
  useRecalculateDrawdown: () => ({ mutateAsync: recalculateDrawdownMock }),
  useCheckStopLoss: () => ({ mutateAsync: checkStopLossMock }),
  useClosePosition: () => ({ mutateAsync: mutationMock }),
  useDeletePosition: () => ({ mutateAsync: mutationMock }),
  useCorrectLiveManualAcquisition: () => ({
    mutateAsync: mutationMock,
    isPending: false,
  }),
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

function renderTable(
  onLiveTotals?: (t: unknown) => void,
  isDemo = false,
  selectedExchange?: string
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const tree = () => (
    <QueryClientProvider client={queryClient}>
      <HoldingsTable
        selectedAccountId='acc-1'
        selectedAccountName='Main'
        isDemo={isDemo}
        selectedExchange={selectedExchange}
        onLiveTotals={onLiveTotals}
      />
    </QueryClientProvider>
  );
  return { ...render(tree()), tree };
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
  checkStopLossMock.mockResolvedValue({ stopLossHitAt: null });
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
  it('does not claim an empty portfolio when holdings have not loaded offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    useHoldingsMock.mockReturnValue({ data: undefined, isLoading: false });
    setQuotes([]);
    renderTable();
    expect(
      screen.getByText(/holdings is unavailable. Reconnect/)
    ).toBeInTheDocument();
    expect(screen.queryByText('No open positions yet')).not.toBeInTheDocument();
  });
  it('does not present the previous scope holdings as cached data when a new scope has no loaded data', async () => {
    setHoldings([baseHolding]);
    setQuotes([]);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const tree = (accountId: string) => (
      <QueryClientProvider client={client}>
        <HoldingsTable selectedAccountId={accountId} />
      </QueryClientProvider>
    );
    const view = render(tree('acc-1'));
    expect(screen.getAllByTitle('View position details')).toHaveLength(2);
    useHoldingsMock.mockReturnValue({
      data: undefined,
      isError: true,
      refetch: vi.fn(),
    });
    view.rerender(tree('acc-2'));
    await waitFor(() =>
      expect(
        screen.queryByTitle('View position details')
      ).not.toBeInTheDocument()
    );
    expect(screen.getByText(/Could not load holdings/)).toBeInTheDocument();
    expect(
      screen.queryByText(/Showing last loaded data/)
    ).not.toBeInTheDocument();
  });
  it('shows a skeleton rather than an empty-state CTA while holdings load', () => {
    useHoldingsMock.mockReturnValue({ isLoading: true, data: undefined });
    setQuotes([]);
    renderTable();
    expect(
      screen.getByRole('status', { name: 'Loading holdings' })
    ).toBeInTheDocument();
    expect(screen.queryByText('No open positions yet')).not.toBeInTheDocument();
  });

  it('shows a retry instead of an empty-state CTA when holdings fail to load', () => {
    const refetch = vi.fn();
    useHoldingsMock.mockReturnValue({
      isError: true,
      data: undefined,
      refetch,
    });
    setQuotes([]);
    renderTable();
    expect(screen.queryByText('No open positions yet')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry holdings' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('keeps cached rows and totals visible on a failed refresh', () => {
    useHoldingsMock.mockReturnValue({ isError: true, data: [baseHolding] });
    setQuotes([]);
    const totals = vi.fn();
    renderTable(totals);
    expect(screen.getAllByTitle('View position details')).toHaveLength(2);
    expect(screen.getByText(/Could not refresh holdings/)).toBeInTheDocument();
    expect(totals).toHaveBeenLastCalledWith({
      totalEquity: 1000,
      totalPL: -5,
      dayPL: 0,
    });
  });

  it('keeps details on the selected parcel as quotes update and hides them when the parcel disappears', async () => {
    setHoldings([{ ...baseHolding }]);
    setQuotes([]);
    const view = renderTable();
    fireEvent.click(screen.getAllByTitle('View position details')[0]);
    expect(
      within(screen.getByRole('dialog')).getByText('$1,000.00')
    ).toBeInTheDocument();
    setQuotes([{ symbol: 'AAPL', price: 101, currency: 'USD', change: 1 }]);
    view.rerender(view.tree());
    await waitFor(() =>
      expect(
        within(screen.getByRole('dialog')).getByText('$1,010.00')
      ).toBeInTheDocument()
    );
    setHoldings([]);
    view.rerender(view.tree());
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });

  it.each([
    { selectedAccountId: 'other-account', selectedExchange: 'NASDAQ' },
    { selectedAccountId: 'acc-1', selectedExchange: 'ASX' },
  ])('hides details when the scope changes to %s', nextScope => {
    setHoldings([{ ...baseHolding }]);
    setQuotes([]);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const tree = (scope: {
      selectedAccountId: string;
      selectedExchange: string;
    }) => (
      <QueryClientProvider client={client}>
        <HoldingsTable {...scope} />
      </QueryClientProvider>
    );
    const view = render(
      tree({ selectedAccountId: 'acc-1', selectedExchange: 'NASDAQ' })
    );
    fireEvent.click(screen.getAllByTitle('View position details')[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    view.rerender(tree(nextScope));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([0, 1])(
    'opens read-only details from symbol layout %s and explicitly enters edit with comments intact',
    layoutIndex => {
      setHoldings([{ ...baseHolding, buyComments: 'Long-term rationale' }]);
      setQuotes([]);
      renderTable();
      fireEvent.click(
        screen.getAllByTitle('View position details')[layoutIndex]
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAccessibleName('Position details · AAPL');
      expect(
        within(dialog).getByText('Long-term rationale')
      ).toBeInTheDocument();
      expect(dialog.querySelector('input, textarea, select')).toBeNull();
      expect(screen.queryByText('Edit Position')).not.toBeInTheDocument();

      fireEvent.click(
        within(dialog).getByRole('button', { name: 'Edit position' })
      );
      expect(
        screen.queryByText('Position details · AAPL')
      ).not.toBeInTheDocument();
      expect(screen.getByText('Edit Position')).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('Long-term rationale')
      ).toBeInTheDocument();
    }
  );

  it('opens the audited purchase editor using full purchase metadata, not remaining units or prorated fees', () => {
    setHoldings([
      {
        ...baseHolding,
        accountId: 'acc-1',
        units: 4,
        buyFee: 0.123457,
        acquisitionCorrection: {
          operationId: 'op1',
          transactionId: 'buy1',
          expectedRevisionId: 'r1',
          expectedSourceFingerprint: 'a'.repeat(64),
          effectiveDate: '2026-01-01',
          sequence: 1,
          quantity: '10.000000000001',
          price: '100.123456789012',
          fees: '0.98765432',
        },
      },
    ]);
    setQuotes([]);
    renderTable();
    fireEvent.click(screen.getAllByTitle('View position details')[0]);
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Edit position',
      })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Correct acquisition' })
    );
    expect(
      screen.getByLabelText('Total bought units (not remaining units)')
    ).toHaveValue('10.000000000001');
    expect(screen.getByLabelText('Exact total purchase fees')).toHaveValue(
      '0.98765432'
    );
  });

  it('saves notes without resubmitting rounded fees, remaining units or execution dates', async () => {
    setHoldings([
      {
        ...baseHolding,
        origin: 'IMPORT_TRADE',
        units: 4,
        buyFee: 0.123457,
        buyComments: 'Original rationale',
      },
    ]);
    setQuotes([]);
    renderTable();
    fireEvent.click(screen.getAllByTitle('View position details')[0]);
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Edit position',
      })
    );
    fireEvent.change(screen.getByDisplayValue('Original rationale'), {
      target: { value: 'Reviewed rationale' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
    await waitFor(() =>
      expect(updatePositionMock).toHaveBeenCalledWith({
        id: 'p1',
        payload: expect.objectContaining({ openReason: 'Reviewed rationale' }),
      })
    );
    const payload = updatePositionMock.mock.calls.find(
      ([input]) => input.payload.openReason === 'Reviewed rationale'
    )?.[0].payload;
    expect(payload).not.toHaveProperty('openDate');
    expect(payload).not.toHaveProperty('entryPrice');
    expect(payload).not.toHaveProperty('quantity');
    expect(payload).not.toHaveProperty('buyFees');
  });

  it('closes the selected crypto parcel from details without losing precision or metadata', () => {
    setHoldings([
      {
        ...baseHolding,
        symbol: 'SHIB-AUD',
        exchangeCode: 'KRAKEN',
        assetType: 'CRYPTO',
        units: 0.00000000001,
        buyPrice: 0.00001234,
        currentPrice: 0.00002345,
      },
    ]);
    setQuotes([]);
    renderTable(undefined, false, 'KRAKEN');
    fireEvent.click(screen.getAllByTitle('View position details')[1]);
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Close position',
      })
    );
    expect(
      screen.queryByText('Position details · SHIB-AUD')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Sell Price (AUD) *')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.00002345')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.00000000001')).toBeInTheDocument();
  });

  it('dismisses details without opening a form or submitting a mutation', () => {
    setHoldings([{ ...baseHolding }]);
    setQuotes([]);
    renderTable();
    fireEvent.click(screen.getAllByTitle('View position details')[0]);
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' })
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(updatePositionMock).not.toHaveBeenCalled();
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it('defaults to seven essential columns and restores all metrics without changing row order or mobile content', () => {
    setHoldings([
      { ...baseHolding, maxRunUpPercent: 15, stopLoss: 95 },
      { ...baseHolding, id: 'p2', symbol: 'MSFT', openDate: '2026-02-01' },
    ]);
    setQuotes([]);
    const { container } = renderTable();
    const table = screen.getByRole('table');
    const headers = () =>
      within(table)
        .getAllByRole('columnheader')
        .map(cell => cell.textContent);
    expect(headers()).toEqual([
      'Symbol',
      'Units',
      'Price',
      'Day Change',
      'Position value',
      'Return',
      'Return %',
    ]);
    const rowOrder = () =>
      Array.from(table.querySelectorAll('tbody tr')).map(
        row => row.querySelector('td')?.textContent
      );
    const order = rowOrder();
    const mobile = container.querySelector('.holdings-portrait-cards');
    const mobileContent = mobile?.textContent;
    const toggle = screen.getByRole('button', { name: 'Advanced columns' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveAttribute(
      'aria-controls',
      container.querySelector('.holdings-landscape-table')?.id
    );

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(headers()).toHaveLength(17);
    expect(headers()).toEqual(
      expect.arrayContaining([
        'Buy',
        'Open',
        'Max Drawdown %',
        'Max Run-up %',
        'Stop Loss',
        'SL Return',
        'SL Return %',
        'Days Open',
        'Allocation',
        'Industry',
      ])
    );
    expect(rowOrder()).toEqual(order);
    expect(mobile?.textContent).toBe(mobileContent);
    fireEvent.click(toggle);
    expect(headers()).toHaveLength(7);
    expect(rowOrder()).toEqual(order);
  });

  it('preserves long crypto units and price precision in summary and advanced views', () => {
    setHoldings([
      {
        ...baseHolding,
        symbol: 'SHIB-AUD',
        exchangeCode: 'KRAKEN',
        assetType: 'CRYPTO',
        units: 1234567890.123456,
        buyPrice: 0.000012345678,
        currentPrice: 0.000023456789,
      },
    ]);
    setQuotes([]);
    renderTable(undefined, false, 'KRAKEN');
    const table = screen.getByRole('table');
    expect(within(table).getByText('1,234,567,890.123456')).toBeInTheDocument();
    expect(within(table).getByText('A$0.000023456789')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Advanced columns' }));
    expect(within(table).getByText('A$0.000012345678')).toBeInTheDocument();
  });

  it('does not value an AUD crypto position using a mismatched USD quote', () => {
    setHoldings([
      {
        ...baseHolding,
        symbol: 'BTC-AUD',
        exchangeCode: 'KRAKEN',
        assetType: 'CRYPTO',
        currentPrice: 101,
      },
    ]);
    useQuotesMock.mockReturnValue({
      data: [{ symbol: 'BTC-AUD', price: 9999, currency: 'USD', change: 5 }],
    });
    const onLiveTotals = vi.fn();
    renderTable(onLiveTotals, false, 'KRAKEN');
    expect(onLiveTotals).toHaveBeenLastCalledWith({
      totalEquity: 1010,
      totalPL: 5,
      dayPL: 0,
    });
    expect(
      screen.getByText(/Some live crypto prices are unavailable/)
    ).toBeInTheDocument();
  });
  it.each([0, 1])(
    'preserves crypto metadata when opening the close form from layout %s',
    layoutIndex => {
      setHoldings([
        {
          ...baseHolding,
          symbol: 'SHIB-AUD',
          name: 'Shiba Inu',
          exchangeCode: 'KRAKEN',
          assetType: 'CRYPTO',
          units: 0.00000000001,
          buyPrice: 0.00001234,
          currentPrice: 0.00002345,
        },
      ]);
      renderTable();
      fireEvent.click(screen.getAllByTitle('Close position')[layoutIndex]);
      expect(screen.getByText('Sell Price (AUD) *')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0.00002345')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0.00000000001')).toBeInTheDocument();
    }
  );
  it('uses natural page flow instead of a fixed-height nested scroll area', () => {
    setHoldings([]);
    setQuotes([]);

    renderTable();

    const card = screen.getByText('Holdings · Main').closest('.p-card');
    expect(card).toHaveClass('holdings-panel');
    expect(card).not.toHaveClass('h-[26rem]', 'overflow-hidden');
    expect(
      screen
        .getByRole('button', { name: 'Add Position', exact: true })
        .closest('.holdings-header-actions')
    ).not.toBeNull();
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

  it('keeps the highlight when the stop loss was reached earlier but the price recovered', () => {
    setHoldings([
      { ...baseHolding, stopLoss: 95, stopLossHitAt: '2026-02-03T00:00:00Z' },
    ]);
    setQuotes([quote(110)]);

    const { container } = renderTable();

    expect(triggeredRows(container).desktop).toHaveLength(1);
    expect(triggeredRows(container).mobile).toHaveLength(1);
    expect(checkStopLossMock).not.toHaveBeenCalled();
  });

  it('ignores a recorded hit when no stop loss is set', () => {
    setHoldings([
      {
        ...baseHolding,
        stopLoss: undefined,
        stopLossHitAt: '2026-02-03T00:00:00Z',
      },
    ]);
    setQuotes([quote(110)]);

    const { container } = renderTable();

    expect(triggeredRows(container).desktop).toHaveLength(0);
  });

  it('asks the backend to check price history once for a stop that is not flagged', () => {
    setHoldings([{ ...baseHolding, stopLoss: 95 }]);
    setQuotes([quote(110)]);

    const { rerender, tree } = renderTable();
    rerender(tree());

    expect(checkStopLossMock).toHaveBeenCalledTimes(1);
    expect(checkStopLossMock).toHaveBeenCalledWith({
      id: 'p1',
      currentPrice: undefined,
    });
  });

  it('reports a live stop loss hit with the current price', () => {
    setHoldings([{ ...baseHolding, stopLoss: 95 }]);
    setQuotes([quote(90)]);

    renderTable();

    expect(checkStopLossMock).toHaveBeenCalledWith({
      id: 'p1',
      currentPrice: 90,
    });
  });

  it('does not check positions without a stop loss', () => {
    setHoldings([{ ...baseHolding, stopLoss: undefined }]);
    setQuotes([quote(90)]);

    renderTable();

    expect(checkStopLossMock).not.toHaveBeenCalled();
  });

  it('does not check while offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    setHoldings([{ ...baseHolding, stopLoss: 95 }]);
    setQuotes([quote(90)]);

    renderTable();

    expect(checkStopLossMock).not.toHaveBeenCalled();
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

    fireEvent.click(screen.getByRole('button', { name: 'Advanced columns' }));
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

    fireEvent.click(screen.getByRole('button', { name: 'Advanced columns' }));
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

    fireEvent.click(screen.getByRole('button', { name: 'Advanced columns' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Advanced columns' }));
    expect(container.querySelector('.text-green-600')).toBeNull();
    expect(container.querySelector('.text-red-600')).toBeNull();
  });
});
