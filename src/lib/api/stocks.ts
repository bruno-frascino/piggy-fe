import { AxiosInstance } from 'axios';
import type {
  CryptoQuote,
  ExchangeSummary,
  KrakenMarket,
  QuoteResult,
  StockSearchResult,
} from '../types';
import { isRecord } from './mappers';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

function isExchange(value: unknown): value is ExchangeSummary {
  return (
    isRecord(value) &&
    typeof value.code === 'string' &&
    typeof value.name === 'string' &&
    typeof value.currency === 'string' &&
    typeof value.isCrypto === 'boolean'
  );
}

function isKrakenMarket(value: unknown): value is KrakenMarket {
  return (
    isRecord(value) &&
    typeof value.base === 'string' &&
    typeof value.name === 'string' &&
    (value.quote === 'AUD' || value.quote === 'USD') &&
    value.symbol === `${value.base}-${value.quote}` &&
    value.exchangeCode === (value.quote === 'AUD' ? 'KRAKEN' : 'KRAKEN_USD')
  );
}

export function createStocksApi(client: AxiosInstance) {
  return {
    async getExchanges(
      assetClass: 'crypto' | 'equity'
    ): Promise<ExchangeSummary[]> {
      if (USE_MOCK_API)
        throw new Error('Exchange selection is not available in mock mode.');
      const { data } = await client.get('/exchanges', {
        params: { assetClass },
      });
      if (
        !isRecord(data) ||
        !Array.isArray(data.data) ||
        !data.data.every(isExchange)
      )
        throw new Error('Unexpected exchanges response');
      return data.data;
    },

    async searchKrakenAssets(
      q: string,
      quote: CryptoQuote
    ): Promise<KrakenMarket[]> {
      if (USE_MOCK_API)
        throw new Error('Kraken search is not available in mock mode.');
      const { data } = await client.get('/exchanges/kraken/assets', {
        params: { q: q.trim(), quote },
      });
      if (
        !isRecord(data) ||
        !Array.isArray(data.data) ||
        !data.data.every(isKrakenMarket) ||
        !data.data.every(market => market.quote === quote)
      )
        throw new Error('Unexpected Kraken search response');
      return data.data;
    },

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
