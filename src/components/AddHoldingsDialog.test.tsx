// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Characterization tests for AddHoldingsDialog's form-validation logic and
// submission shaping — the riskiest, most complex part of this component and
// previously entirely untested. These pin down current behavior before any
// hook-extraction refactor (e.g. pulling symbol search / account loading into
// dedicated hooks).

const { getTradingAccountsMock, searchStocksMock } = vi.hoisted(() => ({
  getTradingAccountsMock: vi.fn(),
  searchStocksMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    getTradingAccounts: getTradingAccountsMock,
    searchStocks: searchStocksMock,
  },
}));

import AddHoldingsDialog from './AddHoldingsDialog';

function enterManualSymbol(symbol: string) {
  fireEvent.click(
    screen.getByRole('button', { name: /Can't find it\? Enter manually/i })
  );
  fireEvent.change(screen.getByPlaceholderText('e.g. AAPL'), {
    target: { value: symbol },
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  getTradingAccountsMock.mockResolvedValue([]);
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
      maxDrawdownPercent: undefined,
    });
  });

  it('defaults maxDrawdownPercent to null (explicit reset) in edit mode when left blank', () => {
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
        }}
        onHide={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      maxDrawdownPercent: null,
    });
  });
});

describe('AddHoldingsDialog account loading', () => {
  it('loads trading account names when the dialog opens', () => {
    getTradingAccountsMock.mockResolvedValue([
      { id: 'a1', name: 'Main' },
      { id: 'a2', name: 'Spouse' },
    ]);

    render(<AddHoldingsDialog visible onHide={vi.fn()} onSubmit={vi.fn()} />);

    expect(getTradingAccountsMock).toHaveBeenCalledTimes(1);
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
