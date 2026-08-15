// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  runScreenerMock,
  getWatchlistsMock,
  createWatchlistMock,
  addWatchlistItemMock,
  removeWatchlistItemMock,
} = vi.hoisted(() => ({
  runScreenerMock: vi.fn(),
  getWatchlistsMock: vi.fn(),
  createWatchlistMock: vi.fn(),
  addWatchlistItemMock: vi.fn(),
  removeWatchlistItemMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    runScreener: runScreenerMock,
    getWatchlists: getWatchlistsMock,
    createWatchlist: createWatchlistMock,
    addWatchlistItem: addWatchlistItemMock,
    removeWatchlistItem: removeWatchlistItemMock,
  },
}));

import {
  useAddWatchlistItem,
  useCreateWatchlist,
  useRemoveWatchlistItem,
  useScreener,
  useWatchlists,
} from './api';

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('screener and watchlist hooks', () => {
  it('runs the screener with the given filters', async () => {
    runScreenerMock.mockResolvedValue({ mode: 'filter', results: [] });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useScreener({ sector: 'Technology' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(runScreenerMock).toHaveBeenCalledWith({ sector: 'Technology' });
  });

  it('does not run the screener when disabled', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useScreener({}, false), {
      wrapper: createWrapper(queryClient),
    });

    expect(runScreenerMock).not.toHaveBeenCalled();
  });

  it('lists watchlists', async () => {
    getWatchlistsMock.mockResolvedValue([{ id: 'w1', name: 'Tech' }]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useWatchlists(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'w1', name: 'Tech' }]);
  });

  it('creates a watchlist and invalidates the watchlists query', async () => {
    createWatchlistMock.mockResolvedValue({ id: 'w1', name: 'Tech' });
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateWatchlist(), {
      wrapper: createWrapper(queryClient),
    });

    await act(() => result.current.mutateAsync('Tech'));

    expect(createWatchlistMock).toHaveBeenCalledWith('Tech');
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['watchlists'],
    });
  });

  it('adds a watchlist item and invalidates watchlists/watchlist/screener queries', async () => {
    addWatchlistItemMock.mockResolvedValue({ id: 'item1', symbol: 'AAPL' });
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useAddWatchlistItem(), {
      wrapper: createWrapper(queryClient),
    });

    await act(() =>
      result.current.mutateAsync({
        watchlistId: 'w1',
        item: { symbol: 'AAPL', exchangeCode: 'NASDAQ' },
      })
    );

    expect(addWatchlistItemMock).toHaveBeenCalledWith('w1', {
      symbol: 'AAPL',
      exchangeCode: 'NASDAQ',
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['watchlists'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['watchlist', 'w1'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['screener'],
    });
  });

  it('removes a watchlist item', async () => {
    removeWatchlistItemMock.mockResolvedValue({ success: true });
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });

    const { result } = renderHook(() => useRemoveWatchlistItem(), {
      wrapper: createWrapper(queryClient),
    });

    await act(() =>
      result.current.mutateAsync({ watchlistId: 'w1', itemId: 'item1' })
    );

    expect(removeWatchlistItemMock).toHaveBeenCalledWith('w1', 'item1');
  });
});
