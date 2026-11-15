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
import type { LiveFxConversionReview } from '@/lib/types';

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
    accountId: 'a1',
    operationId: 'fx1',
    fromCurrency: 'AUD',
    toCurrency: 'USD',
    sourceReference: 'broker-fx',
    expectedRevisionId: 'fx1',
    auditNumber: 1,
    sourceFingerprint: 'a'.repeat(64),
    current: {
      effectiveDate: '2026-11-12',
      sequence: 1,
      fromAmount: '50',
      toAmount: '30',
      fees: [
        { currency: 'AUD', amount: '1' },
        { currency: 'USD', amount: '2' },
      ],
    },
  } as LiveFxConversionReview,
}));
vi.mock('@/hooks/api', () => ({
  useLiveFxConversionReview: () => ({
    data: mocks.review,
    isLoading: false,
    isError: Boolean(mocks.state.error),
    error: mocks.state.error,
    isFetching: mocks.state.fetching,
    refetch: mocks.refetch,
  }),
  useCorrectLiveFxConversion: () => ({
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
import LiveFxRevisionDialog from './LiveFxRevisionDialog';
beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(mocks.state, {
    online: true,
    hidden: false,
    pending: false,
    fetching: false,
    error: null,
  });
  mocks.review.expectedRevisionId = 'fx1';
  mocks.review.auditNumber = 1;
  mocks.review.current = {
    effectiveDate: '2026-11-12',
    sequence: 1,
    fromAmount: '50',
    toAmount: '30',
    fees: [
      { currency: 'AUD', amount: '1' },
      { currency: 'USD', amount: '2' },
    ],
  };
  mocks.refetch.mockResolvedValue({ isError: false });
});
afterEach(cleanup);
function acknowledge() {
  fireEvent.change(screen.getByLabelText('Audit reason'), {
    target: { value: 'Statement correction' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
}
describe('audited FX revision form', () => {
  it('preserves exact replacement amounts/fees and retry identity after ambiguous failures', async () => {
    mocks.mutate
      .mockRejectedValueOnce(new Error('Response lost'))
      .mockResolvedValueOnce({});
    render(
      <LiveFxRevisionDialog
        accountId='a1'
        operationId='fx1'
        onHide={mocks.hide}
      />
    );
    fireEvent.change(
      screen.getByLabelText('Corrected amount exchanged (before fees)'),
      { target: { value: '40.000000000001' } }
    );
    acknowledge();
    fireEvent.click(
      screen.getByRole('button', { name: 'Correct FX conversion' })
    );
    expect(await screen.findByText('Response lost')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Correct FX conversion' })
    );
    await waitFor(() => expect(mocks.hide).toHaveBeenCalledOnce());
    expect(mocks.mutate.mock.calls[0][0]).toMatchObject({
      accountId: 'a1',
      operationId: 'fx1',
      input: {
        expectedRevisionId: 'fx1',
        expectedAuditNumber: 1,
        expectedSourceFingerprint: mocks.review.sourceFingerprint,
        replacement: {
          fromAmount: '40.000000000001',
          toAmount: '30',
          fees: [
            { currency: 'AUD', amount: '1' },
            { currency: 'USD', amount: '2' },
          ],
        },
      },
    });
    expect(mocks.mutate.mock.calls[0][0].input.idempotencyKey).toBe(
      mocks.mutate.mock.calls[1][0].input.idempotencyKey
    );
  });

  it('requires reason/acknowledgement and submits terminal removal, not a reverse exchange', async () => {
    mocks.mutate.mockResolvedValue({});
    render(
      <LiveFxRevisionDialog
        accountId='a1'
        operationId='fx1'
        onHide={mocks.hide}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Reverse FX conversion (terminal)' })
    );
    expect(mocks.mutate).not.toHaveBeenCalled();
    acknowledge();
    fireEvent.click(
      screen.getByRole('button', { name: 'Reverse FX conversion (terminal)' })
    );
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledOnce());
    expect(mocks.mutate.mock.calls[0][0].input.replacement).toBeNull();
  });

  it.each(['offline', 'privacy', 'pending', 'fetching', 'error', 'terminal'])(
    'blocks %s revisions',
    mode => {
      if (mode === 'offline') mocks.state.online = false;
      if (mode === 'privacy') mocks.state.hidden = true;
      if (mode === 'pending') mocks.state.pending = true;
      if (mode === 'fetching') mocks.state.fetching = true;
      if (mode === 'error') mocks.state.error = new Error('Source changed');
      if (mode === 'terminal') mocks.review.current = null;
      render(
        <LiveFxRevisionDialog
          accountId='a1'
          operationId='fx1'
          onHide={mocks.hide}
        />
      );
      const button = screen.queryByRole('button', {
        name: 'Correct FX conversion',
      });
      if (button) expect(button).toBeDisabled();
      if (mode === 'privacy')
        expect(
          screen.queryByLabelText('Corrected amount exchanged (before fees)')
        ).not.toBeInTheDocument();
      expect(mocks.mutate).not.toHaveBeenCalled();
    }
  );

  it('blocks conflicts until explicit refresh and resets fields/reason/acknowledgement for refreshed heads', async () => {
    mocks.mutate.mockRejectedValueOnce(
      Object.assign(new Error('Stale audit'), {
        isAxiosError: true,
        response: { status: 409 },
      })
    );
    const dialog = () => (
      <LiveFxRevisionDialog
        accountId='a1'
        operationId='fx1'
        onHide={mocks.hide}
      />
    );
    const { rerender } = render(dialog());
    acknowledge();
    fireEvent.click(
      screen.getByRole('button', { name: 'Correct FX conversion' })
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Correct FX conversion' })
      ).toBeDisabled()
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh FX review head' })
    );
    await waitFor(() => expect(mocks.refetch).toHaveBeenCalledOnce());
    mocks.review.expectedRevisionId = 'r2';
    mocks.review.auditNumber = 3;
    mocks.review.current = {
      effectiveDate: '2026-11-13',
      sequence: 2,
      fromAmount: '35',
      toAmount: '22',
      fees: [],
    };
    rerender(dialog());
    expect(
      screen.getByLabelText('Corrected amount exchanged (before fees)')
    ).toHaveValue('35');
    expect(screen.getByLabelText('Audit reason')).toHaveValue('');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
});
