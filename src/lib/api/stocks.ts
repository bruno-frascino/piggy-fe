import { AxiosInstance } from 'axios';
import type { QuoteResult, StockSearchResult } from '../types';
import { isRecord } from './mappers';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

export function createStocksApi(client: AxiosInstance) {
  return {
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
      const response = await client.get('/stocks/search', {
        params: { q: q.trim(), limit },
      });
      const payload = response.data;
      if (isRecord(payload) && Array.isArray(payload.data)) {
        return payload.data as StockSearchResult[];
      }
      return [];
    },

    async getQuotes(symbols: string[]): Promise<QuoteResult[]> {
      if (!symbols.length) return [];
      if (USE_MOCK_API) {
        // Not implemented in mock mode — holdings fall back to their stored
        // currentPrice when no live quote is available.
        return [];
      }
      const response = await client.get('/stocks/quotes', {
        params: { symbols: symbols.join(',') },
      });
      if (isRecord(response.data) && Array.isArray(response.data.data)) {
        return response.data.data as QuoteResult[];
      }
      return [];
    },
  };
}
