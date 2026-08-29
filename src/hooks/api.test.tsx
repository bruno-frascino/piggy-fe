// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  updatePositionMock,
  updateCloseEventMock,
  recalculateDrawdownMock,
  searchStocksMock,
  logoutMock,
  downloadTaxReportPdfMock,
  getClosedPositionsMock,
  getRealizedPnLMock,
} = vi.hoisted(() => ({
  updatePositionMock: vi.fn(),
  updateCloseEventMock: vi.fn(),
  recalculateDrawdownMock: vi.fn(),
  searchStocksMock: vi.fn(),
  logoutMock: vi.fn(),
  downloadTaxReportPdfMock: vi.fn(),
  getClosedPositionsMock: vi.fn(),
  getRealizedPnLMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    updatePosition: updatePositionMock,
    updateCloseEvent: updateCloseEventMock,
    recalculateDrawdown: recalculateDrawdownMock,
    searchStocks: searchStocksMock,
    logout: logoutMock,
    downloadTaxReportPdf: downloadTaxReportPdfMock,
    getClosedPositions: getClosedPositionsMock,
    getRealizedPnL: getRealizedPnLMock,
  },
}));

import {
  useClosedPositions,
  useDownloadTaxReportPdf,
  useLogout,
  useRealizedPnL,
  useRecalculateDrawdown,
  useStockSearch,
  useUpdateCloseEvent,
  useUpdatePosition,
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

describe('central API mutation hooks', () => {
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
