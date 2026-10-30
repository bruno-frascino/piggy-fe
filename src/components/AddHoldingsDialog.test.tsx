// @vitest-environment jsdom

import type { ReactElement } from 'react';
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render as renderWithTestingLibrary,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Characterization tests for AddHoldingsDialog's form-validation logic and
// submission shaping — the riskiest, most complex part of this component and
// previously entirely untested. These pin down current behavior before any
// hook-extraction refactor (e.g. pulling symbol search / account loading into
// dedicated hooks).

const {
  getTradingAccountsMock,
  searchStocksMock,
  getExchangesMock,
  searchKrakenAssetsMock,
} = vi.hoisted(() => ({
  searchKrakenAssetsMock: vi.fn(),
  getExchangesMock: vi.fn(),
  getTradingAccountsMock: vi.fn(),
  searchStocksMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    getExchanges: getExchangesMock,
    searchKrakenAssets: searchKrakenAssetsMock,
    getTradingAccounts: getTradingAccountsMock,
    searchStocks: searchStocksMock,
  },
}));

import AddHoldingsDialog from './AddHoldingsDialog';

function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderWithTestingLibrary(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

function enterManualSymbol(symbol: string) {
  fireEvent.click(
    screen.getByRole('button', { name: /Can't find it\? Enter manually/i })
  );
  fireEvent.change(screen.getByPlaceholderText('e.g. AAPL'), {
    target: { value: symbol },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getTradingAccountsMock.mockResolvedValue([]);
  getExchangesMock.mockResolvedValue([
    { code: 'NASDAQ', name: 'Nasdaq', currency: 'USD', isCrypto: false },
  ]);
  searchKrakenAssetsMock.mockImplementation(
    async (_q: string, quote: 'AUD' | 'USD') => [
      {
        base: 'BTC',
        name: 'Bitcoin',
        quote,
        symbol: `BTC-${quote}`,
        exchangeCode: quote === 'AUD' ? 'KRAKEN' : 'KRAKEN_USD',
      },
    ]
  );
});

afterEach(cleanup);

describe('Kraken purchase entry', () => {
  async function openCrypto() {
    await waitFor(() =>
      expect(screen.getByRole('dialog')).toHaveClass('p-dialog-enter-done')
    );
    fireEvent.click(screen.getByRole('button', { name: 'Crypto' }));
  }

  async function chooseBitcoin() {
    fireEvent.change(screen.getByPlaceholderText(/Search Bitcoin/), {
      target: { value: 'bitcoin' },
    });
    await waitFor(() =>
      expect(screen.getByText('Bitcoin')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText('Bitcoin'));
  }

  it('creates a canonical Kraken crypto purchase from an ASX dashboard without changing context early', async () => {
    const onSubmit = vi.fn();
    render(
      <AddHoldingsDialog
        visible
        exchangeCode='ASX'
        accountName='Crypto savings'
        initial={{ units: 0.00000001, buyPrice: 80000 }}
        onHide={vi.fn()}
        onSubmit={onSubmit}
      />
    );
    await openCrypto();
    expect(screen.getByLabelText('Bought on')).toHaveValue('Kraken');
    await chooseBitcoin();
    expect(searchKrakenAssetsMock).toHaveBeenCalledWith('bitcoin', 'AUD');
    expect(screen.getByLabelText('Quantity (BTC) *')).toHaveValue('0.00000001');
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Add Position' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'BTC-AUD',
        name: 'Bitcoin',
        assetType: 'CRYPTO',
        exchangeCode: 'KRAKEN',
        units: 0.00000001,
        buyPrice: 80000,
        accountName: 'Crypto savings',
      })
    );
  });

  it('clears a selected coin when purchase currency changes and requires a fresh selection', async () => {
    const onSubmit = vi.fn();
    render(
      <AddHoldingsDialog
        visible
        exchangeCode='ASX'
        initial={{ units: 1, buyPrice: 100 }}
        onHide={vi.fn()}
        onSubmit={onSubmit}
      />
    );
    await openCrypto();
    await chooseBitcoin();
    fireEvent.click(screen.getByRole('button', { name: 'USD' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Position' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('Choose a coin from Kraken search before saving.')
    ).toBeInTheDocument();
    await chooseBitcoin();
    fireEvent.click(screen.getByRole('button', { name: 'Add Position' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'BTC-USD',
        exchangeCode: 'KRAKEN_USD',
        assetType: 'CRYPTO',
      })
    );
  });

  it('explains unavailable search and retries without losing purchase details', async () => {
    searchKrakenAssetsMock.mockRejectedValueOnce(new Error('503'));
    const onSubmit = vi.fn();
    render(
      <AddHoldingsDialog
        visible
        exchangeCode='ASX'
        initial={{ units: 2, buyPrice: 123 }}
        onHide={vi.fn()}
        onSubmit={onSubmit}
      />
    );
    await openCrypto();
    fireEvent.change(screen.getByPlaceholderText(/Search Bitcoin/), {
      target: { value: 'BTC' },
    });
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Retry search' })
      ).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry search' }));
    await waitFor(() =>
      expect(searchKrakenAssetsMock).toHaveBeenCalledTimes(2)
    );
    expect(screen.getByLabelText('Quantity *')).toHaveValue('2');
  });

  it('distinguishes no matching pair from a provider outage', async () => {
    searchKrakenAssetsMock.mockResolvedValue([]);
    render(
      <AddHoldingsDialog
        visible
        exchangeCode='ASX'
        onHide={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    await openCrypto();
    fireEvent.change(screen.getByPlaceholderText(/Search Bitcoin/), {
      target: { value: 'unknown' },
    });
    await waitFor(() =>
      expect(
        screen.getByText(/No matching Kraken AUD pair/)
      ).toBeInTheDocument()
    );
    expect(
      screen.queryByRole('button', { name: 'Retry search' })
    ).not.toBeInTheDocument();
  });
});

describe('AddHoldingsDialog validation', () => {
  it('blocks submission and shows the exchange-detection error when no symbol/exchange is resolved', () => {
    const onSubmit = vi.fn();

    render(<AddHoldingsDialog visible onHide={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Position' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Select a symbol from search so exchange can be detected'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Enter units greater than 0')).toBeInTheDocument();
  });

  it('requires units to be greater than zero even when a symbol/exchange is resolved', () => {
    const onSubmit = vi.fn();

    render(
      <AddHoldingsDialog
        visible
        exchangeCode='NASDAQ'
        onHide={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    enterManualSymbol('AAPL');
    fireEvent.click(screen.getByRole('button', { name: 'Add Position' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Enter units greater than 0')).toBeInTheDocument();
  });

  it('submits a fully-shaped LocalHolding when the form is valid', () => {
    const onSubmit = vi.fn();

    // PrimeReact's InputNumber processes native keystroke events internally
    // (not plain fireEvent.change), so units/buyPrice are seeded via `initial`
    // here — this characterizes AddHoldingsDialog's own validation/shaping
    // logic, not PrimeReact's InputNumber widget internals.
    render(
      <AddHoldingsDialog
        visible
        exchangeCode='nasdaq'
        initial={{ units: 10, buyPrice: 100 }}
        onHide={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    enterManualSymbol('aapl');

    fireEvent.click(screen.getByRole('button', { name: 'Add Position' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted).toMatchObject({
      symbol: 'AAPL',
      units: 10,
      buyPrice: 100,
      buyFee: 0,
      accountName: 'Main',
      exchangeCode: 'NASDAQ',
      currentPrice: 100,
      buyComments: undefined,
    });
  });

  it('does not expose or override automatically calculated max drawdown in edit mode', () => {
    const onSubmit = vi.fn();

    render(
      <AddHoldingsDialog
        visible
        mode='edit'
        exchangeCode='NASDAQ'
        initial={{
          symbol: 'AAPL',
          name: 'Apple',
          openDate: '2026-01-01',
          units: 5,
          buyPrice: 50,
          buyFee: 2,
          accountName: 'Main',
          exchangeCode: 'NASDAQ',
          currentPrice: 55,
          maxDrawdownPercent: 12.5,
        }}
        onHide={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    expect(screen.queryByText('Max Drawdown %')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].maxDrawdownPercent).toBeUndefined();
  });
});

describe('AddHoldingsDialog account loading', () => {
  it('loads trading account names when the dialog opens', async () => {
    getTradingAccountsMock.mockResolvedValue([
      { id: 'a1', name: 'Main' },
      { id: 'a2', name: 'Spouse' },
    ]);

    render(<AddHoldingsDialog visible onHide={vi.fn()} onSubmit={vi.fn()} />);

    await waitFor(() => {
      expect(getTradingAccountsMock).toHaveBeenCalledWith(false);
    });
  });

  it('does not fetch accounts while the dialog is hidden', () => {
    render(
      <AddHoldingsDialog visible={false} onHide={vi.fn()} onSubmit={vi.fn()} />
    );

    expect(getTradingAccountsMock).not.toHaveBeenCalled();
  });
});

describe('AddHoldingsDialog delete affordance', () => {
  it('shows a Delete button only in edit mode when onDelete is provided', () => {
    const onDelete = vi.fn();

    render(
      <AddHoldingsDialog
        visible
        mode='edit'
        exchangeCode='NASDAQ'
        initial={{
          symbol: 'AAPL',
          name: 'Apple',
          openDate: '2026-01-01',
          units: 5,
          buyPrice: 50,
          buyFee: 2,
          accountName: 'Main',
          exchangeCode: 'NASDAQ',
          currentPrice: 55,
        }}
        onHide={vi.fn()}
        onSubmit={vi.fn()}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('hides the Delete button in add mode', () => {
    render(<AddHoldingsDialog visible onHide={vi.fn()} onSubmit={vi.fn()} />);

    expect(
      screen.queryByRole('button', { name: 'Delete' })
    ).not.toBeInTheDocument();
  });
});

describe('AddHoldingsDialog stop loss', () => {
  const editInitial = {
    symbol: 'AAPL',
    name: 'Apple',
    openDate: '2026-01-01',
    units: 5,
    buyPrice: 50,
    buyFee: 2,
    accountName: 'Main',
    exchangeCode: 'NASDAQ',
    currentPrice: 55,
  };

  function stopLossInput() {
    return screen
      .getByText('Stop Loss')
      .parentElement!.querySelector('input') as HTMLInputElement;
  }

  it('pre-fills the stop loss in edit mode', () => {
    render(
      <AddHoldingsDialog
        visible
        mode='edit'
        exchangeCode='NASDAQ'
        initial={{ ...editInitial, stopLoss: 45.5 }}
        onHide={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(stopLossInput().value).toBe('45.5');
  });

  it('shows an empty stop loss field (not 0) when none is set', () => {
    render(
      <AddHoldingsDialog
        visible
        mode='edit'
        exchangeCode='NASDAQ'
        initial={editInitial}
        onHide={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(stopLossInput().value).toBe('');
  });

  it('submits the stop loss when set', () => {
    const onSubmit = vi.fn();
    render(
      <AddHoldingsDialog
        visible
        mode='edit'
        exchangeCode='NASDAQ'
        initial={{ ...editInitial, stopLoss: 45 }}
        onHide={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit.mock.calls[0][0].stopLoss).toBe(45);
  });

  it('treats a stop loss of 0 as unset on submit', () => {
    const onSubmit = vi.fn();
    render(
      <AddHoldingsDialog
        visible
        mode='edit'
        exchangeCode='NASDAQ'
        initial={{ ...editInitial, stopLoss: 0 }}
        onHide={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit.mock.calls[0][0].stopLoss).toBeUndefined();
  });
});
