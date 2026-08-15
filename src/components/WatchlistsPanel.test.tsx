// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useWatchlistsMock,
  useWatchlistDetailMock,
  useCreateWatchlistMock,
  useRenameWatchlistMock,
  useDeleteWatchlistMock,
  useRemoveWatchlistItemMock,
  createMutateAsyncMock,
  renameMutateAsyncMock,
  deleteMutateAsyncMock,
  showToastMock,
} = vi.hoisted(() => ({
  useWatchlistsMock: vi.fn(),
  useWatchlistDetailMock: vi.fn(),
  useCreateWatchlistMock: vi.fn(),
  useRenameWatchlistMock: vi.fn(),
  useDeleteWatchlistMock: vi.fn(),
  useRemoveWatchlistItemMock: vi.fn(),
  createMutateAsyncMock: vi.fn(),
  renameMutateAsyncMock: vi.fn(),
  deleteMutateAsyncMock: vi.fn(),
  showToastMock: vi.fn(),
}));

const STABLE_WATCHLISTS = [{ id: 'w1', name: 'Tech', itemCount: 1 }];

vi.mock('@/hooks/api', () => ({
  useWatchlists: useWatchlistsMock,
  useWatchlistDetail: useWatchlistDetailMock,
  useCreateWatchlist: useCreateWatchlistMock,
  useRenameWatchlist: useRenameWatchlistMock,
  useDeleteWatchlist: useDeleteWatchlistMock,
  useRemoveWatchlistItem: useRemoveWatchlistItemMock,
}));

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: showToastMock }),
}));

import WatchlistsPanel from './WatchlistsPanel';

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  useWatchlistsMock.mockReturnValue({
    data: STABLE_WATCHLISTS,
    isLoading: false,
  });
  useWatchlistDetailMock.mockReturnValue({
    data: { id: 'w1', name: 'Tech', items: [] },
    isLoading: false,
  });
  useCreateWatchlistMock.mockReturnValue({
    mutateAsync: createMutateAsyncMock,
    isPending: false,
  });
  useRenameWatchlistMock.mockReturnValue({
    mutateAsync: renameMutateAsyncMock,
  });
  useDeleteWatchlistMock.mockReturnValue({
    mutateAsync: deleteMutateAsyncMock,
  });
  useRemoveWatchlistItemMock.mockReturnValue({ mutateAsync: vi.fn() });
});

describe('WatchlistsPanel', () => {
  it('shows an empty state when there are no watchlists', () => {
    useWatchlistsMock.mockReturnValue({ data: [], isLoading: false });
    render(<WatchlistsPanel />);

    expect(
      screen.getByText(/don't have any watchlists yet/i)
    ).toBeInTheDocument();
  });

  it('creates a watchlist from the name input', () => {
    render(<WatchlistsPanel />);

    fireEvent.change(screen.getByPlaceholderText('New watchlist name'), {
      target: { value: 'Dividend Picks' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(createMutateAsyncMock).toHaveBeenCalledWith('Dividend Picks');
  });

  it('deletes a watchlist', () => {
    render(<WatchlistsPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Tech' }));

    expect(deleteMutateAsyncMock).toHaveBeenCalledWith('w1');
  });

  it('renames a watchlist via the dialog', () => {
    render(<WatchlistsPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Rename Tech' }));
    const input = screen.getAllByDisplayValue('Tech')[0];
    fireEvent.change(input, { target: { value: 'Tech Growth' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(renameMutateAsyncMock).toHaveBeenCalledWith({
      id: 'w1',
      name: 'Tech Growth',
    });
  });
});
