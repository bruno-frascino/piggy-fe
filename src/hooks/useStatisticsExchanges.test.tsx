// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useStatisticsBreakdownsMock } = vi.hoisted(() => ({
  useStatisticsBreakdownsMock: vi.fn(),
}));

vi.mock('@/hooks/api', () => ({
  useStatisticsBreakdowns: useStatisticsBreakdownsMock,
}));

import { useStatisticsExchanges } from './useStatisticsExchanges';

const ROWS = {
  rows: [
    { key: 'NASDAQ', label: 'NASDAQ', value: 10, weight: 0.5, currency: 'USD' },
    { key: 'ASX', label: 'ASX', value: 10, weight: 0.5, currency: 'AUD' },
  ],
  total: 20,
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useStatisticsBreakdownsMock.mockReturnValue({
    data: ROWS,
    isLoading: false,
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('useStatisticsExchanges', () => {
  it('lists the account exchanges sorted by code and picks the first one', () => {
    const { result } = renderHook(() => useStatisticsExchanges('acc-1'));

    expect(result.current.exchanges.map(e => e.code)).toEqual([
      'ASX',
      'NASDAQ',
    ]);
    expect(result.current.selectedExchangeCode).toBe('ASX');
    expect(result.current.currency).toBe('AUD');
    expect(useStatisticsBreakdownsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { accountIds: ['acc-1'] },
        by: 'exchange',
        enabled: true,
      })
    );
  });

  it('prefers the dashboard exchange when the account trades on it', () => {
    localStorage.setItem('selectedExchange', 'NASDAQ');

    const { result } = renderHook(() => useStatisticsExchanges('acc-1'));

    expect(result.current.selectedExchangeCode).toBe('NASDAQ');
    expect(result.current.currency).toBe('USD');
  });

  it('ignores a stored exchange the account does not trade on', () => {
    localStorage.setItem('selectedExchange', 'LSE');

    const { result } = renderHook(() => useStatisticsExchanges('acc-1'));

    expect(result.current.selectedExchangeCode).toBe('ASX');
  });

  it('switches exchange and resets the choice when the account changes', () => {
    const { result, rerender } = renderHook(
      ({ accountId }) => useStatisticsExchanges(accountId),
      { initialProps: { accountId: 'acc-1' } }
    );

    act(() => result.current.setSelectedExchangeCode('NASDAQ'));
    expect(result.current.selectedExchangeCode).toBe('NASDAQ');
    expect(result.current.currency).toBe('USD');

    rerender({ accountId: 'acc-2' });
    expect(result.current.selectedExchangeCode).toBe('ASX');
  });

  it('stays disabled without an account and has no selection', () => {
    useStatisticsBreakdownsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => useStatisticsExchanges(''));

    expect(result.current.selectedExchangeCode).toBe('');
    expect(result.current.currency).toBe('USD');
    expect(useStatisticsBreakdownsMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
  });
});
