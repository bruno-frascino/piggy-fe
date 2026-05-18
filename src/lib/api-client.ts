import axios, { AxiosInstance } from 'axios';
import { MockAuthService, mockBalance, mockTransactions } from './mock-api';
import { exchanges } from './mock-portfolio';
import { getHoldingsForExchange } from './mock-holdings';
import type {
  AvailableExchange,
  EquityPoint,
  ExchangePortfolio,
  HoldingPosition,
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

class ApiClient {
  private client: AxiosInstance;

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

    // Response interceptor for handling errors globally
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          localStorage.removeItem('authToken');
          window.location.href = '/auth/login';
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
    const response = await this.client.post('/auth/signup', {
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

    const endpoints = ['/portfolio/current', '/portfolio'];

    for (let i = 0; i < endpoints.length; i += 1) {
      try {
        const response = await this.client.get(endpoints[i]);
        const rows = unwrapPortfolioRows(response.data);
        return rows.map(mapToExchangePortfolio);
      } catch (error) {
        if (i === endpoints.length - 1) {
          throw error;
        }
      }
    }

    return [];
  }

  // Holdings methods
  async getHoldings(exchangeName: string): Promise<HoldingPosition[]> {
    if (USE_MOCK_API) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return getHoldingsForExchange(exchangeName);
    }
    const response = await this.client.get<HoldingPosition[]>(
      `/exchanges/${encodeURIComponent(exchangeName)}/holdings`
    );
    return response.data;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
