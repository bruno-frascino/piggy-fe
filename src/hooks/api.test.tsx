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
} = vi.hoisted(() => ({
  updatePositionMock: vi.fn(),
  updateCloseEventMock: vi.fn(),
  recalculateDrawdownMock: vi.fn(),
  checkStopLossMock: vi.fn(),
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
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    updatePosition: updatePositionMock,
    updateCloseEvent: updateCloseEventMock,
    recalculateDrawdown: recalculateDrawdownMock,
    checkStopLoss: checkStopLossMock,
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
  },
}));

import {
  useCheckStopLoss,
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
