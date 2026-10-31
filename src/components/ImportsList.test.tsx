// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ loading: false }));

vi.mock('@/hooks/api', () => ({
  useImports: () => ({
    isLoading: state.loading,
    data: state.loading
      ? undefined
      : [
          {
            id: 'import-1',
            accountId: 'account-1',
            status: 'PENDING_REVIEW',
            createdAt: '2026-01-05T12:00:00Z',
            fileNames: ['trades.csv'],
            eventCounts: { PENDING: 2 },
          },
        ],
    isError: false,
  }),
  useTradingAccounts: () => ({
    data: [{ id: 'account-1', name: 'Kraken account' }],
  }),
}));

import ImportsList from './ImportsList';

afterEach(() => {
  cleanup();
  state.loading = false;
});

describe('ImportsList', () => {
  it('shows an explicit loading state before imports arrive', () => {
    state.loading = true;
    render(<ImportsList />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading imports...');
    expect(screen.queryByText('No imports yet.')).not.toBeInTheDocument();
  });
  it('links each import to its review and shows its account and status', () => {
    render(<ImportsList />);
    expect(screen.getByRole('link', { name: /Kraken ·/ })).toHaveAttribute(
      'href',
      '/imports/import-1'
    );
    expect(
      screen.getByRole('link', { name: /Kraken · 05\/01\/2026/ })
    ).toBeInTheDocument();
    expect(screen.getByText('Kraken account · trades.csv')).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();
  });
});
