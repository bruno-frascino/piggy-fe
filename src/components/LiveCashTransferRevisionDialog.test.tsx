// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { LiveCashTransferReview } from '@/lib/types';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  refetch: vi.fn(),
  hide: vi.fn(),
  toast: vi.fn(),
  state: {
    online: true,
    hidden: false,
    pending: false,
    fetching: false,
    error: null as Error | null,
  },
  review: {
    sourceAccountId: 'a1',
    destinationAccountId: 'a2',
    sourceOperationId: 'out1',
    destinationOperationId: 'in1',
    currency: 'AUD',
    sourceReference: 'broker-transfer',
    sourceHead: {
      revisionId: 'out1',
      auditNumber: 1,
      sourceFingerprint: 'a'.repeat(64),
    },
    destinationHead: {
      revisionId: 'in1',
      auditNumber: 2,
      sourceFingerprint: 'b'.repeat(64),
    },
    current: {
      effectiveDate: '2026-11-12',
      sourceSequence: 1,
      destinationSequence: 2,
      amount: '40',
      fee: '1',
    },
  } as LiveCashTransferReview,
}));
vi.mock('@/hooks/api', () => ({
  useLiveCashTransferReview: () => ({
    data: mocks.review,
    isLoading: false,
    isError: Boolean(mocks.state.error),
    error: mocks.state.error,
    isFetching: mocks.state.fetching,
    refetch: mocks.refetch,
  }),
  useCorrectLiveCashTransfer: () => ({
    mutateAsync: mocks.mutate,
    isPending: mocks.state.pending,
  }),
}));
vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mocks.state.online,
}));
vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({ hidden: mocks.state.hidden }),
}));
vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: mocks.toast }),
}));
vi.mock('./AppDialog', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
import LiveCashTransferRevisionDialog from './LiveCashTransferRevisionDialog';

beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(mocks.state, {
    online: true,
    hidden: false,
    pending: false,
    fetching: false,
    error: null,
  });
  mocks.review.sourceHead = {
    revisionId: 'out1',
    auditNumber: 1,
    sourceFingerprint: 'a'.repeat(64),
  };
  mocks.review.destinationHead = {
    revisionId: 'in1',
    auditNumber: 2,
    sourceFingerprint: 'b'.repeat(64),
  };
  mocks.review.current = {
    effectiveDate: '2026-11-12',
    sourceSequence: 1,
    destinationSequence: 2,
    amount: '40',
    fee: '1',
  };
});
afterEach(cleanup);

describe('paired transfer revision dialog', () => {
  it('preserves exact values and both review heads across ambiguous retries without silently changing identity', async () => {
    mocks.mutate
      .mockRejectedValueOnce(new Error('Response lost'))
      .mockResolvedValueOnce({});
    render(
      <LiveCashTransferRevisionDialog
        accountId='a1'
        operationId='out1'
        onHide={mocks.hide}
      />
    );
    fireEvent.change(screen.getByLabelText('Principal amount'), {
      target: { value: '35.000000000001' },
    });
    fireEvent.change(screen.getByLabelText('Audit reason'), {
      target: { value: 'Statement correction' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Correct both accounts' })
    );
    expect(await screen.findByText('Response lost')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Correct both accounts' })
    );
    await waitFor(() => expect(mocks.hide).toHaveBeenCalledOnce());
    expect(mocks.mutate.mock.calls[0][0]).toMatchObject({
      accountId: 'a1',
      operationId: 'out1',
      input: {
        sourceHead: mocks.review.sourceHead,
        destinationHead: mocks.review.destinationHead,
        reason: 'Statement correction',
        replacement: {
          amount: '35.000000000001',
          fee: '1',
          sourceSequence: 1,
          destinationSequence: 2,
        },
      },
    });
    expect(mocks.mutate.mock.calls[0][0].input.idempotencyKey).toBe(
      mocks.mutate.mock.calls[1][0].input.idempotencyKey
    );
  });

  it('requires an audit reason and acknowledgement for terminal paired reversal', async () => {
    mocks.mutate.mockResolvedValue({});
    render(
      <LiveCashTransferRevisionDialog
        accountId='a1'
        operationId='out1'
        onHide={mocks.hide}
      />
    );
    const reverse = screen.getByRole('button', {
      name: 'Reverse both accounts (terminal)',
    });
    fireEvent.click(reverse);
    expect(mocks.mutate).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Audit reason'), {
      target: { value: 'Duplicate transfer' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(reverse);
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledOnce());
    expect(mocks.mutate.mock.calls[0][0].input.replacement).toBeNull();
  });

  it.each(['offline', 'privacy', 'pending', 'terminal'])(
    'blocks %s revisions',
    mode => {
      if (mode === 'offline') mocks.state.online = false;
      if (mode === 'privacy') mocks.state.hidden = true;
      if (mode === 'pending') mocks.state.pending = true;
      if (mode === 'terminal') mocks.review.current = null;
      render(
        <LiveCashTransferRevisionDialog
          accountId='a1'
          operationId='out1'
          onHide={mocks.hide}
        />
      );
      const button = screen.queryByRole('button', {
        name: 'Correct both accounts',
      });
      if (button) expect(button).toBeDisabled();
      expect(mocks.mutate).not.toHaveBeenCalled();
    }
  );

  it('blocks stale/error review and resets the form when both refreshed heads arrive', () => {
    const dialog = () => (
      <LiveCashTransferRevisionDialog
        accountId='a1'
        operationId='out1'
        onHide={mocks.hide}
      />
    );
    const { rerender } = render(dialog());
    fireEvent.change(screen.getByLabelText('Principal amount'), {
      target: { value: '99' },
    });
    fireEvent.change(screen.getByLabelText('Audit reason'), {
      target: { value: 'Old review' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    mocks.state.fetching = true;
    rerender(dialog());
    expect(
      screen.getByRole('button', { name: 'Correct both accounts' })
    ).toBeDisabled();
    mocks.state.fetching = false;
    mocks.state.error = new Error('The destination source changed');
    rerender(dialog());
    expect(
      screen.getByText('The destination source changed')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Correct both accounts' })
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh both review heads' })
    );
    expect(mocks.refetch).toHaveBeenCalledOnce();
    mocks.state.error = null;
    mocks.review.sourceHead = {
      ...mocks.review.sourceHead,
      revisionId: 'out-revision',
      auditNumber: 3,
    };
    mocks.review.destinationHead = {
      ...mocks.review.destinationHead,
      revisionId: 'in-revision',
      auditNumber: 4,
    };
    mocks.review.current = {
      effectiveDate: '2026-11-12',
      sourceSequence: 1,
      destinationSequence: 2,
      amount: '30',
      fee: '1',
    };
    rerender(dialog());
    expect(screen.getByLabelText('Principal amount')).toHaveValue('30');
    expect(screen.getByLabelText('Audit reason')).toHaveValue('');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
