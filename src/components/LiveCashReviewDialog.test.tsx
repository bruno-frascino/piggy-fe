// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  LiveCashCommandSummary,
  LiveCashReviewOperation,
} from '@/lib/types';

const { queryState, networkState, privacyState } = vi.hoisted(() => ({
  privacyState: { hidden: false },
  queryState: {
    data: {
      items: [],
      total: 0,
      limit: 100,
      offset: 0,
      activity: [
        {
          idempotencyKey: 'deposit-1',
          effectiveDate: '2026-10-02',
          sequence: 1,
          kind: 'DEPOSIT',
          changes: [{ currency: 'AUD', amount: '100', balanceAfter: '100' }],
          operationId: 'operation-1',
          auditNumber: 1,
          recordedAt: '2026-10-02T00:00:00.000Z',
          sourceOrigin: 'MANUAL' as const,
          sourceReference: 'statement-1',
        },
      ],
      activityTotal: 1,
      auditOperations: [
        {
          operationId: 'operation-1',
          auditNumber: 1,
          recordedAt: '2026-10-02T00:00:00.000Z',
          transactionId: null,
          importedEventId: null,
          reinvestment: null as LiveCashReviewOperation['reinvestment'],
          original: {
            effectiveDate: '2026-10-02',
            sequence: 1,
            kind: 'DEPOSIT',
            source: { origin: 'MANUAL' as const, reference: 'statement-1' },
            cash: { currency: 'AUD', amount: '100' },
          },
          current: null as LiveCashCommandSummary | null,
          revisions: [
            {
              revisionId: 'revision-1',
              revisionNumber: 1,
              auditNumber: 2,
              reason: 'Corrected from statement',
              recordedAt: '2026-10-03T00:00:00.000Z',
              replacement: null,
              postings: [
                {
                  phase: 'REVERSAL' as const,
                  currency: 'AUD',
                  amount: '-100',
                  role: 'EXTERNAL_CAPITAL',
                },
              ],
            },
          ],
        },
      ],
      auditTotal: 1,
      accountStatus: 'CLOSED' as 'ACTIVE' | 'CLOSED',
      ledgerState: 'ACTIVE',
      openingBoundary: {
        date: '2026-10-01',
        timezone: 'Australia/Sydney' as const,
        type: 'END_OF_DAY' as const,
      },
      reviewedAsOfDate: '2026-10-31',
      checkedAt: '2026-11-08T09:00:00.000Z',
      sourceFreshness: {
        status: 'STALE' as 'CURRENT' | 'STALE' | 'NOT_REVALIDATED',
        acceptedFingerprint: 'a'.repeat(64),
        currentFingerprint: 'b'.repeat(64),
      },
      cashCompleteness: 'INCOMPLETE' as const,
      unsupportedEvents: [
        {
          code: 'UNLINKED_POST_OPENING_TRADE',
          sourceId: 'trade-1',
          effectiveDate: '2026-10-04',
        },
      ],
      sourceReviewIssues: [],
      evidence: [
        {
          id: 'evidence-1',
          asOfDate: '2026-10-10',
          source: 'Broker statement',
          reference: 'Page 1',
          attested: true,
          recordedAt: '2026-10-10T00:00:00.000Z',
          statementBalances: [{ currency: 'AUD', amount: '90' }],
          decisions: [],
          currentComparison: {
            matchesReplay: false,
            variances: [
              {
                currency: 'AUD',
                expectedAmount: '100',
                statementAmount: '90',
                difference: '-10',
              },
            ],
            decisions: [],
          },
        },
      ],
      evidenceStatus: 'VARIANCE' as const,
      auditNumber: 2,
      sourceFingerprint: 'a'.repeat(64),
      replay: {
        accountId: 'account-1',
        openingDate: '2026-10-01',
        funded: true,
        balances: [
          {
            currency: 'AUD',
            openingAmount: '0',
            endingAmount: '100',
            minimumAmount: '0',
            netExternalContribution: '100',
          },
        ],
        activity: [],
        fundingIssues: [],
      },
    },
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  },
  networkState: { online: false },
}));

vi.mock('@/hooks/api', () => ({
  useLiveCapitalOperations: () => queryState,
}));

vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => networkState.online,
}));

vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({
    hidden: privacyState.hidden,
    mask: (value: string) => (privacyState.hidden ? 'hidden' : value),
  }),
}));

vi.mock('./AppDialog', () => ({
  default: ({
    children,
    header,
  }: {
    children: React.ReactNode;
    header: string;
  }) => (
    <div role='dialog' aria-label={header}>
      {children}
    </div>
  ),
}));

vi.mock('./LiveCashTransferRevisionDialog', () => ({
  default: ({
    accountId,
    operationId,
  }: {
    accountId: string;
    operationId: string;
  }) => (
    <div data-testid='paired-transfer-form'>
      {accountId}:{operationId}
    </div>
  ),
}));

import LiveCashReviewDialog from './LiveCashReviewDialog';

vi.mock('./LiveFxRevisionDialog', () => ({
  default: ({
    accountId,
    operationId,
  }: {
    accountId: string;
    operationId: string;
  }) => (
    <div data-testid='fx-revision-form'>
      {accountId}:{operationId}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  privacyState.hidden = false;
});

describe('LiveCashReviewDialog', () => {
  it('shows linked parcel provenance and masks reinvestment amounts in privacy mode', () => {
    const operation = queryState.data.auditOperations[0];
    operation.reinvestment = {
      incomeOperationId: 'income-1',
      acquisitionOperationId: 'buy-1',
      positionId: 'parcel-1',
      request: {
        idempotencyKey: 'drp-1',
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
          effectiveDate: '2026-10-16',
          sequence: 2,
          quantity: '4.125',
          price: '20',
          fees: '1',
        },
        residualAmount: '1.50',
        residualDisposition: 'ACCOUNT_CASH',
        statementConfirmed: true,
      },
    };
    try {
      const { rerender } = render(
        <LiveCashReviewDialog
          accountId='account-1'
          accountName='Main'
          onHide={vi.fn()}
        />
      );
      expect(screen.getByText(/new parcel parcel-1/)).toHaveTextContent(
        'Original acquisition 16/10/2026: 4.125 units; account-cash residual 1.50 AUD'
      );
      privacyState.hidden = true;
      rerender(
        <LiveCashReviewDialog
          accountId='account-1'
          accountName='Main'
          onHide={vi.fn()}
        />
      );
      expect(screen.getByText(/new parcel parcel-1/)).not.toHaveTextContent(
        '4.125'
      );
      expect(screen.getByText(/new parcel parcel-1/)).not.toHaveTextContent(
        '1.50'
      );
    } finally {
      operation.reinvestment = null;
    }
  });
  it('opens the FX revision by operation ID only for an effective, active and fresh online review', () => {
    const operation = queryState.data.auditOperations[0];
    const originalOperation = { ...operation };
    const fx = Object.assign({}, operation.original, {
      kind: 'FX_CONVERSION',
      from: { currency: 'AUD', amount: '50' },
      to: { currency: 'USD', amount: '30' },
      fees: [],
    });
    operation.original = fx;
    operation.current = fx;
    queryState.data.accountStatus = 'ACTIVE';
    queryState.data.sourceFreshness.status = 'CURRENT';
    networkState.online = true;
    const dialog = () => (
      <LiveCashReviewDialog
        accountId='account-1'
        accountName='Main'
        onHide={vi.fn()}
      />
    );
    try {
      const { rerender } = render(dialog());
      const action = () =>
        screen.getByRole('button', {
          name: 'Correct or reverse FX conversion',
        });
      expect(action()).toBeEnabled();
      queryState.data.sourceFreshness.status = 'STALE';
      rerender(dialog());
      expect(action()).toBeDisabled();
      queryState.data.sourceFreshness.status = 'CURRENT';
      privacyState.hidden = true;
      rerender(dialog());
      expect(action()).toBeDisabled();
      privacyState.hidden = false;
      rerender(dialog());
      fireEvent.click(action());
      expect(screen.getByTestId('fx-revision-form')).toHaveTextContent(
        'account-1:operation-1'
      );
      operation.current = null;
      rerender(dialog());
      expect(
        screen.queryByRole('button', {
          name: 'Correct or reverse FX conversion',
        })
      ).not.toBeInTheDocument();
    } finally {
      Object.assign(operation, originalOperation);
      queryState.data.accountStatus = 'CLOSED';
      queryState.data.sourceFreshness.status = 'STALE';
      networkState.online = false;
    }
  });
  it('shows both exchanged amounts and explicit FX fees without exposing amounts in privacy mode', () => {
    const operation = queryState.data.auditOperations[0];
    const original = operation.original;
    operation.original = Object.assign({}, original, {
      kind: 'FX_CONVERSION',
      from: { currency: 'AUD', amount: '1500' },
      to: { currency: 'USD', amount: '975' },
      fees: [
        { currency: 'AUD', amount: '5' },
        { currency: 'USD', amount: '2' },
      ],
    });
    try {
      const dialog = () => (
        <LiveCashReviewDialog
          accountId='account-1'
          accountName='Main'
          onHide={vi.fn()}
        />
      );
      const { rerender } = render(dialog());
      expect(
        screen.getByText(/AUD 1500 -> USD 975 · explicit fees AUD 5, USD 2/)
      ).toBeInTheDocument();
      privacyState.hidden = true;
      rerender(dialog());
      expect(screen.queryByText(/AUD 1500 -> USD 975/)).not.toBeInTheDocument();
      expect(
        screen.getByText(
          /AUD hidden -> USD hidden · explicit fees AUD hidden, USD hidden/
        )
      ).toBeInTheDocument();
    } finally {
      operation.original = original;
    }
  });
  it('opens paired management from an effective sender transfer only when the review is eligible', () => {
    const operation = queryState.data.auditOperations[0];
    const originalOperation = { ...operation };
    const transfer = {
      ...operation.original,
      kind: 'TRANSFER_OUT',
      fee: '1',
      transfer: { fromAccountId: 'account-1', toAccountId: 'account-2' },
    };
    operation.original = transfer;
    operation.current = transfer;
    operation.revisions = [];
    queryState.data.accountStatus = 'ACTIVE';
    queryState.data.sourceFreshness.status = 'CURRENT';
    networkState.online = true;
    const dialog = () => (
      <LiveCashReviewDialog
        accountId='account-1'
        accountName='Main'
        onHide={vi.fn()}
      />
    );
    try {
      const { rerender } = render(dialog());
      const action = () =>
        screen.getByRole('button', {
          name: 'Correct or reverse paired transfer',
        });
      expect(action()).toBeEnabled();
      networkState.online = false;
      rerender(dialog());
      expect(action()).toBeDisabled();
      networkState.online = true;
      privacyState.hidden = true;
      rerender(dialog());
      expect(action()).toBeDisabled();
      privacyState.hidden = false;
      queryState.data.sourceFreshness.status = 'STALE';
      rerender(dialog());
      expect(action()).toBeDisabled();
      queryState.data.sourceFreshness.status = 'CURRENT';
      queryState.data.accountStatus = 'CLOSED';
      rerender(dialog());
      expect(action()).toBeDisabled();
      queryState.data.accountStatus = 'ACTIVE';
      rerender(dialog());
      fireEvent.click(action());
      expect(screen.getByTestId('paired-transfer-form')).toHaveTextContent(
        'account-1:operation-1'
      );
      operation.current = null;
      rerender(dialog());
      expect(
        screen.queryByRole('button', {
          name: 'Correct or reverse paired transfer',
        })
      ).not.toBeInTheDocument();
    } finally {
      Object.assign(operation, originalOperation);
      queryState.data.accountStatus = 'CLOSED';
      queryState.data.sourceFreshness.status = 'STALE';
      networkState.online = false;
    }
  });

  it('retains the paired transfer endpoints and fee while respecting privacy mode', () => {
    const operation = queryState.data.auditOperations[0];
    const original = operation.original;
    operation.original = Object.assign({}, original, {
      kind: 'TRANSFER_OUT',
      fee: '0.5',
      transfer: { fromAccountId: 'source', toAccountId: 'destination' },
    });
    try {
      const { rerender } = render(
        <LiveCashReviewDialog
          accountId='account-1'
          accountName='Main'
          onHide={vi.fn()}
        />
      );
      expect(screen.getByText(/source -> destination/)).toBeInTheDocument();
      expect(screen.getByText(/fee charged here 0\.5/)).toBeInTheDocument();
      privacyState.hidden = true;
      rerender(
        <LiveCashReviewDialog
          accountId='account-1'
          accountName='Main'
          onHide={vi.fn()}
        />
      );
      expect(screen.getByText(/fee charged here hidden/)).toBeInTheDocument();
      expect(
        screen.queryByText(/fee charged here 0\.5/)
      ).not.toBeInTheDocument();
    } finally {
      operation.original = original;
    }
  });

  it('shows archived cached replay, staleness, unsupported events and attested variances', () => {
    render(
      <LiveCashReviewDialog
        accountId='account-1'
        accountName='Archived account'
        onHide={vi.fn()}
      />
    );

    expect(
      screen.getByText('Archived account · read-only')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Offline: showing cached last-successful cash review/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Source history has changed/)).toBeInTheDocument();
    expect(screen.getByText(/UNLINKED_POST_OPENING_TRADE/)).toBeInTheDocument();
    expect(screen.getByText(/current replay 100/)).toBeInTheDocument();
    expect(screen.getByText(/Statement AUD 90/)).toBeInTheDocument();
    expect(screen.getByText(/variance -10/)).toBeInTheDocument();
    expect(
      screen.getByText(/user-attested and is not broker verification/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Corrected from statement/)).toBeInTheDocument();
  });
});
