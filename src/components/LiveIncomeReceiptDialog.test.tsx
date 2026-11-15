// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { holdings, cashHistory, incomeCorrection } = vi.hoisted(() => ({
  holdings: {
    data: [
      {
        assetId: 'asset-1',
        assetType: 'EQUITY',
        symbol: 'ABC',
        name: 'Example Company',
        exchangeCode: 'ASX',
      },
    ],
    isLoading: false,
    error: null,
  },
  cashHistory: {
    data: {
      auditOperations: [
        {
          operationId: 'income-op-1',
          auditNumber: 3,
          expectedRevisionId: 'income-op-1',
          original: {
            effectiveDate: '2026-10-15',
            sequence: 1,
            kind: 'INCOME',
            source: { origin: 'MANUAL', reference: 'statement-october' },
          },
          current: {
            effectiveDate: '2026-10-15',
            sequence: 1,
            kind: 'INCOME',
            cash: { currency: 'AUD', amount: '85' },
            income: {
              assetId: 'asset-1',
              entitlementDate: '2026-10-01',
              grossAmount: '100',
              withholdingAmount: '15',
              frankedAmount: '60',
              unfrankedAmount: '40',
              frankingCreditAud: '25',
            },
          },
          incomeReceipt: {
            assetId: 'asset-1',
            assetSymbol: 'ABC',
            entitlementDate: '2026-10-01',
            paymentDate: '2026-10-15',
            currency: 'AUD',
            grossAmount: '100',
            withholdingAmount: '15',
            netAmount: '85',
            frankedAmount: '60',
            unfrankedAmount: '40',
            frankingCreditAud: '25',
          },
          currentIncomeReceipt: {
            assetId: 'asset-1',
            assetSymbol: 'ABC',
            entitlementDate: '2026-10-01',
            paymentDate: '2026-10-15',
            currency: 'AUD',
            grossAmount: '100',
            withholdingAmount: '15',
            netAmount: '85',
            frankedAmount: '60',
            unfrankedAmount: '40',
            frankingCreditAud: '25',
          },
          revisions: [],
        },
      ],
      auditNumber: 3,
      sourceFingerprint: 'a'.repeat(64),
    },
    error: null,
    refetch: vi.fn(),
  },
  incomeCorrection: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
}));

vi.mock('@/hooks/api', () => ({
  useIncomeEligibleAssets: () => holdings,
  useLiveCapitalOperations: () => cashHistory,
  useCorrectLiveIncomeReceipt: () => incomeCorrection,
  usePostAccountIncomeReceipt: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => true,
}));

vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({
    mask: (value: string) => value,
  }),
}));

import LiveIncomeReceiptDialog from './LiveIncomeReceiptDialog';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LiveIncomeReceiptDialog', () => {
  it('explains the manual-entry boundary and displays retained income attributes', () => {
    render(
      <LiveIncomeReceiptDialog
        accountId='account-1'
        accountName='Everyday'
        onHide={vi.fn()}
      />
    );

    expect(
      screen.getByText(/actual dividend\/distribution statement/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/does not estimate entitlement/)
    ).toBeInTheDocument();
    expect(screen.getByText(/ABC · payment 15\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/Gross amount|Gross income/)).toBeInTheDocument();
    expect(
      screen.getByText(/Franked 60 · unfranked 40 · franking credit AUD 25/)
    ).toBeInTheDocument();
  });

  it('requires an audit reason and explicit acknowledgement for terminal reversal', async () => {
    incomeCorrection.mutateAsync.mockResolvedValue({
      replay: { balances: [{ currency: 'AUD', endingAmount: '100' }] },
    });
    render(
      <LiveIncomeReceiptDialog
        accountId='account-1'
        accountName='Everyday'
        onHide={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Correct or reverse' }));
    fireEvent.change(screen.getByLabelText('Audit reason'), {
      target: { value: 'Issuer confirmed duplicate payment' },
    });
    const reverse = screen.getByRole('button', { name: 'Reverse receipt' });
    expect(reverse).toBeDisabled();
    fireEvent.click(
      screen.getByLabelText('I understand reversal is terminal.')
    );
    fireEvent.click(reverse);

    await vi.waitFor(() =>
      expect(incomeCorrection.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'account-1',
          operationId: 'income-op-1',
          input: expect.objectContaining({
            expectedRevisionId: 'income-op-1',
            expectedAuditNumber: 3,
            expectedSourceFingerprint: 'a'.repeat(64),
            reason: 'Issuer confirmed duplicate payment',
            replacement: null,
          }),
        })
      )
    );
  });
});
