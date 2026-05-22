import axios, { AxiosInstance } from 'axios';
import { MockAuthService, mockBalance, mockTransactions } from './mock-api';
import { exchanges } from './mock-portfolio';
import { getHoldingsForExchange } from './mock-holdings';
import type { ClosedTrade } from './closed-trades-store';
import type {
  AvailableExchange,
  EquityPoint,
  ExchangePortfolio,
  HoldingPosition,
  StockSearchResult,
} from './types';

// API client for your backend using Axios
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function unwrapArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data as T[];
  }
  return [];
}

function normalizeEquitySeries(payload: unknown): EquityPoint[] {
  if (!Array.isArray(payload)) return [];

  return payload
    .map(point => {
      if (!isRecord(point)) return null;

      const rawDate = point.date ?? point.timestamp ?? point.time;
      const rawEquity = point.equity ?? point.value ?? point.totalEquity;

      if (typeof rawDate !== 'string' || typeof rawEquity !== 'number') {
        return null;
      }

      return { date: rawDate, equity: rawEquity };
    })
    .filter((point): point is EquityPoint => point !== null);
}

function mapToAvailableExchange(row: unknown): AvailableExchange {
  if (!isRecord(row)) {
    return {
      id: 'unknown',
      code: 'UNKNOWN',
      name: 'Unknown Exchange',
    };
  }

  const count = isRecord(row._count) ? row._count.stocks : undefined;

  return {
    id:
      typeof row.id === 'string'
        ? row.id
        : String(row.code ?? row.name ?? 'unknown'),
    code:
      typeof row.code === 'string' ? row.code : String(row.name ?? 'UNKNOWN'),
    name:
      typeof row.name === 'string'
        ? row.name
        : String(row.code ?? 'Unknown Exchange'),
    countryName:
      typeof row.countryName === 'string' ? row.countryName : undefined,
    countryCode:
      typeof row.countryCode === 'string' ? row.countryCode : undefined,
    currency: typeof row.currency === 'string' ? row.currency : undefined,
    symbolSuffix:
      typeof row.symbolSuffix === 'string' ? row.symbolSuffix : undefined,
    delay: typeof row.delay === 'string' ? row.delay : undefined,
    stocksCount: typeof count === 'number' ? count : undefined,
  };
}

function mapToExchangePortfolio(row: unknown): ExchangePortfolio {
  if (!isRecord(row)) {
    return { name: 'Unknown Exchange', equitySeries: [] };
  }

  const nestedExchange = isRecord(row.exchange) ? row.exchange : null;
  const name =
    (typeof row.code === 'string' && row.code) ||
    (typeof row.name === 'string' && row.name) ||
    (typeof row.exchangeCode === 'string' && row.exchangeCode) ||
    (nestedExchange &&
      typeof nestedExchange.code === 'string' &&
      nestedExchange.code) ||
    (nestedExchange &&
      typeof nestedExchange.name === 'string' &&
      nestedExchange.name) ||
    'Unknown Exchange';

  const baseCurrency =
    (typeof row.baseCurrency === 'string' && row.baseCurrency) ||
    (typeof row.currency === 'string' && row.currency) ||
    (nestedExchange &&
      typeof nestedExchange.baseCurrency === 'string' &&
      nestedExchange.baseCurrency) ||
    undefined;

  const description =
    (typeof row.description === 'string' && row.description) ||
    (nestedExchange && typeof nestedExchange.name === 'string'
      ? nestedExchange.name
      : undefined);

  const rawSeries =
    row.equitySeries ??
    row.series ??
    (isRecord(row.equity) ? row.equity.series : undefined);

  const type = row.type;
  const normalizedType =
    type === 'crypto' || type === 'stocks' || type === 'mixed'
      ? type
      : undefined;

  return {
    name,
    equitySeries: normalizeEquitySeries(rawSeries),
    type: normalizedType,
    baseCurrency,
    description,
  };
}

function unwrapPortfolioRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.exchanges)) return payload.exchanges;

  if (!isRecord(payload.data)) return [];
  if (Array.isArray(payload.data.exchanges)) return payload.data.exchanges;
  if (Array.isArray(payload.data.portfolio)) return payload.data.portfolio;

  return [];
}

function mapPositionToHolding(pos: unknown): HoldingPosition | null {
  if (!isRecord(pos)) return null;
  const asset = isRecord(pos.asset) ? pos.asset : null;
  if (!asset) return null;

  const symbol = typeof asset.symbol === 'string' ? asset.symbol : null;
  if (!symbol) return null;

  const rawDate = pos.openDate;
  const openDate =
    typeof rawDate === 'string'
      ? rawDate.slice(0, 10)
      : rawDate instanceof Date
        ? (rawDate as Date).toISOString().slice(0, 10)
        : null;
  if (!openDate) return null;

  const entryPrice = Number(pos.entryPrice) || 0;
  const quantity = Number(pos.quantity) || 0;
  const buyFees = Number(pos.buyFees) || 0;
  const stopLoss = pos.stopLossPrice != null ? Number(pos.stopLossPrice) : 0;
  const unrealizedPnL =
    pos.unrealizedPnL != null ? Number(pos.unrealizedPnL) : null;
  const currentPrice =
    unrealizedPnL !== null && quantity > 0
      ? entryPrice + unrealizedPnL / quantity
      : entryPrice;

  return {
    id: typeof pos.id === 'string' ? pos.id : undefined,
    symbol,
    name: typeof asset.name === 'string' ? asset.name : symbol,
    openDate,
    units: quantity,
    buyPrice: entryPrice,
    buyFee: buyFees,
    stopLoss,
    industry:
      typeof asset.sector === 'string'
        ? asset.sector
        : typeof asset.industry === 'string'
          ? asset.industry
          : '',
    currentPrice,
  };
}

function mapPositionToClosedTrade(pos: unknown): ClosedTrade | null {
  if (!isRecord(pos)) return null;
  const asset = isRecord(pos.asset) ? pos.asset : null;
  if (!asset) return null;
  const symbol = typeof asset.symbol === 'string' ? asset.symbol : null;
  if (!symbol) return null;
  const exch = isRecord(asset.exchange) ? asset.exchange : null;

  const toDateStr = (v: unknown): string => {
    if (typeof v === 'string') return v.slice(0, 10);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return '';
  };

  const openDate = toDateStr(pos.openDate);
  const closeDate = toDateStr(pos.closeDate);
  if (!openDate || !closeDate) return null;

  const start = new Date(openDate).getTime();
  const end = new Date(closeDate).getTime();
  const periodDays =
    isNaN(start) || isNaN(end)
      ? 0
      : Math.max(0, Math.round((end - start) / 86400000));

  return {
    id: typeof pos.id === 'string' ? pos.id : `${symbol}-${openDate}`,
    symbol,
    name: typeof asset.name === 'string' ? asset.name : symbol,
    exchange: typeof exch?.code === 'string' ? exch.code : undefined,
    openDate,
    closeDate,
    unitsClosed: Number(pos.quantity) || 0,
    buyPrice: Number(pos.entryPrice) || 0,
    buyFee: Number(pos.buyFees) || 0,
    sellPrice: Number(pos.exitPrice) || 0,
    sellFee: Number(pos.sellFees) || 0,
    periodDays,
    sellComments: typeof pos.notes === 'string' ? pos.notes : undefined,
    baseCurrency: typeof exch?.currency === 'string' ? exch.currency : 'USD',
  };
}

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshQueue: Array<(token: string) => void> = [];

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for adding auth tokens
    this.client.interceptors.request.use(
      config => {
        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor — silently refresh the access token on 401
    this.client.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config as typeof error.config & {
          _retry?: boolean;
        };
        const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/');

        if (
          error.response?.status === 401 &&
          !isAuthEndpoint &&
          !originalRequest._retry
        ) {
          const storedRefresh = localStorage.getItem('refreshToken');

          if (!storedRefresh) {
            localStorage.removeItem('authToken');
            window.location.href = '/auth/login';
            return Promise.reject(error);
          }

          // If a refresh is already in flight, queue this request
          if (this.isRefreshing) {
            return new Promise<string>(resolve => {
              this.refreshQueue.push(resolve);
            }).then(newToken => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const { data } = await axios.post(`${baseURL}/auth/refresh`, {
              refreshToken: storedRefresh,
            });
            const { accessToken, refreshToken: newRefresh } = data.data ?? {};

            localStorage.setItem('authToken', accessToken);
            if (newRefresh) localStorage.setItem('refreshToken', newRefresh);

            this.client.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
            this.refreshQueue.forEach(resolve => resolve(accessToken));
            this.refreshQueue = [];

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.client(originalRequest);
          } catch {
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            this.refreshQueue = [];
            window.location.href = '/auth/login';
            return Promise.reject(error);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(email: string, password: string) {
    if (USE_MOCK_API) {
      return await MockAuthService.login(email, password);
    }
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async signup(name: string, email: string, password: string) {
    if (USE_MOCK_API) {
      return await MockAuthService.signup(name, email, password);
    }
    const response = await this.client.post('/auth/register', {
      name,
      email,
      password,
    });
    return response.data;
  }

  async forgotPassword(email: string) {
    if (USE_MOCK_API) {
      return await MockAuthService.forgotPassword(email);
    }
    const response = await this.client.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, password: string) {
    if (USE_MOCK_API) {
      return await MockAuthService.resetPassword(token, password);
    }
    const response = await this.client.post('/auth/reset-password', {
      token,
      password,
    });
    return response.data;
  }

  // Balance methods
  async getBalance() {
    if (USE_MOCK_API) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockBalance;
    }
    const response = await this.client.get<{
      total: number;
      thisMonth: number;
      expenses: number;
      savings: number;
    }>('/balance');
    return response.data;
  }

  // Transaction methods
  async getTransactions() {
    if (USE_MOCK_API) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 400));
      return mockTransactions;
    }
    const response = await this.client.get('/transactions');
    return response.data;
  }

  async createTransaction(transaction: {
    amount: number;
    description: string;
    categoryId: string;
    accountId: string;
    date: string;
  }) {
    const response = await this.client.post('/transactions', transaction);
    return response.data;
  }

  async updateTransaction(
    id: string,
    transaction: Partial<{
      amount: number;
      description: string;
      categoryId: string;
      accountId: string;
      date: string;
    }>
  ) {
    const response = await this.client.put(`/transactions/${id}`, transaction);
    return response.data;
  }

  async deleteTransaction(id: string) {
    const response = await this.client.delete(`/transactions/${id}`);
    return response.data;
  }

  // Category methods
  async getCategories() {
    const response = await this.client.get('/categories');
    return response.data;
  }

  async createCategory(category: {
    name: string;
    icon?: string;
    color?: string;
  }) {
    const response = await this.client.post('/categories', category);
    return response.data;
  }

  // Account methods
  async getAccounts() {
    const response = await this.client.get('/accounts');
    return response.data;
  }

  async createAccount(account: {
    name: string;
    type: string;
    balance: number;
  }) {
    const response = await this.client.post('/accounts', account);
    return response.data;
  }

  // Exchange catalog methods (available exchanges)
  async getAvailableExchanges(): Promise<AvailableExchange[]> {
    if (USE_MOCK_API) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return exchanges.map((exchange, index) => ({
        id: String(index + 1),
        code: exchange.name.toUpperCase(),
        name: exchange.name,
      }));
    }

    const response = await this.client.get('/exchanges');
    return unwrapArray<unknown>(response.data).map(mapToAvailableExchange);
  }

  // Backward-compatible alias for callers still using the old name.
  async getExchanges(): Promise<AvailableExchange[]> {
    return this.getAvailableExchanges();
  }

  // User portfolio methods (exchanges the user actually has)
  async getUserPortfolio(): Promise<ExchangePortfolio[]> {
    if (USE_MOCK_API) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return exchanges;
    }

    const response = await this.client.get('/positions', {
      params: { status: 'OPEN', limit: 100 },
    });

    const positions = unwrapArray<unknown>(response.data);
    const exchangeMap = new Map<
      string,
      { types: Set<string>; currency: string }
    >();

    for (const pos of positions) {
      if (!isRecord(pos)) continue;
      const asset = isRecord(pos.asset) ? pos.asset : null;
      if (!asset) continue;
      const exch = isRecord(asset.exchange) ? asset.exchange : null;
      if (!exch) continue;

      const code =
        (typeof exch.code === 'string' && exch.code) ||
        (typeof exch.name === 'string' && exch.name) ||
        null;
      if (!code) continue;

      if (!exchangeMap.has(code)) {
        const currency =
          typeof exch.currency === 'string' ? exch.currency : 'USD';
        exchangeMap.set(code, { types: new Set(), currency });
      }
      if (typeof asset.assetType === 'string') {
        exchangeMap.get(code)!.types.add(asset.assetType);
      }
    }

    return Array.from(exchangeMap.entries()).map(([code, meta]) => {
      const hasCrypto = meta.types.has('CRYPTO');
      const hasStocks = meta.types.has('EQUITY') || meta.types.has('ETF');
      const type: ExchangePortfolio['type'] =
        hasCrypto && hasStocks ? 'mixed' : hasCrypto ? 'crypto' : 'stocks';
      return {
        name: code,
        equitySeries: [],
        type,
        baseCurrency: meta.currency,
      };
    });
  }

  // Stock symbol search
  async searchStocks(q: string, limit = 10): Promise<StockSearchResult[]> {
    if (USE_MOCK_API) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const sym = q.trim().toUpperCase();
      return [
        {
          symbol: sym,
          name: `${sym} Corp`,
          exchange: 'NASDAQ',
          type: 'Equity',
          countryCode: 'US',
        },
      ];
    }
    const response = await this.client.get('/stocks/search', {
      params: { q: q.trim(), limit },
    });
    const payload = response.data;
    if (isRecord(payload) && Array.isArray(payload.data)) {
      return payload.data as StockSearchResult[];
    }
    return [];
  }

  // Holdings methods
  async getHoldings(exchangeName: string): Promise<HoldingPosition[]> {
    if (USE_MOCK_API) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return getHoldingsForExchange(exchangeName);
    }
    const response = await this.client.get('/positions', {
      params: { status: 'OPEN', exchangeCode: exchangeName, limit: 100 },
    });
    return unwrapArray<unknown>(response.data)
      .map(mapPositionToHolding)
      .filter((h): h is HoldingPosition => h !== null);
  }

  async getClosedPositions(): Promise<ClosedTrade[]> {
    const response = await this.client.get('/positions', {
      params: { status: 'CLOSED', limit: 100 },
    });
    return unwrapArray<unknown>(response.data)
      .map(mapPositionToClosedTrade)
      .filter((t): t is ClosedTrade => t !== null);
  }

  async closePosition(
    id: string,
    closeDate: string,
    exitPrice: number,
    quantity?: number,
    fees?: number,
    notes?: string
  ) {
    const response = await this.client.post(`/positions/${id}/close`, {
      closeDate,
      exitPrice,
      ...(quantity !== undefined && { quantity }),
      ...(fees !== undefined && { fees }),
      ...(notes ? { notes } : {}),
    });
    return response.data;
  }

  async deletePosition(id: string) {
    const response = await this.client.delete(`/positions/${id}`);
    return response.data;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
