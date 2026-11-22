// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  updatePositionMock,
  updateCloseEventMock,
  recalculateDrawdownMock,
  checkStopLossMock,
  reviewSplitStopLossMock,
  searchStocksMock,
  logoutMock,
  downloadTaxReportPdfMock,
  getClosedPositionsMock,
  getRealizedPnLMock,
  commitImportMock,
  resolveImportEventMock,
  searchKrakenAssetsMock,
  getExchangesMock,
  deleteAccountMock,
  stageImportedExecutionCashMock,
  stageManualExecutionCashMock,
  correctDraftCashMock,
  correctImportedCashMock,
  correctRecordedSaleMock,
  correctRecordedAcquisitionMock,
  postAccountTradeMock,
  getAccountTradeCapabilityMock,
  postAccountCapitalFlowMock,
  postAccountFxConversionMock,
  fxReviewMock,
  correctFxMock,
  postAccountCashTransferMock,
  transferReviewMock,
  correctTransferMock,
  postAccountIncomeReceiptMock,
  postReinvestmentMock,
  reinvestmentReviewMock,
  correctReinvestmentMock,
  correctLiveIncomeMock,
  getIncomeEligibleAssetsMock,
  correctLiveCapitalMock,
  getLiveCapitalMock,
  correctLiveAcquisitionMock,
  correctLiveImportedMock,
  voidTradeMock,
  readVoidsMock,
  confirmOpeningStatementMock,
} = vi.hoisted(() => ({
  updatePositionMock: vi.fn(),
  updateCloseEventMock: vi.fn(),
  recalculateDrawdownMock: vi.fn(),
  checkStopLossMock: vi.fn(),
  reviewSplitStopLossMock: vi.fn(),
  searchStocksMock: vi.fn(),
  logoutMock: vi.fn(),
  downloadTaxReportPdfMock: vi.fn(),
  getClosedPositionsMock: vi.fn(),
  getRealizedPnLMock: vi.fn(),
  commitImportMock: vi.fn(),
  resolveImportEventMock: vi.fn(),
  searchKrakenAssetsMock: vi.fn(),
  getExchangesMock: vi.fn(),
  deleteAccountMock: vi.fn(),
  stageImportedExecutionCashMock: vi.fn(),
  stageManualExecutionCashMock: vi.fn(),
  correctDraftCashMock: vi.fn(),
  correctImportedCashMock: vi.fn(),
  correctRecordedSaleMock: vi.fn(),
  correctRecordedAcquisitionMock: vi.fn(),
  postAccountTradeMock: vi.fn(),
  getAccountTradeCapabilityMock: vi.fn(),
  postAccountCapitalFlowMock: vi.fn(),
  postAccountFxConversionMock: vi.fn(),
  fxReviewMock: vi.fn(),
  correctFxMock: vi.fn(),
  postAccountCashTransferMock: vi.fn(),
  transferReviewMock: vi.fn(),
  correctTransferMock: vi.fn(),
  postAccountIncomeReceiptMock: vi.fn(),
  postReinvestmentMock: vi.fn(),
  reinvestmentReviewMock: vi.fn(),
  correctReinvestmentMock: vi.fn(),
  correctLiveIncomeMock: vi.fn(),
  getIncomeEligibleAssetsMock: vi.fn(),
  correctLiveCapitalMock: vi.fn(),
  getLiveCapitalMock: vi.fn(),
  correctLiveAcquisitionMock: vi.fn(),
  correctLiveImportedMock: vi.fn(),
  voidTradeMock: vi.fn(),
  readVoidsMock: vi.fn(),
  confirmOpeningStatementMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    updatePosition: updatePositionMock,
    updateCloseEvent: updateCloseEventMock,
    recalculateDrawdown: recalculateDrawdownMock,
    checkStopLoss: checkStopLossMock,
    reviewSplitAffectedStopLoss: reviewSplitStopLossMock,
    searchStocks: searchStocksMock,
    logout: logoutMock,
    downloadTaxReportPdf: downloadTaxReportPdfMock,
    getClosedPositions: getClosedPositionsMock,
    getRealizedPnL: getRealizedPnLMock,
    commitImport: commitImportMock,
    resolveImportEvent: resolveImportEventMock,
    searchKrakenAssets: searchKrakenAssetsMock,
    getExchanges: getExchangesMock,
    deleteAccount: deleteAccountMock,
    stageDraftImportedExecutionCash: stageImportedExecutionCashMock,
    stageDraftManualExecutionCash: stageManualExecutionCashMock,
    correctDraftReconciliationCashOperation: correctDraftCashMock,
    correctDraftImportedExecutionCash: correctImportedCashMock,
    correctDraftRecordedSale: correctRecordedSaleMock,
    correctDraftRecordedAcquisition: correctRecordedAcquisitionMock,
    postAccountTrade: postAccountTradeMock,
    getAccountTradeCapability: getAccountTradeCapabilityMock,
    postAccountCapitalFlow: postAccountCapitalFlowMock,
    postAccountFxConversion: postAccountFxConversionMock,
    getLiveFxConversionReview: fxReviewMock,
    correctLiveFxConversion: correctFxMock,
    postAccountCashTransfer: postAccountCashTransferMock,
    getLiveCashTransferReview: transferReviewMock,
    correctLiveCashTransfer: correctTransferMock,
    postAccountIncomeReceipt: postAccountIncomeReceiptMock,
    postAccountReinvestment: postReinvestmentMock,
    getLiveReinvestmentReview: reinvestmentReviewMock,
    correctLiveReinvestment: correctReinvestmentMock,
    correctLiveIncomeReceipt: correctLiveIncomeMock,
    getIncomeEligibleAssets: getIncomeEligibleAssetsMock,
    correctLiveCapitalOperation: correctLiveCapitalMock,
    getLiveCapitalOperations: getLiveCapitalMock,
    correctLiveManualAcquisition: correctLiveAcquisitionMock,
    correctLiveImportedExecution: correctLiveImportedMock,
    voidLiveManualTrade: voidTradeMock,
    getLiveManualTradeVoids: readVoidsMock,
    confirmOpeningStatement: confirmOpeningStatementMock,
  },
}));

import {
  useCheckStopLoss,
  useReviewSplitStopLoss,
  useCommitImport,
  useResolveImportEvent,
  useClosedPositions,
  useDownloadTaxReportPdf,
  useLogout,
  useRealizedPnL,
  useRecalculateDrawdown,
  useStockSearch,
  useUpdateCloseEvent,
  useUpdatePosition,
  useExchanges,
  useKrakenAssetSearch,
  useDeleteAccount,
  useStageDraftImportedExecutionCash,
  useStageDraftManualExecutionCash,
  useCorrectDraftReconciliationCashOperation,
  useCorrectDraftImportedExecutionCash,
  useCorrectDraftRecordedSale,
  useCorrectDraftRecordedAcquisition,
  usePostAccountTrade,
  useAccountTradeCapability,
  usePostAccountCapitalFlow,
  usePostAccountFxConversion,
  useLiveFxConversionReview,
  useCorrectLiveFxConversion,
  usePostAccountCashTransfer,
  useLiveCashTransferReview,
  useCorrectLiveCashTransfer,
  usePostAccountIncomeReceipt,
  usePostAccountReinvestment,
  useLiveReinvestmentReview,
  useCorrectLiveReinvestment,
  useIncomeEligibleAssets,
  useCorrectLiveCapitalOperation,
  useCorrectLiveIncomeReceipt,
  useLiveCapitalOperations,
  useCorrectLiveManualAcquisition,
  useCorrectLiveImportedExecution,
  useVoidLiveManualTrade,
  useLiveManualTradeVoids,
  useConfirmOpeningStatement,
} from './api';
import { useSymbolSearch } from './useSymbolSearch';

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('explicit FX posting hook', () => {
  it('reads current FX heads and corrects online without retries, invalidating only the affected account', async () => {
    const client = new QueryClient();
    fxReviewMock.mockResolvedValue({ expectedRevisionId: 'fx1' });
    const query = renderHook(() => useLiveFxConversionReview('a1', 'fx1'), {
      wrapper: createWrapper(client),
    });
    await waitFor(() =>
      expect(query.result.current.data?.expectedRevisionId).toBe('fx1')
    );
    expect(fxReviewMock).toHaveBeenCalledWith('a1', 'fx1');
    query.unmount();
    const keys = [
      'live-cash',
      'live-capital-operations',
      'fx-conversion-review',
      'cash-transfer-review',
      'account-trade-capability',
    ];
    for (const key of keys)
      for (const id of ['a1', 'a2']) client.setQueryData([key, id], {});
    const input = {
      idempotencyKey: 'fx-reverse',
      expectedRevisionId: 'fx1',
      expectedAuditNumber: 1,
      expectedSourceFingerprint: 'a'.repeat(64),
      reason: 'Duplicate exchange',
      replacement: null,
    };
    correctFxMock.mockResolvedValueOnce({ created: true });
    const { result } = renderHook(() => useCorrectLiveFxConversion(), {
      wrapper: createWrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync({
        accountId: 'a1',
        operationId: 'fx1',
        input,
      });
    });
    expect(correctFxMock).toHaveBeenCalledWith('a1', 'fx1', input);
    for (const key of keys) {
      expect(client.getQueryState([key, 'a1'])?.isInvalidated).toBe(true);
      expect(client.getQueryState([key, 'a2'])?.isInvalidated).toBe(false);
    }
    const offline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      await act(async () => {
        await expect(
          result.current.mutateAsync({
            accountId: 'a1',
            operationId: 'fx1',
            input,
          })
        ).rejects.toThrow('Offline changes are not queued');
      });
    } finally {
      offline.mockRestore();
    }
    expect(correctFxMock).toHaveBeenCalledOnce();
    correctFxMock.mockRejectedValueOnce(new Error('Conflict'));
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          accountId: 'a1',
          operationId: 'fx1',
          input,
        })
      ).rejects.toThrow('Conflict');
    });
    expect(correctFxMock).toHaveBeenCalledTimes(2);
    expect(client.getMutationCache().getAll().at(-1)?.options).toMatchObject({
      retry: false,
      networkMode: 'always',
      gcTime: 0,
    });
    client.clear();
  });
  it('invalidates only the affected cash, review and capability caches; refuses offline writes and retries', async () => {
    const client = new QueryClient();
    const keys = [
      'live-cash',
      'live-capital-operations',
      'cash-transfer-review',
      'account-trade-capability',
    ];
    for (const key of keys)
      for (const id of ['a1', 'a2']) client.setQueryData([key, id], {});
    const input = {
      idempotencyKey: 'fx1',
      effectiveDate: '2026-11-12',
      sequence: 1,
      from: { currency: 'AUD', amount: '1500' },
      to: { currency: 'USD', amount: '975' },
      fees: [],
      sourceReference: 'statement-fx',
    };
    postAccountFxConversionMock.mockResolvedValueOnce({ created: true });
    const { result } = renderHook(() => usePostAccountFxConversion(), {
      wrapper: createWrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync({ accountId: 'a1', input });
    });
    expect(postAccountFxConversionMock).toHaveBeenCalledWith('a1', input);
    for (const key of keys) {
      expect(client.getQueryState([key, 'a1'])?.isInvalidated).toBe(true);
      expect(client.getQueryState([key, 'a2'])?.isInvalidated).toBe(false);
    }
    const offline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      await act(async () => {
        await expect(
          result.current.mutateAsync({ accountId: 'a1', input })
        ).rejects.toThrow('Offline changes are not queued');
      });
    } finally {
      offline.mockRestore();
    }
    expect(postAccountFxConversionMock).toHaveBeenCalledOnce();
    postAccountFxConversionMock.mockRejectedValueOnce(
      new Error('Response lost')
    );
    await act(async () => {
      await expect(
        result.current.mutateAsync({ accountId: 'a1', input })
      ).rejects.toThrow('Response lost');
    });
    expect(postAccountFxConversionMock).toHaveBeenCalledTimes(2);
    expect(client.getMutationCache().getAll().at(-1)?.options).toMatchObject({
      retry: false,
      networkMode: 'always',
      gcTime: 0,
    });
    client.clear();
  });
});

describe('audited manual void hooks', () => {
  const input = {
    idempotencyKey: 'void1',
    expectedRevisionId: 'op1',
    expectedSourceFingerprint: 'a'.repeat(64),
    reason: 'Duplicate',
  };
  it('forwards exact identity and invalidates all economic and audit views', async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    voidTradeMock.mockResolvedValue({ revisionId: 'v1' });
    const { result } = renderHook(() => useVoidLiveManualTrade(), {
      wrapper: createWrapper(client),
    });
    await act(() =>
      result.current.mutateAsync({
        accountId: 'a1',
        transactionId: 'tx1',
        input,
      })
    );
    expect(voidTradeMock).toHaveBeenCalledWith('a1', 'tx1', input);
    for (const key of [
      ['holdings'],
      ['closed-positions'],
      ['realized-pnl'],
      ['user-portfolio'],
      ['tax-reports'],
      ['opening-reconciliation'],
      ['manual-trade-voids', 'a1'],
    ])
      expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
    client.clear();
  });
  it('never queues offline voids or retries failures and refreshes source on conflict', async () => {
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: 2 } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useVoidLiveManualTrade(), {
      wrapper: createWrapper(client),
    });
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValueOnce(false);
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          accountId: 'a1',
          transactionId: 'tx1',
          input,
        })
      ).rejects.toThrow('Offline changes are not queued');
    });
    expect(voidTradeMock).not.toHaveBeenCalled();
    const conflict = { isAxiosError: true, response: { status: 409 } };
    voidTradeMock.mockRejectedValueOnce(conflict);
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          accountId: 'a1',
          transactionId: 'tx1',
          input,
        })
      ).rejects.toBe(conflict);
    });
    expect(voidTradeMock).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['opening-reconciliation'],
    });
    client.clear();
    vi.restoreAllMocks();
  });
  it('scopes retained audits by account and pagination', async () => {
    const client = new QueryClient();
    const data = { items: [], total: 0, limit: 100, offset: 100 };
    readVoidsMock.mockResolvedValue(data);
    const { result } = renderHook(() => useLiveManualTradeVoids('a1', 100), {
      wrapper: createWrapper(client),
    });
    await waitFor(() => expect(result.current.data).toEqual(data));
    expect(readVoidsMock).toHaveBeenCalledWith('a1', 100);
    client.clear();
  });
});

describe('live acquisition correction hook', () => {
  const input = {
    idempotencyKey: 'fix1',
    expectedRevisionId: 'op1',
    expectedSourceFingerprint: 'a'.repeat(64),
    reason: 'Correct purchase',
    effectiveDate: '2026-10-02',
    sequence: 1,
    quantity: '2.000000000001',
    price: '12.345678901234',
    fees: '0.00000001',
  };
  it('forwards exact corrections and invalidates holdings, history, accounting, tax and performance', async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    correctLiveAcquisitionMock.mockResolvedValue({ revisionId: 'r1' });
    const { result } = renderHook(() => useCorrectLiveManualAcquisition(), {
      wrapper: createWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        accountId: 'a1',
        transactionId: 'buy1',
        input,
      });
    });
    expect(correctLiveAcquisitionMock).toHaveBeenCalledWith(
      'a1',
      'buy1',
      input
    );
    for (const key of [
      ['holdings'],
      ['closed-positions'],
      ['realized-pnl'],
      ['opening-reconciliation'],
      ['opening-statements', 'a1'],
      ['tax-reports'],
    ]) {
      expect(invalidate).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: key })
      );
    }
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({ predicate: expect.any(Function) })
    );
    client.clear();
  });
  it('rejects offline writes without queuing and refreshes stale review data on conflicts without retry', async () => {
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: 3 } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCorrectLiveManualAcquisition(), {
      wrapper: createWrapper(client),
    });
    const offline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      await act(async () => {
        await expect(
          result.current.mutateAsync({
            accountId: 'a1',
            transactionId: 'buy1',
            input,
          })
        ).rejects.toThrow(/offline changes are not queued/i);
      });
      expect(correctLiveAcquisitionMock).not.toHaveBeenCalled();
    } finally {
      offline.mockRestore();
    }
    correctLiveAcquisitionMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409 },
    });
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          accountId: 'a1',
          transactionId: 'buy1',
          input,
        })
      ).rejects.toMatchObject({ response: { status: 409 } });
    });
    expect(correctLiveAcquisitionMock).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['closed-positions'] });
    client.clear();
  });
});

describe('live imported execution correction hook', () => {
  it('uses the event identity and invalidates financial views', async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const input = {
      idempotencyKey: 'import-fix',
      expectedRevisionId: 'op1',
      expectedSourceFingerprint: 'a'.repeat(64),
      reason: 'Broker statement correction',
      effectiveDate: '2026-10-02',
      sequence: 2,
      price: '12.345678901234',
      fees: '0.00000001',
    };
    correctLiveImportedMock.mockResolvedValue({ revisionId: 'r1' });
    const { result } = renderHook(() => useCorrectLiveImportedExecution(), {
      wrapper: createWrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync({
        accountId: 'a1',
        eventId: 'event1',
        input,
      });
    });
    expect(correctLiveImportedMock).toHaveBeenCalledWith('a1', 'event1', input);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['holdings'] });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['closed-positions'],
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tax-reports'] });
    client.clear();
  });
});

describe('Kraken discovery query hooks', () => {
  it('keys coin search by both text and purchase currency and keeps empty search disabled', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    searchKrakenAssetsMock.mockResolvedValue([]);
    const { result, rerender } = renderHook(
      ({ q, quote }: { q: string; quote: 'AUD' | 'USD' }) =>
        useKrakenAssetSearch(q, quote),
      {
        initialProps: { q: '', quote: 'AUD' },
        wrapper: createWrapper(client),
      }
    );
    expect(searchKrakenAssetsMock).not.toHaveBeenCalled();
    rerender({ q: 'BTC', quote: 'AUD' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ q: 'BTC', quote: 'USD' });
    await waitFor(() =>
      expect(searchKrakenAssetsMock).toHaveBeenCalledWith('BTC', 'USD')
    );
    expect(
      client.getQueryCache().find({ queryKey: ['kraken-assets', 'AUD', 'BTC'] })
    ).toBeDefined();
    expect(
      client.getQueryCache().find({ queryKey: ['kraken-assets', 'USD', 'BTC'] })
    ).toBeDefined();
  });

  it('loads exchange choices only when needed', async () => {
    const client = new QueryClient();
    getExchangesMock.mockResolvedValue([]);
    const { result, rerender } = renderHook(
      ({ enabled }) => useExchanges('equity', enabled),
      {
        initialProps: { enabled: false },
        wrapper: createWrapper(client),
      }
    );
    expect(getExchangesMock).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getExchangesMock).toHaveBeenCalledWith('equity');
  });
});

describe('live account trade hook', () => {
  it('posts online only, does not retry and invalidates portfolio queries', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(['holdings'], []);
    const input = {
      kind: 'BUY' as const,
      assetId: 'asset-1',
      idempotencyKey: 'buy-1',
      effectiveDate: '2026-10-02',
      sequence: 1,
      quantity: '1',
      price: '10',
      fees: '0',
    };
    postAccountTradeMock.mockResolvedValue({ transactionId: 'tx1' });
    const { result } = renderHook(() => usePostAccountTrade(), {
      wrapper: createWrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync({ accountId: 'a1', input });
    });
    expect(postAccountTradeMock).toHaveBeenCalledWith('a1', input);
    expect(client.getQueryState(['holdings'])?.isInvalidated).toBe(true);

    const offline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      await act(async () => {
        await expect(
          result.current.mutateAsync({ accountId: 'a1', input })
        ).rejects.toThrow('Offline changes are not queued');
      });
    } finally {
      offline.mockRestore();
      client.clear();
    }
    expect(postAccountTradeMock).toHaveBeenCalledTimes(1);
  });
});

describe('account trade capability hook', () => {
  it('loads by account and effective date and can resolve a fresh capability', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const capability = {
      accountId: 'a1',
      mode: 'LIVE_LEDGER' as const,
      reason: null,
      openingDate: '2026-10-01',
      effectiveDate: '2026-10-02',
      nextSequence: 1,
    };
    getAccountTradeCapabilityMock.mockImplementation(
      async (_accountId: string, effectiveDate: string) => ({
        ...capability,
        effectiveDate,
      })
    );
    const { result } = renderHook(
      () => useAccountTradeCapability('a1', '2026-10-02'),
      { wrapper: createWrapper(client) }
    );
    await waitFor(() => expect(result.current.data).toEqual(capability));
    await act(async () => {
      await expect(result.current.resolve('2026-10-03')).resolves.toMatchObject(
        { effectiveDate: '2026-10-03' }
      );
    });
    expect(getAccountTradeCapabilityMock).toHaveBeenNthCalledWith(
      1,
      'a1',
      '2026-10-02'
    );
    expect(getAccountTradeCapabilityMock).toHaveBeenNthCalledWith(
      2,
      'a1',
      '2026-10-03'
    );
    expect(
      client.getQueryData(['account-trade-capability', 'a1', '2026-10-03'])
    ).toEqual({ ...capability, effectiveDate: '2026-10-03' });
    client.clear();
  });
});

describe('live account capital-flow hook', () => {
  it('loads paired review and invalidates both actual result accounts after online-only correction', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const reviewed = {
      sourceAccountId: 'a1',
      destinationAccountId: 'a2',
      current: null,
    };
    transferReviewMock.mockResolvedValue(reviewed);
    const { result: query } = renderHook(
      () => useLiveCashTransferReview('a1', 'out1'),
      { wrapper: createWrapper(client) }
    );
    await waitFor(() => expect(query.current.data).toEqual(reviewed));
    expect(transferReviewMock).toHaveBeenCalledWith('a1', 'out1');
    for (const id of ['a1', 'a2', 'other'])
      client.setQueryData(['live-capital-operations', id], {});
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
    correctTransferMock.mockResolvedValue({
      sourceReplay: { accountId: 'a1' },
      destinationReplay: { accountId: 'a2' },
    });
    const { result: mutation } = renderHook(
      () => useCorrectLiveCashTransfer(),
      { wrapper: createWrapper(client) }
    );
    await act(async () => {
      await mutation.current.mutateAsync({
        accountId: 'a1',
        operationId: 'out1',
        input,
      });
    });
    expect(correctTransferMock).toHaveBeenCalledWith('a1', 'out1', input);
    expect(
      client.getQueryState(['live-capital-operations', 'a1'])?.isInvalidated
    ).toBe(true);
    expect(
      client.getQueryState(['live-capital-operations', 'a2'])?.isInvalidated
    ).toBe(true);
    expect(
      client.getQueryState(['live-capital-operations', 'other'])?.isInvalidated
    ).toBe(false);
    const offline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      await act(async () => {
        await expect(
          mutation.current.mutateAsync({
            accountId: 'a1',
            operationId: 'out1',
            input,
          })
        ).rejects.toThrow('Offline changes are not queued');
      });
    } finally {
      offline.mockRestore();
      client.clear();
    }
    expect(correctTransferMock).toHaveBeenCalledOnce();
  });

  it('posts transfers online without retry and invalidates both accounts but not unrelated ledgers', async () => {
    const client = new QueryClient();
    for (const id of ['a1', 'a2', 'a3']) {
      client.setQueryData(['live-cash', id], {});
      client.setQueryData(['live-capital-operations', id, 0], {});
      client.setQueryData(['account-trade-capability', id, '2026-11-13'], {});
    }
    const input = {
      toAccountId: 'a2',
      idempotencyKey: 'transfer-1',
      effectiveDate: '2026-11-13',
      sourceSequence: 1,
      destinationSequence: 1,
      currency: 'AUD',
      amount: '40',
      fee: '1',
      sourceReference: 'statement-1',
    };
    postAccountCashTransferMock.mockResolvedValue({ created: true });
    const { result } = renderHook(() => usePostAccountCashTransfer(), {
      wrapper: createWrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync({ accountId: 'a1', input });
    });
    expect(postAccountCashTransferMock).toHaveBeenCalledWith('a1', input);
    for (const id of ['a1', 'a2']) {
      expect(client.getQueryState(['live-cash', id])?.isInvalidated).toBe(true);
      expect(
        client.getQueryState(['live-capital-operations', id, 0])?.isInvalidated
      ).toBe(true);
      expect(
        client.getQueryState(['account-trade-capability', id, '2026-11-13'])
          ?.isInvalidated
      ).toBe(true);
    }
    expect(client.getQueryState(['live-cash', 'a3'])?.isInvalidated).toBe(
      false
    );
    const offline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      await act(async () => {
        await expect(
          result.current.mutateAsync({ accountId: 'a1', input })
        ).rejects.toThrow('Offline changes are not queued');
      });
    } finally {
      offline.mockRestore();
    }
    postAccountCashTransferMock.mockRejectedValueOnce(new Error('Conflict'));
    await act(async () => {
      await expect(
        result.current.mutateAsync({ accountId: 'a1', input })
      ).rejects.toThrow('Conflict');
    });
    expect(postAccountCashTransferMock).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it('loads historical equity and ETF assets for income entry', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const assets = [{ assetId: 'asset-1', symbol: 'ABC' }];
    getIncomeEligibleAssetsMock.mockResolvedValue(assets);
    const { result } = renderHook(() => useIncomeEligibleAssets('a1'), {
      wrapper: createWrapper(client),
    });
    await waitFor(() => expect(result.current.data).toEqual(assets));
    expect(getIncomeEligibleAssetsMock).toHaveBeenCalledWith('a1');
    client.clear();
  });

  it('posts online only, does not retry and invalidates live cash queries', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(['live-cash', 'a1'], {});
    client.setQueryData(['live-capital-operations', 'a1', 0], {});
    const input = {
      kind: 'DEPOSIT' as const,
      idempotencyKey: 'deposit-1',
      effectiveDate: '2026-10-02',
      sequence: 1,
      currency: 'AUD',
      amount: '100.000000000001',
      sourceReference: 'bank-transfer-123',
    };
    postAccountCapitalFlowMock.mockResolvedValue({ operationId: 'op1' });
    const { result } = renderHook(() => usePostAccountCapitalFlow(), {
      wrapper: createWrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync({ accountId: 'a1', input });
    });
    expect(postAccountCapitalFlowMock).toHaveBeenCalledWith('a1', input);
    expect(client.getQueryState(['live-cash', 'a1'])?.isInvalidated).toBe(true);
    expect(
      client.getQueryState(['live-capital-operations', 'a1', 0])?.isInvalidated
    ).toBe(true);

    const offline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      await act(async () => {
        await expect(
          result.current.mutateAsync({ accountId: 'a1', input })
        ).rejects.toThrow('Offline changes are not queued');
      });
    } finally {
      offline.mockRestore();
      client.clear();
    }
    expect(postAccountCapitalFlowMock).toHaveBeenCalledTimes(1);
  });

  it('reviews and revises reinvestment online without automatic retry, invalidating affected heads', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    reinvestmentReviewMock.mockResolvedValue({ incomeOperationId: 'i1' });
    const { result: review } = renderHook(
      () => useLiveReinvestmentReview('a1', 'i1'),
      { wrapper: createWrapper(client) }
    );
    await waitFor(() =>
      expect(review.current.data?.incomeOperationId).toBe('i1')
    );
    for (const key of [
      ['holdings'],
      ['live-cash', 'a1'],
      ['live-capital-operations', 'a1'],
      ['fx-conversion-review', 'a1'],
      ['cash-transfer-review', 'a1'],
    ])
      client.setQueryData(key, {});
    client.setQueryData(['live-cash', 'other'], {});
    correctReinvestmentMock.mockResolvedValueOnce({ created: true });
    const { result } = renderHook(() => useCorrectLiveReinvestment(), {
      wrapper: createWrapper(client),
    });
    const input = {
      idempotencyKey: 'rev',
      expectedIncomeRevisionId: 'i1',
      expectedAcquisitionRevisionId: 'b1',
      expectedAuditNumber: 2,
      expectedSourceFingerprint: 'a'.repeat(64),
      reason: 'Cancelled',
      replacement: null,
    };
    await act(async () => {
      await result.current.mutateAsync({
        accountId: 'a1',
        operationId: 'i1',
        input,
      });
    });
    expect(correctReinvestmentMock).toHaveBeenCalledWith('a1', 'i1', input);
    for (const key of [
      ['holdings'],
      ['live-cash', 'a1'],
      ['live-capital-operations', 'a1'],
      ['fx-conversion-review', 'a1'],
      ['cash-transfer-review', 'a1'],
    ])
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(client.getQueryState(['live-cash', 'other'])?.isInvalidated).toBe(
      false
    );
    const offline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      await act(async () => {
        await expect(
          result.current.mutateAsync({
            accountId: 'a1',
            operationId: 'i1',
            input,
          })
        ).rejects.toThrow('Offline changes are not queued');
      });
      expect(correctReinvestmentMock).toHaveBeenCalledTimes(1);
    } finally {
      offline.mockRestore();
      client.clear();
    }
  });

  it('posts reinvestment online without retries and invalidates cash, holdings and review heads', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    for (const key of [
      ['holdings'],
      ['live-cash', 'a1'],
      ['live-capital-operations', 'a1', 0],
      ['account-trade-capability', 'a1'],
      ['income-eligible-assets', 'a1'],
      ['cash-transfer-review', 'a1'],
      ['fx-conversion-review', 'a1'],
    ])
      client.setQueryData(key, {});
    client.setQueryData(['live-cash', 'other'], {});
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
    postReinvestmentMock.mockResolvedValueOnce({ positionId: 'p1' });
    const { result } = renderHook(() => usePostAccountReinvestment(), {
      wrapper: createWrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync({ accountId: 'a1', input });
    });
    expect(postReinvestmentMock).toHaveBeenCalledWith('a1', input);
    for (const key of [
      ['holdings'],
      ['live-cash', 'a1'],
      ['live-capital-operations', 'a1', 0],
      ['account-trade-capability', 'a1'],
      ['income-eligible-assets', 'a1'],
      ['cash-transfer-review', 'a1'],
      ['fx-conversion-review', 'a1'],
    ])
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(client.getQueryState(['live-cash', 'other'])?.isInvalidated).toBe(
      false
    );
    postReinvestmentMock.mockRejectedValueOnce(new Error('Response lost'));
    await act(async () => {
      await expect(
        result.current.mutateAsync({ accountId: 'a1', input })
      ).rejects.toThrow('Response lost');
    });
    expect(postReinvestmentMock).toHaveBeenCalledTimes(2);
    const offline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      await act(async () => {
        await expect(
          result.current.mutateAsync({ accountId: 'a1', input })
        ).rejects.toThrow('Offline changes are not queued');
      });
      expect(postReinvestmentMock).toHaveBeenCalledTimes(2);
    } finally {
      offline.mockRestore();
      client.clear();
    }
  });

  it('posts income online and invalidates cash and audit views', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(['live-cash', 'a1'], {});
    client.setQueryData(['live-capital-operations', 'a1', 0], {});
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
      sourceReference: 'statement-1',
    };
    postAccountIncomeReceiptMock.mockResolvedValue({ operationId: 'income-1' });
    const { result } = renderHook(() => usePostAccountIncomeReceipt(), {
      wrapper: createWrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync({ accountId: 'a1', input });
    });
    expect(postAccountIncomeReceiptMock).toHaveBeenCalledWith('a1', input);
    expect(client.getQueryState(['live-cash', 'a1'])?.isInvalidated).toBe(true);
    expect(
      client.getQueryState(['live-capital-operations', 'a1', 0])?.isInvalidated
    ).toBe(true);
    client.clear();
  });

  it('reads live funding pages and posts corrections only while online', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const page = { items: [], total: 0 };
    getLiveCapitalMock.mockResolvedValue(page);
    const { result: query } = renderHook(
      () => useLiveCapitalOperations('a1', 100),
      { wrapper: createWrapper(client) }
    );
    await waitFor(() => expect(query.current.data).toEqual(page));
    expect(getLiveCapitalMock).toHaveBeenCalledWith('a1', 100);

    client.setQueryData(['live-capital-operations', 'a1', 0], {});
    const input = {
      idempotencyKey: 'capital-fix-1',
      expectedRevisionId: 'operation-1',
      expectedAuditNumber: 3,
      expectedSourceFingerprint: 'a'.repeat(64),
      reason: 'Correct bank line',
      replacement: null,
    };
    correctLiveCapitalMock.mockResolvedValue({ revisionId: 'revision-1' });
    const { result: mutation } = renderHook(
      () => useCorrectLiveCapitalOperation(),
      { wrapper: createWrapper(client) }
    );
    await act(async () => {
      await mutation.current.mutateAsync({
        accountId: 'a1',
        operationId: 'operation-1',
        input,
      });
    });
    expect(correctLiveCapitalMock).toHaveBeenCalledWith(
      'a1',
      'operation-1',
      input
    );
    expect(
      client.getQueryState(['live-capital-operations', 'a1', 0])?.isInvalidated
    ).toBe(true);

    const offline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      await act(async () => {
        await expect(
          mutation.current.mutateAsync({
            accountId: 'a1',
            operationId: 'operation-1',
            input,
          })
        ).rejects.toThrow('Offline changes are not queued');
      });
    } finally {
      offline.mockRestore();
      client.clear();
    }
    expect(correctLiveCapitalMock).toHaveBeenCalledTimes(1);
  });

  it('posts audited income corrections and invalidates account cash history', async () => {
    const client = new QueryClient();
    client.setQueryData(['live-cash', 'a1'], {});
    client.setQueryData(['live-capital-operations', 'a1', 0], {});
    const input = {
      idempotencyKey: 'income-fix-1',
      expectedRevisionId: 'income-operation',
      expectedAuditNumber: 3,
      expectedSourceFingerprint: 'a'.repeat(64),
      reason: 'Correct issuer withholding',
      replacement: null,
    };
    correctLiveIncomeMock.mockResolvedValue({ revisionId: 'revision-1' });
    const { result } = renderHook(() => useCorrectLiveIncomeReceipt(), {
      wrapper: createWrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync({
        accountId: 'a1',
        operationId: 'income-operation',
        input,
      });
    });
    expect(correctLiveIncomeMock).toHaveBeenCalledWith(
      'a1',
      'income-operation',
      input
    );
    expect(client.getQueryState(['live-cash', 'a1'])?.isInvalidated).toBe(true);
    expect(
      client.getQueryState(['live-capital-operations', 'a1', 0])?.isInvalidated
    ).toBe(true);
    client.clear();
  });
});

describe('inactive imported cash hook', () => {
  it('refreshes only the imported correction statement on success and source conflict, without automatic retries', async () => {
    const client = new QueryClient();
    const key = ['opening-reconciliation', 'a1', 's1'];
    const otherKey = ['opening-reconciliation', 'a2', 's2'];
    client.setQueryData(key, {});
    client.setQueryData(otherKey, {});
    const input = {
      idempotencyKey: 'fix',
      expectedRevisionId: 'op1',
      reason: 'Broker sequence',
      sequence: 3,
    };
    const args = {
      accountId: 'a1',
      statementId: 's1',
      operationId: 'op1',
      input,
    };
    const { result } = renderHook(
      () => useCorrectDraftImportedExecutionCash(),
      { wrapper: createWrapper(client) }
    );
    correctImportedCashMock.mockResolvedValueOnce({ revisionId: 'rev1' });
    await act(async () => {
      await result.current.mutateAsync(args);
    });
    expect(correctImportedCashMock).toHaveBeenCalledWith(
      'a1',
      's1',
      'op1',
      input
    );
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false);
    client.setQueryData(key, {});
    correctImportedCashMock.mockRejectedValueOnce(
      Object.assign(new Error('Source changed'), {
        isAxiosError: true,
        response: { status: 409 },
      })
    );
    await act(async () => {
      await expect(result.current.mutateAsync(args)).rejects.toThrow(
        'Source changed'
      );
    });
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(correctImportedCashMock).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it('never sends or queues imported corrections while offline', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const client = new QueryClient();
    try {
      const { result } = renderHook(
        () => useCorrectDraftImportedExecutionCash(),
        { wrapper: createWrapper(client) }
      );
      await act(async () => {
        await expect(
          result.current.mutateAsync({
            accountId: 'a1',
            statementId: 's1',
            operationId: 'op1',
            input: {
              idempotencyKey: 'fix',
              expectedRevisionId: 'op1',
              reason: 'Broker sequence',
              sequence: 3,
            },
          })
        ).rejects.toThrow('Offline changes are not queued');
      });
      expect(correctImportedCashMock).not.toHaveBeenCalled();
    } finally {
      online.mockRestore();
      client.clear();
    }
  });
  it('refreshes only the corrected statement after success and conflict without retrying the command', async () => {
    const client = new QueryClient();
    const queryKey = ['opening-reconciliation', 'a1', 's1'];
    const otherKey = ['opening-reconciliation', 'a2', 's2'];
    client.setQueryData(queryKey, { state: 'DRAFT' });
    client.setQueryData(otherKey, { state: 'DRAFT' });
    const args = {
      accountId: 'a1',
      statementId: 's1',
      operationId: 'op1',
      input: {
        idempotencyKey: 'key',
        expectedRevisionId: 'op1',
        reason: 'Fix',
        replacement: null,
      },
    };
    const { result } = renderHook(
      () => useCorrectDraftReconciliationCashOperation(),
      {
        wrapper: createWrapper(client),
      }
    );
    correctDraftCashMock.mockResolvedValueOnce({ revisionId: 'rev1' });
    await act(async () => {
      await result.current.mutateAsync(args);
    });
    expect(correctDraftCashMock).toHaveBeenLastCalledWith(
      'a1',
      's1',
      'op1',
      args.input
    );
    expect(client.getQueryState(queryKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false);
    client.setQueryData(queryKey, { state: 'DRAFT' });
    const conflict = Object.assign(new Error('Revision changed'), {
      isAxiosError: true,
      response: { status: 409 },
    });
    correctDraftCashMock.mockRejectedValueOnce(conflict);
    await act(async () => {
      await expect(result.current.mutateAsync(args)).rejects.toThrow(
        'Revision changed'
      );
    });
    expect(client.getQueryState(queryKey)?.isInvalidated).toBe(true);
    expect(correctDraftCashMock).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it('does not queue or send corrections while offline', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const client = new QueryClient();
    try {
      const { result } = renderHook(
        () => useCorrectDraftReconciliationCashOperation(),
        {
          wrapper: createWrapper(client),
        }
      );
      await act(async () => {
        await expect(
          result.current.mutateAsync({
            accountId: 'a1',
            statementId: 's1',
            operationId: 'op1',
            input: {
              idempotencyKey: 'k',
              expectedRevisionId: 'op1',
              reason: 'Fix',
              replacement: null,
            },
          })
        ).rejects.toThrow('Offline changes are not queued');
      });
      expect(correctDraftCashMock).not.toHaveBeenCalled();
    } finally {
      online.mockRestore();
      client.clear();
    }
  });
  it('stages a manual transaction and refreshes only its draft report, including on conflict', async () => {
    const client = new QueryClient();
    const key = ['opening-reconciliation', 'a1', 's1'];
    const otherKey = ['opening-reconciliation', 'a2', 's2'];
    client.setQueryData(key, {});
    client.setQueryData(otherKey, {});
    stageManualExecutionCashMock.mockResolvedValue({ state: 'DRAFT' });
    const { result } = renderHook(() => useStageDraftManualExecutionCash(), {
      wrapper: createWrapper(client),
    });
    const input = {
      accountId: 'a1',
      statementId: 's1',
      transactionId: 't1',
      input: { sequence: 2 },
    };
    await act(async () => {
      await result.current.mutateAsync(input);
    });
    expect(stageManualExecutionCashMock).toHaveBeenCalledWith(
      'a1',
      's1',
      't1',
      { sequence: 2 }
    );
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false);
    client.setQueryData(key, {});
    stageManualExecutionCashMock.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409 },
    });
    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toMatchObject({
        response: { status: 409 },
      });
    });
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(stageManualExecutionCashMock).toHaveBeenCalledTimes(2);
    client.clear();
  });
  it('rejects manual execution staging offline instead of queueing it', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const client = new QueryClient();
    try {
      const { result } = renderHook(() => useStageDraftManualExecutionCash(), {
        wrapper: createWrapper(client),
      });
      await act(async () => {
        await expect(
          result.current.mutateAsync({
            accountId: 'a1',
            statementId: 's1',
            transactionId: 't1',
            input: { sequence: 1 },
          })
        ).rejects.toThrow('Offline changes are not queued');
      });
      expect(stageManualExecutionCashMock).not.toHaveBeenCalled();
    } finally {
      online.mockRestore();
      client.clear();
    }
  });
  it('stages the persisted event and invalidates its reconciliation report', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const queryKey = ['opening-reconciliation', 'a1', 's1'];
    client.setQueryData(queryKey, { state: 'DRAFT' });
    stageImportedExecutionCashMock.mockResolvedValue({
      operationId: 'op1',
      state: 'DRAFT',
      created: true,
    });
    const { result } = renderHook(() => useStageDraftImportedExecutionCash(), {
      wrapper: createWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        accountId: 'a1',
        statementId: 's1',
        eventId: 'event-1',
        input: { sequence: 2 },
      });
    });

    expect(stageImportedExecutionCashMock).toHaveBeenCalledWith(
      'a1',
      's1',
      'event-1',
      { sequence: 2 }
    );
    await waitFor(() =>
      expect(client.getQueryState(queryKey)?.isInvalidated).toBe(true)
    );
  });
});

describe('central API mutation hooks', () => {
  const saleInput = {
    accountId: 'a1',
    statementId: 's1',
    operationId: 'op1',
    input: {
      idempotencyKey: 'fix',
      expectedRevisionId: 'op1',
      expectedSourceFingerprint: 'a'.repeat(64),
      reason: 'Correct fees',
      effectiveDate: '2026-10-03',
      sequence: 1,
      price: '12',
      fees: '1',
    },
  };
  it.each(['sale', 'acquisition'] as const)(
    'refreshes all financial projections after a coordinated %s correction',
    async kind => {
      const client = new QueryClient();
      const keys = [
        ['holdings'],
        ['closed-positions'],
        ['realized-pnl'],
        ['user-portfolio'],
        ['portfolio-history'],
        ['opening-reconciliation', 'a1', 's1'],
        ['opening-reconciliation', 'a1', 'other'],
        ['opening-statements'],
        ['tax-reports'],
        ['statistics-summary', {}],
        ['quotes'],
      ];
      keys.forEach(key => client.setQueryData(key, {}));
      const mock =
        kind === 'sale'
          ? correctRecordedSaleMock
          : correctRecordedAcquisitionMock;
      mock.mockResolvedValue({ state: 'DRAFT' });
      const { result } = renderHook(
        () => ({
          sale: useCorrectDraftRecordedSale(),
          acquisition: useCorrectDraftRecordedAcquisition(),
        }),
        {
          wrapper: createWrapper(client),
        }
      );
      await act(async () => {
        if (kind === 'sale') await result.current.sale.mutateAsync(saleInput);
        else
          await result.current.acquisition.mutateAsync({
            ...saleInput,
            input: { ...saleInput.input, quantity: '1.25' },
          });
      });
      expect(mock).toHaveBeenCalledWith('a1', 's1', 'op1', {
        ...saleInput.input,
        ...(kind === 'acquisition' ? { quantity: '1.25' } : {}),
      });
      for (const key of keys.slice(0, -1))
        expect(client.getQueryState(key)?.isInvalidated).toBe(true);
      expect(client.getQueryState(['quotes'])?.isInvalidated).toBe(false);
      client.clear();
    }
  );
  it.each(['sale', 'acquisition'] as const)(
    'refreshes conflicting %s reviews without retries and rejects offline corrections',
    async kind => {
      const client = new QueryClient();
      const key = ['opening-reconciliation', 'a1', 's1'];
      client.setQueryData(key, {});
      const mock =
        kind === 'sale'
          ? correctRecordedSaleMock
          : correctRecordedAcquisitionMock;
      mock.mockRejectedValue({
        isAxiosError: true,
        response: { status: 409 },
      });
      const { result } = renderHook(
        () => ({
          sale: useCorrectDraftRecordedSale(),
          acquisition: useCorrectDraftRecordedAcquisition(),
        }),
        {
          wrapper: createWrapper(client),
        }
      );
      const submit = () =>
        kind === 'sale'
          ? result.current.sale.mutateAsync(saleInput)
          : result.current.acquisition.mutateAsync({
              ...saleInput,
              input: { ...saleInput.input, quantity: '1.25' },
            });
      await act(async () => {
        await expect(submit()).rejects.toMatchObject({
          response: { status: 409 },
        });
      });
      expect(mock).toHaveBeenCalledTimes(1);
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
      const online = vi
        .spyOn(navigator, 'onLine', 'get')
        .mockReturnValue(false);
      try {
        await act(async () => {
          await expect(submit()).rejects.toThrow(
            'Offline changes are not queued'
          );
        });
        expect(mock).toHaveBeenCalledTimes(1);
      } finally {
        online.mockRestore();
        client.clear();
      }
    }
  );
  it('deleting an account removes only its opening draft history from cache', async () => {
    deleteAccountMock.mockResolvedValue({ success: true });
    const client = new QueryClient();
    client.setQueryData(['opening-statements', 'a1', 'latest'], {
      statements: [],
    });
    client.setQueryData(['opening-statements', 'a1', 5], { statements: [] });
    client.setQueryData(['opening-statements', 'a2', 'latest'], {
      statements: [],
    });
    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: createWrapper(client),
    });
    await act(() => result.current.mutateAsync('a1'));
    expect(deleteAccountMock).toHaveBeenCalledWith('a1');
    expect(
      client.getQueryData(['opening-statements', 'a1', 'latest'])
    ).toBeUndefined();
    expect(
      client.getQueryData(['opening-statements', 'a1', 5])
    ).toBeUndefined();
    expect(client.getQueryData(['opening-statements', 'a2', 'latest'])).toEqual(
      { statements: [] }
    );
    client.clear();
  });
  it('updates a position and invalidates every position-derived query family', async () => {
    updatePositionMock.mockResolvedValue({ success: true });
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdatePosition(), {
      wrapper: createWrapper(queryClient),
    });

    await act(() =>
      result.current.mutateAsync({
        id: 'position-1',
        payload: { currentPrice: 125 },
      })
    );

    expect(updatePositionMock).toHaveBeenCalledWith('position-1', {
      currentPrice: 125,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['holdings'] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['closed-positions'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['realized-pnl'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['portfolio-history'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['user-portfolio'],
    });
  });

  it('updates a close event through the hook boundary', async () => {
    updateCloseEventMock.mockResolvedValue({ success: true });
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useUpdateCloseEvent(), {
      wrapper: createWrapper(queryClient),
    });

    await act(() =>
      result.current.mutateAsync({
        id: 'close-1',
        data: { notes: 'Reviewed' },
      })
    );

    expect(updateCloseEventMock).toHaveBeenCalledWith('close-1', {
      notes: 'Reviewed',
    });
  });

  it('recalculates drawdown and invalidates position-derived queries', async () => {
    recalculateDrawdownMock.mockResolvedValue({ success: true });
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRecalculateDrawdown(), {
      wrapper: createWrapper(queryClient),
    });

    await act(() => result.current.mutateAsync('position-1'));

    expect(recalculateDrawdownMock).toHaveBeenCalledWith('position-1');
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['holdings'] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['closed-positions'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['portfolio-history'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['user-portfolio'],
    });
  });

  it('invalidates position queries only when a stop loss hit was recorded', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCheckStopLoss(), {
      wrapper: createWrapper(queryClient),
    });

    checkStopLossMock.mockResolvedValue({ stopLossHitAt: null });
    await act(() => result.current.mutateAsync({ id: 'position-1' }));
    expect(checkStopLossMock).toHaveBeenCalledWith('position-1', undefined);
    expect(invalidateQueries).not.toHaveBeenCalled();

    checkStopLossMock.mockResolvedValue({ stopLossHitAt: '2026-02-03' });
    await act(() =>
      result.current.mutateAsync({ id: 'position-1', currentPrice: 90 })
    );
    expect(checkStopLossMock).toHaveBeenCalledWith('position-1', 90);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['holdings'] });
  });

  it('reviews a split-affected stop online and invalidates position queries', async () => {
    reviewSplitStopLossMock.mockResolvedValue({
      stopLossPrice: 90,
      stopLossSetAt: '2026-11-20T00:00:00.000Z',
    });
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useReviewSplitStopLoss(), {
      wrapper: createWrapper(queryClient),
    });

    await act(() =>
      result.current.mutateAsync({
        id: 'position-1',
        input: { stopLossPrice: 90, reviewConfirmed: true },
      })
    );

    expect(reviewSplitStopLossMock).toHaveBeenCalledWith('position-1', {
      stopLossPrice: 90,
      reviewConfirmed: true,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['holdings'] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['closed-positions'],
    });
  });

  it('does not queue split stop-loss review while offline', async () => {
    const online = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    const { result } = renderHook(() => useReviewSplitStopLoss(), {
      wrapper: createWrapper(new QueryClient()),
    });
    try {
      await act(async () => {
        await expect(
          result.current.mutateAsync({
            id: 'position-1',
            input: { stopLossPrice: 90, reviewConfirmed: true },
          })
        ).rejects.toThrow(/offline changes are not queued/i);
      });
      expect(reviewSplitStopLossMock).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: online,
      });
    }
  });

  it('refreshes conflicted historical calculations without retrying or hiding the error', async () => {
    const error = Object.assign(new Error('Position changed'), {
      isAxiosError: true,
      response: { status: 409 },
    });
    recalculateDrawdownMock.mockRejectedValueOnce(error);
    const warning = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: 2 } },
    });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRecalculateDrawdown(), {
      wrapper: createWrapper(queryClient),
    });
    try {
      await act(async () => {
        await expect(result.current.mutateAsync('position-1')).rejects.toBe(
          error
        );
      });
      expect(recalculateDrawdownMock).toHaveBeenCalledTimes(1);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['holdings'] });
      expect(warning).toHaveBeenCalledWith(
        'Historical position recalculation failed',
        error
      );
    } finally {
      warning.mockRestore();
    }
  });

  it('refreshes conflicted stop checks without automatically retrying', async () => {
    const error = Object.assign(new Error('Stop changed'), {
      isAxiosError: true,
      response: { status: 409 },
    });
    checkStopLossMock.mockRejectedValueOnce(error);
    const warning = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: 2 } },
    });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCheckStopLoss(), {
      wrapper: createWrapper(queryClient),
    });
    try {
      await act(async () => {
        await expect(
          result.current.mutateAsync({ id: 'position-1' })
        ).rejects.toBe(error);
      });
      expect(checkStopLossMock).toHaveBeenCalledTimes(1);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['holdings'] });
      expect(warning).toHaveBeenCalledWith('Stop loss check failed', error);
    } finally {
      warning.mockRestore();
    }
  });

  it('does not invalidate and loop background stop checks after non-conflict failures', async () => {
    const error = new Error('Offline');
    checkStopLossMock.mockRejectedValueOnce(error);
    const warning = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCheckStopLoss(), {
      wrapper: createWrapper(queryClient),
    });
    try {
      await act(async () => {
        await expect(
          result.current.mutateAsync({ id: 'position-1' })
        ).rejects.toBe(error);
      });
      expect(invalidate).not.toHaveBeenCalled();
    } finally {
      warning.mockRestore();
    }
  });

  it('delegates logout and PDF download without adding cache behavior', async () => {
    logoutMock.mockResolvedValue({ success: true });
    const pdf = new Blob(['pdf']);
    downloadTaxReportPdfMock.mockResolvedValue(pdf);
    const queryClient = new QueryClient();
    const wrapper = createWrapper(queryClient);
    const logout = renderHook(() => useLogout(), { wrapper });
    const download = renderHook(() => useDownloadTaxReportPdf(), { wrapper });

    await act(() => logout.result.current.mutateAsync('refresh-token'));
    const result = await act(() =>
      download.result.current.mutateAsync('report-1')
    );

    expect(logoutMock).toHaveBeenCalledWith('refresh-token');
    expect(downloadTaxReportPdfMock).toHaveBeenCalledWith('report-1');
    expect(result).toBe(pdf);
  });
});

describe('central API query hooks', () => {
  it('passes the close-date scope through to the closed-positions request', async () => {
    const page = { trades: [], total: 0 };
    getClosedPositionsMock.mockResolvedValue(page);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const params = { dateFrom: '2026-01-01', dateTo: '2026-12-31' };
    const { result } = renderHook(() => useClosedPositions(params), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.data).toEqual(page));

    expect(getClosedPositionsMock).toHaveBeenCalledWith(params);
  });

  it('skips the realized P&L request until both account and exchange are known', async () => {
    getRealizedPnLMock.mockResolvedValue(1234);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = createWrapper(queryClient);

    const disabled = renderHook(() => useRealizedPnL('acc-1', undefined), {
      wrapper,
    });
    expect(disabled.result.current.fetchStatus).toBe('idle');
    expect(getRealizedPnLMock).not.toHaveBeenCalled();

    const enabled = renderHook(() => useRealizedPnL('acc-1', 'NASDAQ'), {
      wrapper,
    });
    await waitFor(() => expect(enabled.result.current.data).toBe(1234));
    expect(getRealizedPnLMock).toHaveBeenCalledWith('acc-1', 'NASDAQ');
  });

  it('searches stocks with a query-keyed request', async () => {
    const matches = [{ symbol: 'AAPL', name: 'Apple', exchange: 'NASDAQ' }];
    searchStocksMock.mockResolvedValue(matches);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useStockSearch('AAPL', 10), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.data).toEqual(matches));

    expect(searchStocksMock).toHaveBeenCalledWith('AAPL', 10);
  });

  it('preserves debounced symbol suggestions through the central query hook', async () => {
    const matches = [{ symbol: 'AAPL', name: 'Apple', exchange: 'NASDAQ' }];
    searchStocksMock.mockResolvedValue(matches);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useSymbolSearch(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => result.current.searchSymbol({ query: ' AAPL ' }));

    expect(searchStocksMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(result.current.symbolSuggestions).toEqual(matches)
    );
    expect(searchStocksMock).toHaveBeenCalledWith('AAPL', 10);
  });
});

describe('import hooks', () => {
  it('refreshes a rejected commit for review without retrying or claiming success', async () => {
    const error = Object.assign(
      new Error('Holdings changed; review the refreshed plan'),
      {
        response: { status: 409 },
      }
    );
    commitImportMock.mockRejectedValueOnce(error);
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: 2, retryDelay: 0 } },
    });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCommitImport('imp-1'), {
      wrapper: createWrapper(queryClient),
    });
    await act(async () => {
      await expect(
        result.current.mutateAsync(undefined, { onSuccess })
      ).rejects.toBe(error);
    });
    expect(commitImportMock).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['imports'] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['import', 'imp-1'],
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });

  it('refreshes a conflicted resolution without overwriting the cached plan', async () => {
    const error = new Error('This event has already been processed');
    resolveImportEventMock.mockRejectedValueOnce(error);
    const queryClient = new QueryClient();
    const cached = { batch: { id: 'imp-1' }, plan: { issues: [] } };
    queryClient.setQueryData(['import', 'imp-1'], cached);
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useResolveImportEvent('imp-1'), {
      wrapper: createWrapper(queryClient),
    });
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          eventId: 'e1',
          resolution: { skip: true },
        })
      ).rejects.toBe(error);
    });
    expect(queryClient.getQueryData(['import', 'imp-1'])).toBe(cached);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['imports'] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['import', 'imp-1'],
    });
  });

  it('commits an import and refreshes positions, statistics and imports', async () => {
    commitImportMock.mockResolvedValue({
      createdPositionIds: ['p1'],
      appliedEvents: 2,
    });
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    queryClient.setQueryData(['statistics-summary', {}], { x: 1 });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCommitImport('imp-1'), {
      wrapper: createWrapper(queryClient),
    });

    await act(() => result.current.mutateAsync(undefined));

    expect(commitImportMock).toHaveBeenCalledWith('imp-1', undefined);
    for (const key of [
      ['holdings'],
      ['closed-positions'],
      ['realized-pnl'],
      ['portfolio-history'],
      ['user-portfolio'],
      ['imports'],
      ['import', 'imp-1'],
    ]) {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: key });
    }
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['tax-reports', 'position-usage'],
    });
    const predicateCall = invalidateQueries.mock.calls.find(
      ([filters]) => filters && 'predicate' in filters
    );
    const predicate = predicateCall?.[0]?.predicate;
    expect(predicate?.({ queryKey: ['statistics-summary', {}] } as never)).toBe(
      true
    );
    expect(predicate?.({ queryKey: ['holdings'] } as never)).toBe(false);
  });

  it('stores the re-computed plan returned by a resolution', async () => {
    const detail = { plan: { issues: [] } };
    resolveImportEventMock.mockResolvedValue(detail);
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useResolveImportEvent('imp-1'), {
      wrapper: createWrapper(queryClient),
    });

    await act(() =>
      result.current.mutateAsync({ eventId: 'e1', resolution: { skip: true } })
    );

    expect(resolveImportEventMock).toHaveBeenCalledWith('imp-1', 'e1', {
      skip: true,
    });
    expect(queryClient.getQueryData(['import', 'imp-1'])).toBe(detail);
  });
});

describe('opening statement confirmation hook', () => {
  it('confirms only while online and invalidates account-scoped ledger views', async () => {
    const client = new QueryClient();
    const keys = [
      ['opening-statements', 'a1', 'latest'],
      ['opening-reconciliation', 'a1', 's1'],
      ['account-trade-capability', 'a1', '2026-11-11'],
      ['live-cash', 'a1', 0],
      ['opening-statements', 'a2', 'latest'],
    ];
    keys.forEach(key => client.setQueryData(key, {}));
    const input = {
      idempotencyKey: 'confirm-1',
      expectedSourceFingerprint: 'a'.repeat(64),
      acknowledgements: {
        openingBalancesReviewed: true as const,
        cashEvidenceUserAttested: true as const,
        priorDraftActivityExcluded: true as const,
        returnsUnavailableWithoutValuations: true as const,
      },
    };
    confirmOpeningStatementMock.mockResolvedValue({ created: true });
    const { result } = renderHook(() => useConfirmOpeningStatement(), {
      wrapper: createWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        accountId: 'a1',
        statementId: 's1',
        input,
      });
    });
    expect(confirmOpeningStatementMock).toHaveBeenCalledWith('a1', 's1', input);
    for (const key of keys.slice(0, -1))
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(client.getQueryState(keys[4])?.isInvalidated).toBe(false);

    const offline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      await act(async () => {
        await expect(
          result.current.mutateAsync({
            accountId: 'a1',
            statementId: 's1',
            input,
          })
        ).rejects.toThrow('Offline changes are not queued');
      });
      expect(confirmOpeningStatementMock).toHaveBeenCalledTimes(1);
    } finally {
      offline.mockRestore();
      client.clear();
    }
  });
});
