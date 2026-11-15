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
import type { LocalHolding } from './AddHoldingsDialog';

const {
  createPosition,
  postAccountTrade,
  closePosition,
  showToast,
  holdingState,
  capabilityMode,
  capabilitySequence,
  mutationState,
} = vi.hoisted(() => ({
  createPosition: vi.fn(),
  postAccountTrade: vi.fn(),
  closePosition: vi.fn(),
  showToast: vi.fn(),
  capabilityMode: { value: 'LEGACY' as 'LEGACY' | 'LIVE_LEDGER' },
  capabilitySequence: { value: 1 },
  mutationState: { posting: false },
  holdingState: {
    holdings: [],
    rows: [],
    totals: {},
    quoteMap: new Map(),
    currency: 'AUD',
    setHoldings: vi.fn(),
    anyStopLoss: false,
    tableScrollHeight: '400px',
  },
}));

vi.mock('@/hooks/useHoldingRows', () => ({
  useHoldingRows: () => holdingState,
}));
vi.mock('@/hooks/api', () => ({
  useAccountTradeCapability: (_accountId: string, effectiveDate: string) => ({
    data: {
      accountId: 'acc1',
      mode: capabilityMode.value,
      reason: null,
      openingDate: '2025-12-31',
      effectiveDate,
      nextSequence: capabilitySequence.value,
    },
    resolve: async (date: string) => ({
      accountId: 'acc1',
      mode: capabilityMode.value,
      reason: null,
      openingDate: '2025-12-31',
      effectiveDate: date,
      nextSequence: capabilitySequence.value,
    }),
  }),
  useCreatePosition: () => ({ mutateAsync: createPosition }),
  usePostAccountTrade: () => ({
    mutateAsync: postAccountTrade,
    isPending: mutationState.posting,
  }),
  useUpdatePosition: () => ({ mutateAsync: vi.fn() }),
  useClosePosition: () => ({ mutateAsync: closePosition }),
  useDeletePosition: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: showToast }),
}));
vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({ mask: (value: string) => value, hidden: false }),
}));
vi.mock('./AddHoldingsDialog', () => ({
  default: ({
    visible,
    onSubmit,
    onHide,
    error,
  }: {
    visible: boolean;
    onSubmit: (holding: LocalHolding) => void;
    onHide: () => void;
    error?: string;
  }) =>
    visible ? (
      <div role='dialog'>
        {error && <p role='alert'>{error}</p>}
        <button
          onClick={() =>
            onSubmit({
              symbol: 'BTC-AUD',
              name: 'Bitcoin',
              industry: '',
              assetType: 'CRYPTO',
              exchangeCode: 'KRAKEN',
              openDate: '2026-01-01',
              units: 0.00000001,
              buyPrice: 80000,
              buyFee: 0,
            })
          }
        >
          Save purchase
        </button>
        <button onClick={onHide}>Cancel purchase</button>
      </div>
    ) : null,
}));
vi.mock('./ClosePositionDialog', () => ({
  default: ({
    visible,
    onSubmit,
    busy,
  }: {
    visible: boolean;
    busy: boolean;
    onSubmit: (payload: {
      closeDate: string;
      closeUnits: number;
      sellPrice: number;
      sellFee: number;
      closeReason: 'TARGET';
      comments: string;
    }) => void;
  }) =>
    visible ? (
      <button
        disabled={busy}
        onClick={() =>
          onSubmit({
            closeDate: '2026-01-02',
            closeUnits: 1,
            sellPrice: 120,
            sellFee: 1,
            closeReason: 'TARGET',
            comments: 'Target reached',
          })
        }
      >
        Save sale
      </button>
    ) : null,
}));

import HoldingsTable from './HoldingsTable';

function openEntry(onExchangeSelected: (exchange: string) => void) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: true,
  });
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <HoldingsTable
        selectedAccountId='acc1'
        selectedAccountName='Savings'
        selectedExchange='ASX'
        onExchangeSelected={onExchangeSelected}
      />
    </QueryClientProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Add Position' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  capabilityMode.value = 'LEGACY';
  capabilitySequence.value = 1;
  mutationState.posting = false;
  holdingState.rows = [];
  holdingState.holdings = [];
});
afterEach(cleanup);

describe('saved-position exchange selection', () => {
  it('switches venue only after the server accepts the purchase', async () => {
    let finish: (() => void) | undefined;
    createPosition.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        })
    );
    const selected = vi.fn();
    openEntry(selected);
    fireEvent.click(screen.getByRole('button', { name: 'Save purchase' }));
    await waitFor(() =>
      expect(createPosition).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTC-AUD',
          assetType: 'CRYPTO',
          exchangeCode: 'KRAKEN',
          accountId: 'acc1',
          quantity: 0.00000001,
        })
      )
    );
    expect(selected).not.toHaveBeenCalled();
    finish?.();
    await waitFor(() => expect(selected).toHaveBeenCalledWith('KRAKEN'));
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        detail: expect.stringContaining('Savings · Kraken (AUD)'),
      })
    );
  });

  it('keeps the form open with an error and does not change exchange on failure or cancel', async () => {
    createPosition.mockRejectedValueOnce(
      new Error('Kraken market validation temporarily unavailable')
    );
    const selected = vi.fn();
    openEntry(selected);
    fireEvent.click(screen.getByRole('button', { name: 'Save purchase' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /temporarily unavailable/
      )
    );
    expect(selected).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel purchase' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(selected).not.toHaveBeenCalled();
  });

  it('routes a ledger-backed purchase through the coordinated writer', async () => {
    capabilityMode.value = 'LIVE_LEDGER';
    const selected = vi.fn();
    openEntry(selected);
    fireEvent.click(screen.getByRole('button', { name: 'Save purchase' }));
    await waitFor(() => expect(postAccountTrade).toHaveBeenCalled());
    expect(postAccountTrade).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'acc1',
        input: expect.objectContaining({
          kind: 'BUY',
          symbol: 'BTC-AUD',
          exchangeCode: 'KRAKEN',
          assetName: 'Bitcoin',
          effectiveDate: '2026-01-01',
          sequence: 1,
          quantity: '0.00000001',
          price: '80000',
          fees: '0',
          stopLossPrice: null,
        }),
      })
    );
    expect(createPosition).not.toHaveBeenCalled();
    expect(selected).toHaveBeenCalledWith('KRAKEN');
  });

  it.each([false, true])(
    'routes ledger-backed sales and prevents another submission while pending=%s',
    async pending => {
      capabilityMode.value = 'LIVE_LEDGER';
      mutationState.posting = pending;
      holdingState.rows = [
        {
          id: 'position-1',
          originalIndex: 0,
          symbol: 'AAPL',
          name: 'Apple',
          industry: 'Technology',
          assetType: 'EQUITY',
          exchangeCode: 'NASDAQ',
          openDate: '2025-12-01',
          units: 1,
          buyPrice: 100,
          buyFee: 1,
          effectivePrice: 100,
          currentPrice: 100,
          currentPosition: 100,
          stopLoss: undefined,
        },
      ] as typeof holdingState.rows;
      const client = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
      });
      render(
        <QueryClientProvider client={client}>
          <HoldingsTable
            selectedAccountId='acc1'
            selectedAccountName='Savings'
            selectedExchange='NASDAQ'
          />
        </QueryClientProvider>
      );
      fireEvent.click(screen.getAllByTitle('Close position')[0]);
      if (pending) {
        expect(
          screen.getByRole('button', { name: 'Save sale' })
        ).toBeDisabled();
        expect(postAccountTrade).not.toHaveBeenCalled();
        return;
      }
      fireEvent.click(screen.getByRole('button', { name: 'Save sale' }));

      await waitFor(() => expect(postAccountTrade).toHaveBeenCalled());
      expect(postAccountTrade).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'acc1',
          input: expect.objectContaining({
            kind: 'SELL',
            positionId: 'position-1',
            effectiveDate: '2026-01-02',
            sequence: 1,
            quantity: '1',
            price: '120',
            fees: '1',
            closeReason: 'TARGET',
            notes: 'Target reached',
          }),
        })
      );
      expect(closePosition).not.toHaveBeenCalled();
    }
  );

  it('reuses the same idempotency key and sequence after an ambiguous response', async () => {
    capabilityMode.value = 'LIVE_LEDGER';
    postAccountTrade.mockRejectedValueOnce(new Error('Network response lost'));
    const selected = vi.fn();
    openEntry(selected);
    fireEvent.click(screen.getByRole('button', { name: 'Save purchase' }));
    await waitFor(() => expect(postAccountTrade).toHaveBeenCalledTimes(1));
    await screen.findAllByText('Network response lost');

    capabilitySequence.value = 2;
    fireEvent.click(screen.getByRole('button', { name: 'Save purchase' }));
    await waitFor(() => expect(postAccountTrade).toHaveBeenCalledTimes(2));
    const first = postAccountTrade.mock.calls[0][0].input;
    const retry = postAccountTrade.mock.calls[1][0].input;
    expect(retry.idempotencyKey).toBe(first.idempotencyKey);
    expect(retry.sequence).toBe(first.sequence);
  });
});
