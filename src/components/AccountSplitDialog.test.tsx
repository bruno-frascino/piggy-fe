// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  reverse: vi.fn(),
  history: vi.fn(),
  holdings: vi.fn(),
}));

vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => true,
}));

vi.mock('@/hooks/api', () => ({
  usePostAccountSplit: () => ({
    mutateAsync: mocks.post,
    isPending: false,
  }),
  useReverseAccountSplit: () => ({
    mutateAsync: mocks.reverse,
    isPending: false,
  }),
  useAccountSplitHistory: (...args: unknown[]) => {
    mocks.history(...args);
    return {
      data: {
        accountId: 'a1',
        accountStatus: 'ACTIVE',
        total: 1,
        limit: 100,
        offset: 0,
        items: [
          {
            actionId: 'split-1',
            assetId: 'asset-1',
            effectiveDate: '2026-10-15',
            newUnits: '2',
            oldUnits: '1',
            sourceReference: 'statement-1',
            auditNumber: 4,
            sourceFingerprint: 'a'.repeat(64),
            recordedAt: '2026-10-15T01:00:00.000Z',
            affectedParcelCount: 1,
            reversal: null,
          },
        ],
      },
      isLoading: false,
      isError: false,
    };
  },
  useHoldings: (...args: unknown[]) => {
    mocks.holdings(...args);
    return {
      data: [
        {
          assetId: 'asset-1',
          symbol: 'AAPL',
          name: 'Apple',
          assetType: 'EQUITY',
        },
      ],
    };
  },
}));

import AccountSplitDialog from './AccountSplitDialog';

describe('AccountSplitDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows retained history and requires posting confirmation', async () => {
    render(
      <AccountSplitDialog
        accountId='a1'
        accountName='Brokerage'
        onHide={vi.fn()}
      />
    );

    expect(screen.getByText(/statement-1/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Record stock split' }));
    expect(await screen.findByText(/Complete all fields/)).toBeTruthy();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('offers terminal reversal with explicit confirmation', () => {
    render(
      <AccountSplitDialog
        accountId='a1'
        accountName='Brokerage'
        onHide={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Reverse' })[0]);
    expect(screen.getByText(/Confirm this reversal is terminal/)).toBeTruthy();
  });
});
