import { AxiosInstance } from 'axios';
import type { TradingAccount } from '../types';
import { isRecord, mapToTradingAccount, unwrapArray } from './mappers';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

export function createAccountsApi(client: AxiosInstance) {
  const api = {
    async getTradingAccounts(includeClosed = false): Promise<TradingAccount[]> {
      if (USE_MOCK_API) {
        const mockAccount: TradingAccount = {
          id: 'mock-account-main',
          name: 'Main',
          status: 'ACTIVE',
          closedAt: null,
        };
        return includeClosed ? [mockAccount] : [mockAccount];
      }

      const response = await client.get('/accounts', {
        params: {
          includeClosed: includeClosed ? 'true' : 'false',
        },
      });
      return unwrapArray<unknown>(response.data)
        .map(mapToTradingAccount)
        .filter((a): a is TradingAccount => a !== null);
    },

    async getAccounts(): Promise<TradingAccount[]> {
      return api.getTradingAccounts(false);
    },

    async createAccount(account: {
      name: string;
    }): Promise<TradingAccount | null> {
      if (USE_MOCK_API) {
        return {
          id: `mock-account-${Date.now()}`,
          name: account.name,
          status: 'ACTIVE',
          closedAt: null,
        };
      }

      const response = await client.post('/accounts', {
        name: account.name,
      });
      const payload = isRecord(response.data)
        ? response.data.data
        : response.data;
      return mapToTradingAccount(payload);
    },

    async deleteAccount(accountId: string) {
      if (USE_MOCK_API) {
        return { success: true };
      }

      const response = await client.delete(`/accounts/${accountId}`);
      return response.data;
    },

    async closeAccount(accountId: string) {
      if (USE_MOCK_API) {
        return { success: true };
      }

      const response = await client.post(`/accounts/${accountId}/close`);
      return response.data;
    },

    async reopenAccount(accountId: string) {
      if (USE_MOCK_API) {
        return { success: true };
      }

      const response = await client.post(`/accounts/${accountId}/reopen`);
      return response.data;
    },

    async updateAccount(
      accountId: string,
      data: { name: string }
    ): Promise<TradingAccount | null> {
      if (USE_MOCK_API) {
        return {
          id: accountId,
          name: data.name,
          status: 'ACTIVE',
          closedAt: null,
        };
      }

      const response = await client.patch(`/accounts/${accountId}`, data);
      const payload = isRecord(response.data)
        ? response.data.data
        : response.data;
      return mapToTradingAccount(payload);
    },
  };

  return api;
}
