// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

const emptyResult = vi.hoisted(() => ({ data: [] as unknown[] }));

vi.mock('@/hooks/api', () => ({
  useHoldings: () => emptyResult,
  useQuotes: () => emptyResult,
  useRealizedPnL: () => ({ data: 0 }),
  useCreatePosition: () => ({ mutateAsync: vi.fn() }),
  useUpdatePosition: () => ({ mutateAsync: vi.fn() }),
  useRecalculateDrawdown: () => ({ mutateAsync: vi.fn() }),
  useCheckStopLoss: () => ({ mutateAsync: vi.fn() }),
  useClosePosition: () => ({ mutateAsync: vi.fn() }),
  useDeletePosition: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/lib/offline-write-queue', () => ({
  enqueueQueuedWrite: vi.fn(() => 0),
  syncQueuedWritesNow: vi.fn(async () => ({ processed: 0, remaining: 0 })),
}));
vi.mock('@/lib/toast-context', () => ({ useToast: () => ({ show: vi.fn() }) }));
vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({
    hidden: false,
    toggle: vi.fn(),
    hide: vi.fn(),
    mask: (v: string) => v,
  }),
}));
vi.mock('@/components/AddHoldingsDialog', () => ({ default: () => null }));
vi.mock('@/components/ImportUploadDialog', () => ({
  default: ({ accountId }: { accountId: string }) => (
    <div>Import dialog for {accountId}</div>
  ),
}));

import HoldingsTable from './HoldingsTable';

function renderTable(isDemo = false) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <HoldingsTable
        selectedAccountId='acc-1'
        selectedAccountName='Main'
        isDemo={isDemo}
      />
    </QueryClientProvider>
  );
}

afterEach(cleanup);

describe('HoldingsTable import entry point', () => {
  it('offers explicit empty-state entry points for adding or importing', () => {
    renderTable();
    expect(screen.getByText('No open positions yet')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add your first position' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Import trades' }));
    expect(screen.getByText('Import dialog for acc-1')).toBeInTheDocument();
  });

  it('does not suggest imports in the demo empty state', () => {
    renderTable(true);
    expect(
      screen.queryByRole('button', { name: 'Import trades' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add your first position' })
    ).toBeInTheDocument();
  });
  it('labels the responsive add-position action without replacing the import action', () => {
    renderTable();
    const button = screen.getByRole('button', { name: 'Add Position' });
    expect(button).toHaveTextContent('Add position');
    expect(button).toHaveClass('portfolio-primary-action');
    expect(
      screen.getByRole('button', { name: 'Import from exchange' })
    ).toBeInTheDocument();
  });

  it('opens the import dialog locked to the selected account', () => {
    renderTable();
    expect(screen.queryByText(/Import dialog/)).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Import from exchange' })
    );
    expect(screen.getByText('Import dialog for acc-1')).toBeInTheDocument();
  });

  it('is not offered for demo accounts (they cannot be imported into)', () => {
    renderTable(true);
    expect(
      screen.queryByRole('button', { name: 'Import from exchange' })
    ).not.toBeInTheDocument();
  });
});
