// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockRouter } = vi.hoisted(() => ({ mockRouter: { replace: vi.fn() } }));
const searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => mockRouter,
  useSearchParams: () => searchParams,
}));

const portfolio = [
  { name: 'ASX', equitySeries: [] },
  { name: 'NASDAQ', equitySeries: [] },
];
const history: unknown[] = [];
const portfolioState = { fetched: false };

vi.mock('@/hooks/api', () => ({
  useUserPortfolio: () => ({
    data: portfolioState.fetched ? portfolio : undefined,
    isLoading: !portfolioState.fetched,
    isFetched: portfolioState.fetched,
  }),
  usePortfolioHistory: () => ({ data: history, isFetched: true }),
  useCreatePortfolioSnapshot: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { useExchangeDiscovery } from './useExchangeDiscovery';

function renderLoaded() {
  portfolioState.fetched = false;
  const utils = renderHook(() => useExchangeDiscovery('acc-1'));
  portfolioState.fetched = true;
  utils.rerender();
  return utils;
}

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('useExchangeDiscovery', () => {
  it('keeps the remembered exchange when exchanges are detected from holdings', async () => {
    localStorage.setItem('selectedExchange', 'NASDAQ');
    const { result } = renderLoaded();

    await waitFor(() => expect(result.current.selected).toBe('NASDAQ'));

    act(() => {
      result.current.handleExchangeDetected('NASDAQ');
      result.current.handleExchangeDetected('ASX');
    });

    expect(result.current.selected).toBe('NASDAQ');
  });

  it('adds and selects the exchange on an explicit selection', async () => {
    localStorage.setItem('selectedExchange', 'NASDAQ');
    const { result } = renderLoaded();
    await waitFor(() => expect(result.current.selected).toBe('NASDAQ'));

    act(() => result.current.handleExchangeSelected('LSE'));

    expect(result.current.selected).toBe('LSE');
    expect(result.current.exchangeList.map(e => e.name)).toContain('LSE');
  });
});
