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

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  refresh: vi.fn(),
  hide: vi.fn(),
  toast: vi.fn(),
  state: {
    online: true,
    hidden: false,
    pending: false,
    fetching: false,
    error: false,
    sales: false,
  },
  review: {
    accountId: 'a1',
    incomeOperationId: 'i1',
    acquisitionOperationId: 'b1',
    positionId: 'p1',
    expectedIncomeRevisionId: 'i1',
    expectedAcquisitionRevisionId: 'b1',
    expectedAuditNumber: 2,
    expectedSourceFingerprint: 'a'.repeat(64),
    hasEffectiveSales: false,
    current: {
      income: {
        assetId: 'asset-1',
        entitlementDate: '2026-10-01',
        paymentDate: '2026-10-15',
        sequence: 1,
        currency: 'AUD',
        grossAmount: '100',
        withholdingAmount: '15',
        frankedAmount: '60',
        unfrankedAmount: '40',
        frankingCreditAud: '25',
        sourceReference: 'statement-1',
      },
      acquisition: {
        effectiveDate: '2026-10-15',
        sequence: 2,
        quantity: '4',
        price: '20',
        fees: '1',
      },
      residualAmount: '4',
      residualDisposition: 'ACCOUNT_CASH' as const,
      statementConfirmed: true as const,
    } as null | {
      income: {
        assetId: string;
        entitlementDate: string;
        paymentDate: string;
        sequence: number;
        currency: string;
        grossAmount: string;
        withholdingAmount: string;
        frankedAmount: string;
        unfrankedAmount: string;
        frankingCreditAud: string;
        sourceReference: string;
      };
      acquisition: {
        effectiveDate: string;
        sequence: number;
        quantity: string;
        price: string;
        fees: string;
      };
      residualAmount: string;
      residualDisposition: 'ACCOUNT_CASH';
      statementConfirmed: true;
    },
  },
}));
vi.mock('@/hooks/api', () => ({
  useLiveReinvestmentReview: () => ({
    data: { ...mocks.review, hasEffectiveSales: mocks.state.sales },
    isFetching: mocks.state.fetching,
    isError: mocks.state.error,
    refetch: mocks.refresh,
  }),
  useCorrectLiveReinvestment: () => ({
    mutateAsync: mocks.mutate,
    isPending: mocks.state.pending,
  }),
  usePostAccountReinvestment: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useIncomeEligibleAssets: () => ({
    data: [],
    isFetching: false,
    isError: false,
    refetch: mocks.refresh,
  }),
  useAccountTradeCapability: () => ({
    data: { mode: 'LIVE_LEDGER' },
    isFetching: false,
    isError: false,
    refetch: mocks.refresh,
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
  default: ({
    children,
    footer,
  }: {
    children: ReactNode;
    footer?: ReactNode;
  }) => (
    <div>
      {children}
      {footer}
    </div>
  ),
}));
vi.mock('primereact/dropdown', () => ({
  Dropdown: ({
    inputId,
    value,
    disabled,
  }: {
    inputId: string;
    value: string;
    disabled: boolean;
  }) => <input id={inputId} value={value} disabled={disabled} readOnly />,
}));
import LiveReinvestmentRevisionDialog from './LiveReinvestmentRevisionDialog';
const original = structuredClone(mocks.review.current);
beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(mocks.state, {
    online: true,
    hidden: false,
    pending: false,
    fetching: false,
    error: false,
    sales: false,
  });
  mocks.review.current = structuredClone(original);
  mocks.refresh.mockResolvedValue({ isError: false });
});
afterEach(cleanup);
function show() {
  return render(
    <LiveReinvestmentRevisionDialog
      accountId='a1'
      accountName='Main'
      operationId='i1'
      onHide={mocks.hide}
    />
  );
}
function acknowledge() {
  fireEvent.change(screen.getByLabelText('Audit reason'), {
    target: { value: 'Correct issuer statement' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
}
describe('paired reinvestment revision review', () => {
  it('submits both heads and retains exact retry identity on an ambiguous error', async () => {
    mocks.mutate
      .mockRejectedValueOnce(new Error('Response lost'))
      .mockResolvedValueOnce({});
    show();
    acknowledge();
    fireEvent.change(screen.getByLabelText('Acquisition fees'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Residual paid to account cash'), {
      target: { value: '3' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Save paired correction' })
    );
    expect(await screen.findByText('Response lost')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Save paired correction' })
    );
    await waitFor(() => expect(mocks.hide).toHaveBeenCalledOnce());
    expect(mocks.mutate.mock.calls[0][0]).toMatchObject({
      accountId: 'a1',
      operationId: 'i1',
      input: {
        expectedIncomeRevisionId: 'i1',
        expectedAcquisitionRevisionId: 'b1',
        expectedAuditNumber: 2,
        expectedSourceFingerprint: 'a'.repeat(64),
        reason: 'Correct issuer statement',
        replacement: { acquisition: { fees: '2' }, residualAmount: '3' },
      },
    });
    expect(mocks.mutate.mock.calls[0][0].input.idempotencyKey).toBe(
      mocks.mutate.mock.calls[1][0].input.idempotencyKey
    );
    expect(screen.getByLabelText('Statement currency')).toBeDisabled();
    expect(screen.getByLabelText('Statement reference')).toBeDisabled();
  });
  it('requires reason and acknowledgement for terminal paired reversal', async () => {
    mocks.mutate.mockResolvedValueOnce({});
    show();
    expect(
      screen.getByRole('button', { name: 'Reverse both effects permanently' })
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Reverse both effects permanently' })
    );
    expect(screen.getByText(/Enter an audit reason/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Audit reason'), {
      target: { value: 'Issuer cancelled' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Reverse both effects permanently' })
    );
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledOnce());
    expect(mocks.mutate.mock.calls[0][0].input.replacement).toBeNull();
  });
  it.each(['offline', 'privacy', 'pending', 'fetching', 'error', 'sales'])(
    'blocks %s',
    mode => {
      if (mode === 'offline') mocks.state.online = false;
      if (mode === 'privacy') mocks.state.hidden = true;
      if (mode === 'pending') mocks.state.pending = true;
      if (mode === 'fetching') mocks.state.fetching = true;
      if (mode === 'error') mocks.state.error = true;
      if (mode === 'sales') mocks.state.sales = true;
      show();
      expect(
        screen.getByRole('button', { name: 'Save paired correction' })
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Reverse both effects permanently' })
      ).toBeDisabled();
    }
  );
  it('shows terminal history without edit controls', () => {
    mocks.review.current = null;
    show();
    expect(screen.getByText(/terminally reversed/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save paired correction' })
    ).not.toBeInTheDocument();
  });
  it('blocks a stale-head conflict until an explicit successful refresh resets the form', async () => {
    mocks.mutate.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'Stale review',
      response: { status: 409, data: { message: 'Stale review' } },
    });
    show();
    acknowledge();
    fireEvent.click(
      screen.getByRole('button', { name: 'Reverse both effects permanently' })
    );
    expect(await screen.findByText('Stale review')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reverse both effects permanently' })
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh eligibility' })
    );
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(screen.getByLabelText('Audit reason')).toHaveValue('')
    );
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
});
