import { AxiosInstance } from 'axios';
import type {
  SavedScreen,
  ScreenerFilters,
  ScreenerMode,
  ScreenerResult,
  UpcomingDividend,
} from '../types';
import { isRecord } from './mappers';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

export interface ScreenerResponse {
  mode: ScreenerMode;
  results: ScreenerResult[];
}

export function createScreenerApi(client: AxiosInstance) {
  return {
    async runScreener(filters: ScreenerFilters): Promise<ScreenerResponse> {
      if (USE_MOCK_API) {
        return { mode: filters.symbol ? 'symbol' : 'filter', results: [] };
      }

      const response = await client.get('/screener', {
        params: {
          symbol: filters.symbol,
          marketCapMin: filters.marketCapMin,
          marketCapMax: filters.marketCapMax,
          dividendMin: filters.dividendMin,
          dividendMax: filters.dividendMax,
          sector: filters.sector,
          industry: filters.industry,
          exchange: filters.exchange,
          limit: filters.limit,
          page: filters.page,
        },
      });
      const payload = response.data;
      if (isRecord(payload) && Array.isArray(payload.data)) {
        return {
          mode: payload.mode === 'symbol' ? 'symbol' : 'filter',
          results: payload.data as ScreenerResult[],
        };
      }
      return { mode: 'filter', results: [] };
    },

    async getUpcomingDividends(
      symbols: string[],
      from?: string,
      to?: string
    ): Promise<UpcomingDividend[]> {
      if (USE_MOCK_API) return [];

      const response = await client.get('/screener/upcoming-dividends', {
        params: {
          symbols: symbols.length ? symbols.join(',') : undefined,
          from,
          to,
        },
      });
      if (isRecord(response.data) && Array.isArray(response.data.data)) {
        return response.data.data as UpcomingDividend[];
      }
      return [];
    },

    async getSavedScreens(): Promise<SavedScreen[]> {
      if (USE_MOCK_API) return [];

      const response = await client.get('/screener/saved-screens');
      if (isRecord(response.data) && Array.isArray(response.data.data)) {
        return response.data.data as SavedScreen[];
      }
      return [];
    },

    async createSavedScreen(
      name: string,
      filters: ScreenerFilters
    ): Promise<SavedScreen | null> {
      if (USE_MOCK_API) {
        return { id: `mock-${Date.now()}`, name, filters };
      }

      const response = await client.post('/screener/saved-screens', {
        name,
        filters,
      });
      const payload = isRecord(response.data)
        ? response.data.data
        : response.data;
      return isRecord(payload) ? (payload as unknown as SavedScreen) : null;
    },

    async deleteSavedScreen(id: string) {
      if (USE_MOCK_API) return { success: true };
      const response = await client.delete(`/screener/saved-screens/${id}`);
      return response.data;
    },
  };
}
