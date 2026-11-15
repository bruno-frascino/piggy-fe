import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPositionsApi } from './positions';

const response = {
  success: true,
  data: {
    operationId: 'op1',
    transactionId: 'tx1',
    created: true,
    replay: { funded: true, balances: [], activity: [], fundingIssues: [] },
  },
};
const client = axios.create();
const post = vi.spyOn(client, 'post');
const api = createPositionsApi(client);

beforeEach(() => {
  vi.clearAllMocks();
  post.mockImplementation(async () => ({ data: response }) as never);
});

describe('account trade API', () => {
  it('reviews and revises both reinvestment heads using encoded operation IDs', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValueOnce({
      data: { success: true, data: { incomeOperationId: 'income/1' } },
    });
    expect(
      await api.getLiveReinvestmentReview('account/1', 'income/1')
    ).toEqual({ incomeOperationId: 'income/1' });
    expect(get).toHaveBeenCalledWith(
      '/accounts/account%2F1/reinvestments/income%2F1/corrections'
    );
    const input = {
      idempotencyKey: 'rev',
      expectedIncomeRevisionId: 'i1',
      expectedAcquisitionRevisionId: 'b1',
      expectedAuditNumber: 2,
      expectedSourceFingerprint: 'a'.repeat(64),
      reason: 'Issuer cancelled',
      replacement: null,
    };
    await api.correctLiveReinvestment('account/1', 'income/1', input);
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/reinvestments/income%2F1/corrections',
      input
    );
  });
  it('posts the exact linked reinvestment to an encoded account and unwraps its result', async () => {
    const input = {
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
        effectiveDate: '2026-10-15',
        sequence: 2,
        quantity: '4',
        price: '20',
        fees: '1',
      },
      residualAmount: '4',
      residualDisposition: 'ACCOUNT_CASH' as const,
      statementConfirmed: true as const,
    };
    const result = {
      incomeOperationId: 'i1',
      acquisitionOperationId: 'b1',
      positionId: 'p1',
      created: true,
      replay: response.data.replay,
    };
    post.mockResolvedValueOnce({ data: { success: true, data: result } });
    expect(await api.postAccountReinvestment('account/1', input)).toEqual(
      result
    );
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/reinvestments',
      input
    );
  });
  it('reviews and revises FX by encoded operation ID while preserving exact replacement and review heads', async () => {
    const review = { operationId: 'fx/1', current: null };
    const get = vi
      .spyOn(client, 'get')
      .mockResolvedValueOnce({ data: { success: true, data: review } });
    expect(await api.getLiveFxConversionReview('account/1', 'fx/1')).toEqual(
      review
    );
    expect(get).toHaveBeenCalledWith(
      '/accounts/account%2F1/fx-conversions/fx%2F1/corrections'
    );
    const input = {
      idempotencyKey: 'fx-reverse',
      expectedRevisionId: 'r1',
      expectedAuditNumber: 4,
      expectedSourceFingerprint: 'a'.repeat(64),
      reason: 'Duplicate exchange',
      replacement: null,
    };
    expect(
      await api.correctLiveFxConversion('account/1', 'fx/1', input)
    ).toEqual(response.data);
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/fx-conversions/fx%2F1/corrections',
      input
    );
  });
  it('posts explicit FX amounts and fees to the encoded account endpoint without deriving a rate', async () => {
    const input = {
      idempotencyKey: 'fx1',
      effectiveDate: '2026-11-12',
      sequence: 2,
      from: { currency: 'AUD', amount: '1500.000000000001' },
      to: { currency: 'USD', amount: '975' },
      fees: [{ currency: 'USD', amount: '2' }],
      sourceReference: 'fx-statement',
    };
    expect(await api.postAccountFxConversion('account/1', input)).toEqual(
      response.data
    );
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/fx-conversions',
      input
    );
  });
  it('reads paired review and posts corrections using encoded account and operation IDs', async () => {
    const review = { sourceAccountId: 'a1', current: null };
    const get = vi
      .spyOn(client, 'get')
      .mockResolvedValueOnce({ data: { success: true, data: review } });
    expect(await api.getLiveCashTransferReview('account/1', 'out/1')).toEqual(
      review
    );
    expect(get).toHaveBeenCalledWith(
      '/accounts/account%2F1/cash-transfers/out%2F1/corrections'
    );
    const input = {
      idempotencyKey: 'fix',
      reason: 'Duplicate transfer',
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
      replacement: null,
    };
    await api.correctLiveCashTransfer('account/1', 'out/1', input);
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/cash-transfers/out%2F1/corrections',
      input
    );
  });

  it('posts exact paired cash transfers to the encoded source account route', async () => {
    const input = {
      toAccountId: 'account/2',
      idempotencyKey: 'transfer-1',
      effectiveDate: '2026-11-13',
      sourceSequence: 1,
      destinationSequence: 2,
      currency: 'AUD',
      amount: '40.000000000001',
      fee: '0.5',
      sourceReference: 'statement-1',
    };
    const result = {
      sourceOperationId: 'out',
      destinationOperationId: 'in',
      created: true,
    };
    post.mockResolvedValueOnce({ data: { success: true, data: result } });
    expect(await api.postAccountCashTransfer('account/1', input)).toEqual(
      result
    );
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/cash-transfers',
      input
    );
    post.mockRejectedValueOnce(new Error('Insufficient recorded cash'));
    await expect(
      api.postAccountCashTransfer('account/1', input)
    ).rejects.toThrow('Insufficient recorded cash');
  });

  it('loads open and closed eligible income assets for the selected account', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'position-1',
            openDate: '2026-01-01T00:00:00.000Z',
            entryPrice: '10',
            quantity: 1,
            buyFees: '0',
            asset: {
              id: 'asset-1',
              symbol: 'ABC',
              name: 'Example Company',
              assetType: 'EQUITY',
              exchange: { code: 'ASX' },
            },
            account: { id: 'account/1', name: 'Main' },
            transactions: [],
          },
        ],
      },
    } as never);
    expect(await api.getIncomeEligibleAssets('account/1')).toMatchObject([
      { assetId: 'asset-1', symbol: 'ABC', assetType: 'EQUITY' },
    ]);
    expect(get).toHaveBeenCalledWith('/positions', {
      params: {
        status: 'OPEN,PARTIAL,CLOSED',
        limit: 100,
        accountId: 'account/1',
      },
    });
  });

  it('posts terminal manual void requests and reads encoded retained audits', async () => {
    const input = {
      idempotencyKey: 'v1',
      expectedRevisionId: 'r1',
      expectedSourceFingerprint: 'a'.repeat(64),
      reason: 'Duplicate',
    };
    expect(
      await api.voidLiveManualTrade('account/1', 'trade/1', input)
    ).toEqual(response.data);
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/trades/trade%2F1/voids',
      input
    );
    const page = { items: [], total: 0, limit: 100, offset: 100 };
    const get = vi
      .spyOn(client, 'get')
      .mockResolvedValueOnce({ data: { success: true, data: page } });
    expect(await api.getLiveManualTradeVoids('account/1', 100)).toEqual(page);
    expect(get).toHaveBeenCalledWith('/accounts/account%2F1/trades/voids', {
      params: { limit: 100, offset: 100 },
    });
    post.mockRejectedValueOnce(new Error('Funding deficit'));
    await expect(api.voidLiveManualTrade('a1', 'tx1', input)).rejects.toThrow(
      'Funding deficit'
    );
  });

  it('posts exact decimal strings to the encoded account trade route', async () => {
    const input = {
      kind: 'BUY' as const,
      assetId: 'asset/1',
      idempotencyKey: 'buy-1',
      effectiveDate: '2026-10-02',
      sequence: 2,
      quantity: '0.125',
      price: '12.345678901234',
      fees: '0.25',
    };
    expect(await api.postAccountTrade('account/1', input)).toEqual(
      response.data
    );
    expect(post).toHaveBeenCalledWith('/accounts/account%2F1/trades', input);
  });

  it('reads the encoded account trade capability for a selected trade date', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          accountId: 'account/1',
          mode: 'LIVE_LEDGER',
          reason: null,
          openingDate: '2026-10-01',
          effectiveDate: '2026-10-02',
          nextSequence: 2,
        },
      },
    } as never);
    expect(
      await api.getAccountTradeCapability('account/1', '2026-10-02')
    ).toMatchObject({ mode: 'LIVE_LEDGER', nextSequence: 2 });
    expect(get).toHaveBeenCalledWith('/accounts/account%2F1/trade-capability', {
      params: { effectiveDate: '2026-10-02' },
    });
  });

  it('posts explicit capital flows without creating a trade', async () => {
    const input = {
      kind: 'DEPOSIT' as const,
      idempotencyKey: 'deposit-1',
      effectiveDate: '2026-10-02',
      sequence: 2,
      currency: 'AUD',
      amount: '100.000000000001',
      sourceReference: 'bank-ref/1',
    };
    expect(await api.postAccountCapitalFlow('account/1', input)).toEqual(
      response.data
    );
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/cash-operations',
      input
    );
  });

  it('posts a manual income receipt to the active ledger endpoint', async () => {
    const input = {
      idempotencyKey: 'income-1',
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
      sourceReference: 'broker-statement',
    };
    expect(await api.postAccountIncomeReceipt('account/1', input)).toEqual(
      response.data
    );
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/income-receipts',
      input
    );
  });

  it('reads live funding audit pages and posts immutable corrections', async () => {
    const page = {
      items: [],
      total: 0,
      limit: 100,
      offset: 100,
      activity: [],
      activityTotal: 0,
      auditOperations: [],
      auditTotal: 0,
      accountStatus: 'ACTIVE',
      ledgerState: 'ACTIVE',
      openingBoundary: {
        date: '2026-10-01',
        timezone: 'Australia/Sydney',
        type: 'END_OF_DAY',
      },
      reviewedAsOfDate: '2026-10-31',
      checkedAt: '2026-11-08T00:00:00.000Z',
      sourceFreshness: {
        status: 'CURRENT',
        acceptedFingerprint: 'a'.repeat(64),
        currentFingerprint: 'a'.repeat(64),
      },
      cashCompleteness: 'COMPLETE',
      unsupportedEvents: [],
      sourceReviewIssues: [],
      evidence: [],
      evidenceStatus: 'NO_ATTESTATION',
      auditNumber: 3,
      sourceFingerprint: 'a'.repeat(64),
      replay: { funded: true, balances: [], activity: [], fundingIssues: [] },
    };
    const get = vi
      .spyOn(client, 'get')
      .mockResolvedValueOnce({ data: { success: true, data: page } });
    expect(await api.getLiveCapitalOperations('account/1', 100)).toEqual(page);
    expect(get).toHaveBeenCalledWith('/accounts/account%2F1/cash-operations', {
      params: { limit: 100, offset: 100 },
    });
    const input = {
      idempotencyKey: 'capital-fix-1',
      expectedRevisionId: 'operation/1',
      expectedAuditNumber: 3,
      expectedSourceFingerprint: 'a'.repeat(64),
      reason: 'Correct bank statement',
      replacement: {
        effectiveDate: '2026-10-03',
        sequence: 2,
        amount: '90.25',
      },
    };
    expect(
      await api.correctLiveCapitalOperation('account/1', 'operation/1', input)
    ).toEqual(response.data);
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/cash-operations/operation%2F1/corrections',
      input
    );
  });

  it('posts an audited income replacement or terminal reversal', async () => {
    const input = {
      idempotencyKey: 'income-fix-1',
      expectedRevisionId: 'income-operation',
      expectedAuditNumber: 3,
      expectedSourceFingerprint: 'a'.repeat(64),
      reason: 'Correct issuer withholding',
      replacement: {
        entitlementDate: '2026-10-01',
        paymentDate: '2026-10-16',
        sequence: 2,
        grossAmount: '100',
        withholdingAmount: '20',
        frankedAmount: '60',
        unfrankedAmount: '40',
        frankingCreditAud: '25',
      },
    };
    expect(
      await api.correctLiveIncomeReceipt('account/1', 'operation/1', input)
    ).toEqual(response.data);
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/income-receipts/operation%2F1/corrections',
      input
    );
    post.mockResolvedValueOnce(response);
    await api.correctLiveIncomeReceipt('account/1', 'operation/1', {
      ...input,
      replacement: null,
    });
  });

  it('posts the audited live sale correction without losing exact values', async () => {
    const input = {
      idempotencyKey: 'correction-1',
      expectedRevisionId: 'revision/1',
      expectedSourceFingerprint: 'a'.repeat(64),
      reason: 'Broker statement correction',
      effectiveDate: '2026-10-03',
      sequence: 3,
      price: '12.345678901234',
      fees: '0.00000001',
    };
    expect(
      await api.correctLiveManualSale('account/1', 'transaction/1', input)
    ).toEqual(response.data);
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/trades/transaction%2F1/corrections',
      input
    );
  });

  it('posts exact total bought quantity to the encoded live acquisition correction route', async () => {
    const input = {
      idempotencyKey: 'correction-1',
      expectedRevisionId: 'revision/1',
      expectedSourceFingerprint: 'a'.repeat(64),
      reason: 'Broker purchase correction',
      effectiveDate: '2026-10-03',
      sequence: 3,
      quantity: '2.000000000001',
      price: '12.345678901234',
      fees: '0.00000001',
    };
    expect(
      await api.correctLiveManualAcquisition(
        'account/1',
        'transaction/1',
        input
      )
    ).toEqual(response.data);
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/trades/transaction%2F1/acquisition-corrections',
      input
    );
    post.mockRejectedValueOnce(new Error('Funding deficit'));
    await expect(
      api.correctLiveManualAcquisition('a1', 'tx1', input)
    ).rejects.toThrow('Funding deficit');
  });

  it('posts an audited imported-execution overlay with unchanged quantity and allocations', async () => {
    const input = {
      idempotencyKey: 'import-fix-1',
      expectedRevisionId: 'revision/1',
      expectedSourceFingerprint: 'a'.repeat(64),
      reason: 'Corrected from broker statement',
      effectiveDate: '2026-10-03',
      sequence: 4,
      price: '12.345678901234',
      fees: '0.00000001',
    };
    expect(
      await api.correctLiveImportedExecution('account/1', 'event/1', input)
    ).toEqual(response.data);
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/imported-executions/event%2F1/corrections',
      input
    );
  });
});
