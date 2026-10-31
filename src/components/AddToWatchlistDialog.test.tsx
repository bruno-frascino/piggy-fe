// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useWatchlistsMock,
  useAddWatchlistItemMock,
  useCreateWatchlistMock,
  addItemMutateAsyncMock,
  createWatchlistMutateAsyncMock,
  showToastMock,
} = vi.hoisted(() => ({
  useWatchlistsMock: vi.fn(),
  useAddWatchlistItemMock: vi.fn(),
  useCreateWatchlistMock: vi.fn(),
  addItemMutateAsyncMock: vi.fn(),
  createWatchlistMutateAsyncMock: vi.fn(),
  showToastMock: vi.fn(),
}));

const STABLE_WATCHLISTS = [{ id: 'w1', name: 'Tech', itemCount: 1 }];

vi.mock('@/hooks/api', () => ({
  useWatchlists: useWatchlistsMock,
  useAddWatchlistItem: useAddWatchlistItemMock,
  useCreateWatchlist: useCreateWatchlistMock,
}));

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: showToastMock }),
}));

import AddToWatchlistDialog from './AddToWatchlistDialog';
import type { ScreenerResult } from '@/lib/types';

const stock: ScreenerResult = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  exchange: 'NASDAQ',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  marketCap: 1_000,
  price: 200,
  lastAnnualDividend: 1,
  isEtf: false,
  country: 'US',
  alreadyTracked: false,
  inWatchlist: false,
};

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  useWatchlistsMock.mockReturnValue({ data: STABLE_WATCHLISTS });
  useAddWatchlistItemMock.mockReturnValue({
    mutateAsync: addItemMutateAsyncMock,
    isPending: false,
  });
  useCreateWatchlistMock.mockReturnValue({
    mutateAsync: createWatchlistMutateAsyncMock,
    isPending: false,
  });
});

describe('AddToWatchlistDialog', () => {
  it('keeps watchlist creation outside the scrolling selection list', () => {
    render(<AddToWatchlistDialog visible stock={stock} onHide={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveClass('task-dialog');
    expect(
      screen
        .getByLabelText('Create a new watchlist')
        .closest('.p-dialog-footer')
    ).not.toBeNull();
    expect(
      screen
        .getByRole('button', { name: 'Create & add' })
        .closest('.p-dialog-footer')
    ).not.toBeNull();
    expect(
      screen.getByRole('button', { name: 'Tech' }).closest('.p-dialog-content')
    ).not.toBeNull();
  });
  it('adds the stock to an existing watchlist', async () => {
    addItemMutateAsyncMock.mockResolvedValue({ id: 'item1' });
    render(<AddToWatchlistDialog visible stock={stock} onHide={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tech' }));

    expect(addItemMutateAsyncMock).toHaveBeenCalledWith({
      watchlistId: 'w1',
      item: {
        symbol: 'AAPL',
        exchangeCode: 'NASDAQ',
        name: 'Apple Inc.',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        marketCap: 1_000,
      },
    });
  });

  it('creates a new watchlist and adds the stock to it', async () => {
    createWatchlistMutateAsyncMock.mockResolvedValue({ id: 'w2', name: 'New' });
    addItemMutateAsyncMock.mockResolvedValue({ id: 'item1' });
    render(<AddToWatchlistDialog visible stock={stock} onHide={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('New watchlist name'), {
      target: { value: 'New' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create & add' }));

    expect(createWatchlistMutateAsyncMock).toHaveBeenCalledWith('New');
  });
});
