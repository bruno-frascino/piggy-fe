// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useScreenerMock } = vi.hoisted(() => ({
  useScreenerMock: vi.fn(),
}));

vi.mock('@/hooks/api', () => ({
  useScreener: useScreenerMock,
  useWatchlists: () => ({ data: [], isLoading: false }),
  useWatchlistDetail: () => ({ data: undefined, isLoading: false }),
  useCreateWatchlist: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRenameWatchlist: () => ({ mutateAsync: vi.fn() }),
  useDeleteWatchlist: () => ({ mutateAsync: vi.fn() }),
  useRemoveWatchlistItem: () => ({ mutateAsync: vi.fn() }),
  useAddWatchlistItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSavedScreens: () => ({ data: [] }),
  useCreateSavedScreen: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteSavedScreen: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: vi.fn() }),
}));

import ScreenerView from './ScreenerView';

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  useScreenerMock.mockReturnValue({
    data: { mode: 'filter', results: [] },
    isFetching: false,
    isError: false,
  });
});

describe('ScreenerView', () => {
  it('shows the Discover tab (filters form) by default', () => {
    render(<ScreenerView />);

    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('New watchlist name')
    ).not.toBeInTheDocument();
  });

  it('switches to the My Watchlists tab', () => {
    render(<ScreenerView />);

    fireEvent.click(screen.getByRole('button', { name: 'My Watchlists' }));

    expect(
      screen.getByPlaceholderText('New watchlist name')
    ).toBeInTheDocument();
  });

  it('shows a provider-unavailable message when the screener errors', () => {
    useScreenerMock.mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: true,
    });
    render(<ScreenerView />);

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(
      screen.getByText(/screener temporarily unavailable/i)
    ).toBeInTheDocument();
  });

  it('shows an offline banner and disables the search button when offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    render(<ScreenerView />);

    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });
});
