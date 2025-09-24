import axios, { AxiosInstance } from 'axios';
import { MockAuthService, mockBalance, mockTransactions } from './mock-api';

// API client for your backend using Axios
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

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
}

export const apiClient = new ApiClient(API_BASE_URL);
