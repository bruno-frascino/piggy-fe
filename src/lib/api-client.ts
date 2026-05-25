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
  QuoteResult,
  StockSearchResult,
  TradingAccount,
  UpdateUserProfilePayload,
  UserProfile,
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

function mapToTradingAccount(row: unknown): TradingAccount | null {
  if (!isRecord(row)) return null;

  const id = typeof row.id === 'string' ? row.id : null;
  const name = typeof row.name === 'string' ? row.name : null;

  if (!id || !name) return null;
  return { id, name };
}

function mapToUserProfile(row: unknown): UserProfile | null {
  if (!isRecord(row)) return null;

  const id = typeof row.id === 'string' ? row.id : null;
  const email = typeof row.email === 'string' ? row.email : null;
  const name = typeof row.name === 'string' ? row.name : null;
  const baseCurrency =
    typeof row.baseCurrency === 'string' && row.baseCurrency
      ? row.baseCurrency
      : 'USD';

  if (!id || !email || !name) return null;

  return {
    id,
    email,
    name,
    baseCurrency,
  };
}

function mapSnapshotToEquityPoint(row: unknown): EquityPoint | null {
  if (!isRecord(row)) return null;

  const rawDate = row.date;
  const rawValue = row.totalValue ?? row.equity ?? row.value;

  const date =
    typeof rawDate === 'string'
      ? rawDate.slice(0, 10)
      : rawDate instanceof Date
        ? rawDate.toISOString().slice(0, 10)
        : null;
  if (!date) return null;

  const equity = Number(rawValue);
  if (!Number.isFinite(equity)) return null;

  return { date, equity };
}

function aggregateMockPortfolioSeries(): EquityPoint[] {
  const dateTotals = new Map<string, number>();
  for (const exchange of exchanges) {
    for (const point of exchange.equitySeries) {
      dateTotals.set(
        point.date,
        (dateTotals.get(point.date) ?? 0) + point.equity
      );
    }
  }

  return Array.from(dateTotals.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, equity]) => ({
      date,
      equity: Number(equity.toFixed(2)),
    }));
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
  const account = isRecord(pos.account) ? pos.account : null;
  const exchange = asset && isRecord(asset.exchange) ? asset.exchange : null;
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
  const transactions = Array.isArray(pos.transactions) ? pos.transactions : [];
  const buyQty = transactions.reduce((sum, tx) => {
    if (!isRecord(tx) || tx.type !== 'BUY') return sum;
    return sum + (Number(tx.quantity) || 0);
  }, 0);
  const sellQty = transactions.reduce((sum, tx) => {
    if (!isRecord(tx) || tx.type !== 'SELL') return sum;
    return sum + (Number(tx.quantity) || 0);
  }, 0);
  const baseQty = buyQty > 0 ? buyQty : quantity;
  const remainingQty =
    baseQty > 0 ? Math.max(0, baseQty - sellQty) : Math.max(0, quantity);
  const effectiveQty = sellQty > 0 ? remainingQty : quantity;
  const effectiveBuyFee =
    baseQty > 0 ? buyFees * (effectiveQty / baseQty) : buyFees;
  const stopLoss = pos.stopLossPrice != null ? Number(pos.stopLossPrice) : 0;
  const unrealizedPnL =
    pos.unrealizedPnL != null ? Number(pos.unrealizedPnL) : null;
  const currentPrice =
    unrealizedPnL !== null && effectiveQty > 0
      ? entryPrice + unrealizedPnL / effectiveQty
      : entryPrice;

  return {
    id: typeof pos.id === 'string' ? pos.id : undefined,
    accountId: typeof account?.id === 'string' ? account.id : undefined,
    accountName:
      typeof account?.name === 'string' && account.name
        ? account.name
        : undefined,
    exchangeCode:
      typeof exchange?.code === 'string' && exchange.code
        ? exchange.code
        : typeof exchange?.name === 'string' && exchange.name
          ? exchange.name
          : undefined,
    symbol,
    name: typeof asset.name === 'string' ? asset.name : symbol,
    openDate,
    units: effectiveQty,
    buyPrice: entryPrice,
    buyFee: Number(effectiveBuyFee.toFixed(6)),
    stopLoss,
    industry:
      typeof asset.sector === 'string'
        ? asset.sector
        : typeof asset.industry === 'string'
          ? asset.industry
          : '',
    currentPrice,
    buyComments: typeof pos.notes === 'string' ? pos.notes : undefined,
  };
}

function toDateStr(v: unknown): string {
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return '';
}

function mapCloseEventToClosedTrade(event: unknown): ClosedTrade | null {
  if (!isRecord(event)) return null;

  const eventId = typeof event.id === 'string' ? event.id : null;
  if (!eventId) return null;

  const position = isRecord(event.position) ? event.position : null;
  if (!position) return null;

  const asset = isRecord(position.asset) ? position.asset : null;
  if (!asset) return null;
  const exch = isRecord(asset.exchange) ? asset.exchange : null;

  const symbol = typeof asset.symbol === 'string' ? asset.symbol : null;
  if (!symbol) return null;

  const openDate = toDateStr(position.openDate);
  const closeDate = toDateStr(event.date);
  if (!openDate || !closeDate) return null;

  const soldQty = Number(event.quantity) || 0;
  if (!Number.isFinite(soldQty) || soldQty <= 0) return null;

  const transactions = Array.isArray(position.transactions)
    ? position.transactions
    : [];
  const buyQty = transactions.reduce((sum, tx) => {
    if (!isRecord(tx) || tx.type !== 'BUY') return sum;
    return sum + (Number(tx.quantity) || 0);
  }, 0);

  const totalBuyFees = Number(position.buyFees) || 0;
  const proratedBuyFee =
    buyQty > 0 ? totalBuyFees * (soldQty / buyQty) : totalBuyFees;

  const start = new Date(openDate).getTime();
  const end = new Date(closeDate).getTime();
  const periodDays =
    isNaN(start) || isNaN(end)
      ? 0
      : Math.max(0, Math.round((end - start) / 86400000));

  return {
    id: eventId,
    positionId: typeof position.id === 'string' ? position.id : undefined,
    symbol,
    name: typeof asset.name === 'string' ? asset.name : symbol,
    exchange: typeof exch?.code === 'string' ? exch.code : undefined,
    openDate,
    closeDate,
    unitsClosed: Number(soldQty.toFixed(6)),
    buyPrice: Number(position.entryPrice) || 0,
    buyFee: Number(proratedBuyFee.toFixed(6)),
    sellPrice: Number(event.price) || 0,
    sellFee: Number(event.fees) || 0,
    periodDays,
    buyComments:
      typeof position.openReason === 'string' ? position.openReason : undefined,
    sellComments:
      typeof event.notes === 'string'
        ? event.notes
        : typeof position.notes === 'string'
          ? position.notes
          : undefined,
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
  async getAccounts(): Promise<TradingAccount[]> {
    return this.getTradingAccounts();
  }

  async createAccount(account: {
    name: string;
  }): Promise<TradingAccount | null> {
    const response = await this.client.post('/accounts', {
      name: account.name,
    });
    const payload = isRecord(response.data)
      ? response.data.data
      : response.data;
    return mapToTradingAccount(payload);
  }

  async getTradingAccounts(): Promise<TradingAccount[]> {
    const response = await this.client.get('/accounts');
    return unwrapArray<unknown>(response.data)
      .map(mapToTradingAccount)
      .filter((a): a is TradingAccount => a !== null);
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    if (USE_MOCK_API) {
      const mockUser = {
        id: 'mock-user-1',
        name: 'Mock User',
        email: 'mock@example.com',
        baseCurrency: 'USD',
      };
      return mockUser;
    }

    const response = await this.client.get('/users/me');
    const payload = isRecord(response.data)
      ? response.data.data
      : response.data;
    return mapToUserProfile(payload);
  }

  async updateCurrentUser(
    payload: UpdateUserProfilePayload
  ): Promise<UserProfile | null> {
    if (USE_MOCK_API) {
      const next = {
        id: 'mock-user-1',
        name: payload.name ?? 'Mock User',
        email: 'mock@example.com',
        baseCurrency: payload.baseCurrency?.toUpperCase() ?? 'USD',
      };
      return next;
    }

    const response = await this.client.patch('/users/me', payload);
    const data = isRecord(response.data) ? response.data.data : response.data;
    return mapToUserProfile(data);
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
  async getUserPortfolio(accountId?: string): Promise<ExchangePortfolio[]> {
    if (USE_MOCK_API) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return exchanges;
    }

    const response = await this.client.get('/positions', {
      params: {
        status: 'OPEN',
        limit: 100,
        ...(accountId ? { accountId } : {}),
      },
    });

    const positions = unwrapArray<unknown>(response.data);
    const exchangeMap = new Map<
      string,
      {
        types: Set<string>;
        currency: string;
        points: Map<string, number>;
        totalCurrent: number;
      }
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
        exchangeMap.set(code, {
          types: new Set(),
          currency,
          points: new Map<string, number>(),
          totalCurrent: 0,
        });
      }

      const entry = exchangeMap.get(code)!;

      if (typeof asset.assetType === 'string') {
        entry.types.add(asset.assetType);
      }

      const rawOpenDate = pos.openDate;
      const openDate =
        typeof rawOpenDate === 'string'
          ? rawOpenDate.slice(0, 10)
          : rawOpenDate instanceof Date
            ? rawOpenDate.toISOString().slice(0, 10)
            : null;

      const invested = Number(pos.capitalAllocated) || 0;
      const unrealized = Number(pos.unrealizedPnL) || 0;
      const currentValue = invested + unrealized;

      if (openDate) {
        entry.points.set(
          openDate,
          (entry.points.get(openDate) ?? 0) + invested
        );
      }
      entry.totalCurrent += currentValue;
    }

    return Array.from(exchangeMap.entries()).map(([code, meta]) => {
      const hasCrypto = meta.types.has('CRYPTO');
      const hasStocks = meta.types.has('EQUITY') || meta.types.has('ETF');
      const type: ExchangePortfolio['type'] =
        hasCrypto && hasStocks ? 'mixed' : hasCrypto ? 'crypto' : 'stocks';

      const sortedDates = Array.from(meta.points.keys()).sort((a, b) =>
        a.localeCompare(b)
      );
      let running = 0;
      const equitySeries: EquityPoint[] = sortedDates.map(date => {
        running += meta.points.get(date) ?? 0;
        return {
          date,
          equity: Number(running.toFixed(2)),
        };
      });

      const today = new Date().toISOString().slice(0, 10);
      const currentPoint = {
        date: today,
        equity: Number(meta.totalCurrent.toFixed(2)),
      };
      if (
        equitySeries.length &&
        equitySeries[equitySeries.length - 1].date === today
      ) {
        equitySeries[equitySeries.length - 1] = currentPoint;
      } else {
        equitySeries.push(currentPoint);
      }

      return {
        name: code,
        equitySeries,
        type,
        baseCurrency: meta.currency,
      };
    });
  }

  async getPortfolioHistory(
    accountId?: string,
    exchangeCode?: string
  ): Promise<EquityPoint[]> {
    if (USE_MOCK_API) {
      await new Promise(resolve => setTimeout(resolve, 250));
      return aggregateMockPortfolioSeries();
    }

    if (!accountId || !exchangeCode) {
      return [];
    }

    const response = await this.client.get('/portfolio/history', {
      params: { accountId, exchangeCode },
    });
    return unwrapArray<unknown>(response.data)
      .map(mapSnapshotToEquityPoint)
      .filter((p): p is EquityPoint => p !== null);
  }

  async createPortfolioSnapshot(
    accountId?: string,
    exchangeCode?: string
  ): Promise<EquityPoint | null> {
    if (USE_MOCK_API) {
      // In mock mode the series is generated in-memory.
      return null;
    }

    if (!accountId || !exchangeCode) {
      return null;
    }

    const response = await this.client.post('/portfolio/snapshot', {
      accountId,
      exchangeCode,
    });
    return mapSnapshotToEquityPoint(
      isRecord(response.data) ? response.data.data : null
    );
  }

  async createPosition(payload: {
    symbol: string;
    exchangeCode: string;
    accountId?: string;
    accountName?: string;
    openDate: string;
    entryPrice: number;
    quantity: number;
    buyFees?: number;
    assetName?: string;
    industry?: string;
    notes?: string;
  }): Promise<void> {
    const quantity = Number(payload.quantity) || 0;
    const entryPrice = Number(payload.entryPrice) || 0;
    const buyFees = Number(payload.buyFees) || 0;

    await this.client.post('/positions', {
      symbol: payload.symbol.trim().toUpperCase(),
      exchangeCode: payload.exchangeCode.trim().toUpperCase(),
      accountId: payload.accountId,
      accountName: payload.accountName?.trim() || undefined,
      assetName: payload.assetName?.trim() || undefined,
      industry: payload.industry?.trim() || undefined,
      openDate: payload.openDate,
      entryPrice,
      quantity,
      buyFees,
      capitalAllocated: entryPrice * quantity + buyFees,
      openReason: payload.notes?.trim() || 'Opened from dashboard',
      notes: payload.notes?.trim() || undefined,
    });
  }

  async updatePosition(
    id: string,
    payload: {
      symbol?: string;
      exchangeCode?: string;
      accountId?: string;
      accountName?: string;
      openDate?: string;
      entryPrice?: number;
      quantity?: number;
      buyFees?: number;
      assetName?: string;
      industry?: string;
      stopLossPrice?: number | null;
      takeProfitPrice?: number | null;
      notes?: string;
    }
  ) {
    const response = await this.client.patch(`/positions/${id}`, {
      ...payload,
      symbol: payload.symbol?.trim().toUpperCase(),
      exchangeCode: payload.exchangeCode?.trim().toUpperCase(),
      accountName: payload.accountName?.trim() || undefined,
      assetName: payload.assetName?.trim() || undefined,
      industry: payload.industry?.trim() || undefined,
      notes: payload.notes?.trim() || undefined,
      quantity:
        payload.quantity !== undefined ? Number(payload.quantity) : undefined,
      entryPrice:
        payload.entryPrice !== undefined
          ? Number(payload.entryPrice)
          : undefined,
      buyFees:
        payload.buyFees !== undefined ? Number(payload.buyFees) : undefined,
    });
    return response.data;
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

  async getQuotes(symbols: string[]): Promise<QuoteResult[]> {
    if (!symbols.length) return [];
    const response = await this.client.get('/stocks/quotes', {
      params: { symbols: symbols.join(',') },
    });
    if (isRecord(response.data) && Array.isArray(response.data.data)) {
      return response.data.data as QuoteResult[];
    }
    return [];
  }

  // Holdings methods
  async getHoldings(
    exchangeName?: string,
    accountId?: string
  ): Promise<HoldingPosition[]> {
    if (USE_MOCK_API) {
      await new Promise(resolve => setTimeout(resolve, 300));
      if (exchangeName) {
        return getHoldingsForExchange(exchangeName);
      }

      return exchanges.flatMap(exchange =>
        getHoldingsForExchange(exchange.name)
      );
    }
    const response = await this.client.get('/positions', {
      params: {
        status: 'OPEN,PARTIAL',
        limit: 100,
        ...(exchangeName ? { exchangeCode: exchangeName } : {}),
        ...(accountId ? { accountId } : {}),
      },
    });
    return unwrapArray<unknown>(response.data)
      .map(mapPositionToHolding)
      .filter((h): h is HoldingPosition => h !== null);
  }

  async getClosedPositions(): Promise<ClosedTrade[]> {
    const response = await this.client.get('/positions/close-events');
    return unwrapArray<unknown>(response.data)
      .map(mapCloseEventToClosedTrade)
      .filter((t): t is ClosedTrade => t !== null);
  }

  async updateCloseEvent(
    id: string,
    data: {
      closeDate?: string;
      exitPrice?: number;
      sellFees?: number;
      notes?: string;
    }
  ) {
    const response = await this.client.patch(
      `/positions/close-events/${id}`,
      data
    );
    return response.data;
  }

  async deleteCloseEvent(id: string) {
    const response = await this.client.delete(`/positions/close-events/${id}`);
    return response.data;
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

  async updateClosedPosition(
    id: string,
    data: {
      closeDate?: string;
      exitPrice?: number;
      sellFees?: number;
      notes?: string;
      tradeGrade?: string;
      lessonsLearned?: string;
    }
  ) {
    const response = await this.client.patch(
      `/positions/${id}/closed-trade`,
      data
    );
    return response.data;
  }

  async deletePosition(id: string) {
    const response = await this.client.delete(`/positions/${id}`);
    return response.data;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
