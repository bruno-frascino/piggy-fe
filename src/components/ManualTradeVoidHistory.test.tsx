// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  hidden: false,
  result: {
    data: {
      total: 1,
      items: [
        {
          revisionId: 'v1',
          transactionId: 'tx1',
          kind: 'SELL',
          voidedAt: '2026-10-04T01:00:00.000Z',
          reason: 'Duplicate trade',
          before: {
            date: '2026-10-02T01:00:00.000Z',
            quantity: '2',
            price: '20',
            fees: '1',
            currency: 'AUD',
          },
        },
      ],
    },
    error: null as Error | null,
    isPending: false,
    isFetching: false,
    refetch: vi.fn(),
  },
}));
vi.mock('@/hooks/api', () => ({ useLiveManualTradeVoids: mocks.query }));
vi.mock('@/hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));
vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({
    mask: (value: string) => (mocks.hidden ? 'hidden' : value),
  }),
}));
import ManualTradeVoidHistory from './ManualTradeVoidHistory';
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.hidden = false;
  mocks.result.error = null;
});
describe('retained manual void history', () => {
  it('loads only on explicit expansion, scopes the account and retains source facts', () => {
    mocks.query.mockReturnValue(mocks.result);
    render(<ManualTradeVoidHistory accountId='a1' />);
    expect(mocks.query).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'View retained void audits' })
    );
    expect(mocks.query).toHaveBeenCalledWith('a1', 0);
    expect(screen.getByText('Original trade: tx1')).toBeInTheDocument();
    expect(screen.getByText(/04\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText('Reason: Duplicate trade')).toBeInTheDocument();
  });
  it('surfaces read errors and masks financial amounts and audit reasons', () => {
    mocks.hidden = true;
    mocks.result.error = new Error('Source audit mismatch');
    mocks.query.mockReturnValue(mocks.result);
    render(<ManualTradeVoidHistory accountId='a1' />);
    fireEvent.click(
      screen.getByRole('button', { name: 'View retained void audits' })
    );
    expect(screen.getByText('Source audit mismatch')).toBeInTheDocument();
    expect(
      screen.queryByText('Reason: Duplicate trade')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Reason: hidden')).toBeInTheDocument();
  });
});
