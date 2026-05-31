// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

type InterceptorFulfilled = (value: any) => any;
type InterceptorRejected = (error: any) => any;

const axiosPostMock = vi.fn();
const axiosCreateMock = vi.fn();

let requestFulfilled: InterceptorFulfilled | undefined;
let responseRejected: InterceptorRejected | undefined;

const axiosClientMock = Object.assign(vi.fn(), {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  defaults: { headers: { common: {} as Record<string, string> } },
  interceptors: {
    request: {
      use: vi.fn((onFulfilled: InterceptorFulfilled) => {
        requestFulfilled = onFulfilled;
        return 0;
      }),
    },
    response: {
      use: vi.fn(
        (
          _onFulfilled: InterceptorFulfilled,
          onRejected: InterceptorRejected
        ) => {
          responseRejected = onRejected;
          return 0;
        }
      ),
    },
  },
});

vi.mock('axios', () => ({
  default: {
    create: axiosCreateMock,
    post: axiosPostMock,
  },
}));

async function loadClient() {
  vi.resetModules();
  requestFulfilled = undefined;
  responseRejected = undefined;
  axiosCreateMock.mockReturnValue(axiosClientMock);
  const mod = await import('./api-client');
  return mod.apiClient;
}

describe('api-client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('adds bearer token through request interceptor', async () => {
    await loadClient();
    localStorage.setItem('authToken', 'token-1');

    const config = { headers: {} as Record<string, string> };
    const result = requestFulfilled?.(config);

    expect(result.headers.Authorization).toBe('Bearer token-1');
  });

  it('refreshes token on 401 and retries original request', async () => {
    await loadClient();
    localStorage.setItem('refreshToken', 'refresh-1');

    axiosPostMock.mockResolvedValue({
      data: { data: { accessToken: 'access-2', refreshToken: 'refresh-2' } },
    });
    axiosClientMock.mockResolvedValueOnce({ data: { success: true } });

    const originalRequest = {
      url: '/positions',
      headers: {} as Record<string, string>,
      _retry: false,
    };

    const value = await responseRejected?.({
      response: { status: 401 },
      config: originalRequest,
    });

    expect(axiosPostMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/auth/refresh',
      { refreshToken: 'refresh-1' }
    );
    expect(localStorage.getItem('authToken')).toBe('access-2');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-2');
    expect(originalRequest.headers.Authorization).toBe('Bearer access-2');
    expect(axiosClientMock).toHaveBeenCalledWith(originalRequest);
    expect(value).toEqual({ data: { success: true } });
  });

  it('maps account endpoints consistently', async () => {
    const apiClient = await loadClient();

    axiosClientMock.get.mockResolvedValueOnce({
      data: {
        data: [
          { id: 'a1', name: 'Main' },
          { id: 123, name: 'Invalid' },
        ],
      },
    });
    axiosClientMock.post.mockResolvedValueOnce({
      data: {
        data: { id: 'a2', name: 'Growth' },
      },
    });

    const accounts = await apiClient.getTradingAccounts();
    const created = await apiClient.createAccount({ name: 'Growth' });

    expect(accounts).toEqual([{ id: 'a1', name: 'Main' }]);
    expect(created).toEqual({ id: 'a2', name: 'Growth' });
    expect(axiosClientMock.post).toHaveBeenCalledWith('/accounts', {
      name: 'Growth',
    });
  });

  it('normalizes user profile payloads', async () => {
    const apiClient = await loadClient();

    axiosClientMock.get.mockResolvedValueOnce({
      data: {
        data: {
          id: 'u1',
          email: 'a@example.com',
          name: 'Alice',
          baseCurrency: '',
        },
      },
    });
    axiosClientMock.patch.mockResolvedValueOnce({
      data: {
        data: {
          id: 'u1',
          email: 'a@example.com',
          name: 'Alice Smith',
          baseCurrency: 'AUD',
        },
      },
    });

    const current = await apiClient.getCurrentUser();
    const updated = await apiClient.updateCurrentUser({
      name: 'Alice Smith',
      baseCurrency: 'aud',
    });

    expect(current).toEqual({
      id: 'u1',
      email: 'a@example.com',
      name: 'Alice',
      baseCurrency: 'USD',
    });
    expect(updated?.baseCurrency).toBe('AUD');
  });

  it('maps holdings from positions endpoint', async () => {
    const apiClient = await loadClient();

    axiosClientMock.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'p1',
            openDate: '2026-05-01T10:00:00.000Z',
            entryPrice: 100,
            quantity: 5,
            buyFees: 10,
            stopLossPrice: 90,
            unrealizedPnL: 50,
            notes: 'Long-term',
            transactions: [
              { type: 'BUY', quantity: 5 },
              { type: 'SELL', quantity: 2 },
            ],
            account: { id: 'acc1', name: 'Main' },
            asset: {
              symbol: 'AAPL',
              name: 'Apple',
              sector: 'Tech',
              exchange: { code: 'NASDAQ' },
            },
          },
        ],
      },
    });

    const holdings = await apiClient.getHoldings('NASDAQ', 'acc1');

    expect(axiosClientMock.get).toHaveBeenCalledWith('/positions', {
      params: {
        status: 'OPEN,PARTIAL',
        limit: 100,
        exchangeCode: 'NASDAQ',
        accountId: 'acc1',
      },
    });
    expect(holdings).toHaveLength(1);
    expect(holdings[0]).toMatchObject({
      id: 'p1',
      symbol: 'AAPL',
      units: 3,
      buyPrice: 100,
      exchangeCode: 'NASDAQ',
      accountName: 'Main',
    });
  });

  it('maps close events to closed trades', async () => {
    const apiClient = await loadClient();

    axiosClientMock.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'ce1',
            date: '2026-05-10T00:00:00.000Z',
            quantity: 2,
            price: 120,
            fees: 1,
            notes: 'target reached',
            position: {
              id: 'p1',
              openDate: '2026-05-01T00:00:00.000Z',
              entryPrice: 100,
              buyFees: 4,
              transactions: [{ type: 'BUY', quantity: 4 }],
              asset: {
                symbol: 'AAPL',
                name: 'Apple',
                exchange: { code: 'NASDAQ', currency: 'USD' },
              },
            },
          },
        ],
      },
    });

    const closed = await apiClient.getClosedPositions();

    expect(closed).toHaveLength(1);
    expect(closed[0]).toMatchObject({
      id: 'ce1',
      symbol: 'AAPL',
      unitsClosed: 2,
      buyFee: 2,
      sellPrice: 120,
      baseCurrency: 'USD',
    });
  });

  it('normalizes payload when creating and updating positions', async () => {
    const apiClient = await loadClient();

    axiosClientMock.post.mockResolvedValueOnce({ data: { ok: true } });
    axiosClientMock.patch.mockResolvedValueOnce({ data: { ok: true } });

    await apiClient.createPosition({
      symbol: ' aapl ',
      exchangeCode: ' nasdaq ',
      accountId: 'acc1',
      accountName: ' Main ',
      openDate: '2026-05-01',
      entryPrice: 100,
      quantity: 2,
      buyFees: 1,
      assetName: ' Apple ',
      industry: ' Technology ',
      notes: ' Buy dip ',
    });

    await apiClient.updatePosition('p1', {
      symbol: ' tsla ',
      exchangeCode: ' nasdaq ',
      accountName: ' Growth ',
      entryPrice: 300,
      quantity: 1,
      buyFees: 2,
      assetName: ' Tesla ',
      industry: ' Auto ',
      notes: ' Trim ',
    });

    expect(axiosClientMock.post).toHaveBeenCalledWith('/positions', {
      symbol: 'AAPL',
      exchangeCode: 'NASDAQ',
      accountId: 'acc1',
      accountName: 'Main',
      assetName: 'Apple',
      industry: 'Technology',
      openDate: '2026-05-01',
      entryPrice: 100,
      quantity: 2,
      buyFees: 1,
      capitalAllocated: 201,
      openReason: 'Buy dip',
      notes: 'Buy dip',
    });
    expect(axiosClientMock.patch).toHaveBeenCalledWith('/positions/p1', {
      symbol: 'TSLA',
      exchangeCode: 'NASDAQ',
      accountName: 'Growth',
      entryPrice: 300,
      quantity: 1,
      buyFees: 2,
      assetName: 'Tesla',
      industry: 'Auto',
      notes: 'Trim',
    });
  });

  it('maps portfolio history and snapshot endpoints', async () => {
    const apiClient = await loadClient();

    axiosClientMock.get.mockResolvedValueOnce({
      data: {
        data: [
          { date: '2026-05-01T00:00:00.000Z', totalValue: 1000 },
          { date: 'bad', totalValue: 'x' },
        ],
      },
    });
    axiosClientMock.post.mockResolvedValueOnce({
      data: {
        data: {
          date: '2026-05-02T00:00:00.000Z',
          totalValue: 1200,
        },
      },
    });

    const history = await apiClient.getPortfolioHistory('acc1', 'NASDAQ');
    const snapshot = await apiClient.createPortfolioSnapshot('acc1', 'NASDAQ');

    expect(history).toEqual([{ date: '2026-05-01', equity: 1000 }]);
    expect(snapshot).toEqual({ date: '2026-05-02', equity: 1200 });
  });

  it('handles quote and stock search payload shape', async () => {
    const apiClient = await loadClient();

    axiosClientMock.get
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              symbol: 'AAPL',
              name: 'Apple',
              exchange: 'NASDAQ',
              type: 'Equity',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ symbol: 'AAPL', price: 190, change: 1.2 }],
        },
      });

    const stocks = await apiClient.searchStocks('AAPL', 5);
    const quotes = await apiClient.getQuotes(['AAPL']);

    expect(stocks).toHaveLength(1);
    expect(quotes).toEqual([{ symbol: 'AAPL', price: 190, change: 1.2 }]);
    expect(axiosClientMock.get).toHaveBeenNthCalledWith(1, '/stocks/search', {
      params: { q: 'AAPL', limit: 5 },
    });
    expect(axiosClientMock.get).toHaveBeenNthCalledWith(2, '/stocks/quotes', {
      params: { symbols: 'AAPL' },
    });
  });

  it('returns empty values when required query params are missing', async () => {
    const apiClient = await loadClient();

    expect(await apiClient.getQuotes([])).toEqual([]);
    expect(await apiClient.getPortfolioHistory(undefined, 'NASDAQ')).toEqual(
      []
    );
    expect(await apiClient.getPortfolioHistory('acc1', undefined)).toEqual([]);
    expect(
      await apiClient.createPortfolioSnapshot(undefined, 'NASDAQ')
    ).toBeNull();
    expect(
      await apiClient.createPortfolioSnapshot('acc1', undefined)
    ).toBeNull();
  });

  it('calls auth and close-event endpoints with expected payloads', async () => {
    const apiClient = await loadClient();

    axiosClientMock.post
      .mockResolvedValueOnce({ data: { success: true } })
      .mockResolvedValueOnce({ data: { success: true } })
      .mockResolvedValueOnce({ data: { success: true } })
      .mockResolvedValueOnce({ data: { success: true } })
      .mockResolvedValueOnce({ data: { success: true } })
      .mockResolvedValueOnce({ data: { success: true } });
    axiosClientMock.patch.mockResolvedValueOnce({ data: { success: true } });
    axiosClientMock.delete
      .mockResolvedValueOnce({ data: { success: true } })
      .mockResolvedValueOnce({ data: { success: true } });

    await apiClient.login('a@example.com', 'pass12345');
    await apiClient.signup('Alice', 'a@example.com', 'pass12345');
    await apiClient.forgotPassword('a@example.com');
    await apiClient.resetPassword('token-1', 'pass54321');
    await apiClient.logout('refresh-1');
    await apiClient.closePosition('p1', '2026-05-10', 120, 2, 1, 'done');
    await apiClient.updateCloseEvent('ce1', { exitPrice: 125 });
    await apiClient.deleteCloseEvent('ce1');
    await apiClient.deletePosition('p1');

    expect(axiosClientMock.post).toHaveBeenCalledWith('/auth/login', {
      email: 'a@example.com',
      password: 'pass12345',
    });
    expect(axiosClientMock.post).toHaveBeenCalledWith('/auth/register', {
      name: 'Alice',
      email: 'a@example.com',
      password: 'pass12345',
    });
    expect(axiosClientMock.post).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'a@example.com',
    });
    expect(axiosClientMock.post).toHaveBeenCalledWith('/auth/reset-password', {
      token: 'token-1',
      password: 'pass54321',
    });
    expect(axiosClientMock.post).toHaveBeenCalledWith('/auth/logout', {
      refreshToken: 'refresh-1',
    });
    expect(axiosClientMock.post).toHaveBeenCalledWith('/positions/p1/close', {
      closeDate: '2026-05-10',
      exitPrice: 120,
      quantity: 2,
      fees: 1,
      notes: 'done',
    });
    expect(axiosClientMock.patch).toHaveBeenCalledWith(
      '/positions/close-events/ce1',
      { exitPrice: 125 }
    );
    expect(axiosClientMock.delete).toHaveBeenCalledWith(
      '/positions/close-events/ce1'
    );
    expect(axiosClientMock.delete).toHaveBeenCalledWith('/positions/p1');
  });

  it('builds exchange portfolio series from open positions', async () => {
    const apiClient = await loadClient();

    axiosClientMock.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            openDate: '2026-05-01T00:00:00.000Z',
            capitalAllocated: 100,
            unrealizedPnL: 10,
            asset: {
              assetType: 'EQUITY',
              exchange: { code: 'NASDAQ', currency: 'USD' },
            },
          },
          {
            openDate: '2026-05-02T00:00:00.000Z',
            capitalAllocated: 50,
            unrealizedPnL: -5,
            asset: {
              assetType: 'CRYPTO',
              exchange: { code: 'NASDAQ', currency: 'USD' },
            },
          },
        ],
      },
    });

    const portfolio = await apiClient.getUserPortfolio('acc1');

    expect(axiosClientMock.get).toHaveBeenCalledWith('/positions', {
      params: {
        status: 'OPEN',
        limit: 100,
        accountId: 'acc1',
      },
    });
    expect(portfolio).toHaveLength(1);
    expect(portfolio[0]?.name).toBe('NASDAQ');
    expect(portfolio[0]?.type).toBe('mixed');
    expect(portfolio[0]?.baseCurrency).toBe('USD');
    expect((portfolio[0]?.equitySeries.length ?? 0) > 0).toBe(true);
  });
});
