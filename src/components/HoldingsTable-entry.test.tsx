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

const { createPosition, showToast, holdingState } = vi.hoisted(() => ({
  createPosition: vi.fn(),
  showToast: vi.fn(),
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
  useCreatePosition: () => ({ mutateAsync: createPosition }),
  useUpdatePosition: () => ({ mutateAsync: vi.fn() }),
  useClosePosition: () => ({ mutateAsync: vi.fn() }),
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

import HoldingsTable from './HoldingsTable';

function openEntry(onExchangeSelected: (exchange: string) => void) {
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

beforeEach(() => vi.clearAllMocks());
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
    expect(createPosition).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'BTC-AUD',
        assetType: 'CRYPTO',
        exchangeCode: 'KRAKEN',
        accountId: 'acc1',
        quantity: 0.00000001,
      })
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
});
