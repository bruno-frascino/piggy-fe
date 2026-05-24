export type ExchangeKey = string;

export interface EquityPoint {
  date: string; // ISO date
  equity: number;
}

export interface ExchangePortfolio {
  name: ExchangeKey;
  equitySeries: EquityPoint[];
  type?: 'crypto' | 'stocks' | 'mixed';
  baseCurrency?: string;
  description?: string;
}

export interface AvailableExchange {
  id: string;
  code: string;
  name: string;
  currency?: string;
  countryName?: string;
  countryCode?: string;
  symbolSuffix?: string;
  delay?: string;
  stocksCount?: number;
}

export interface HoldingPosition {
  id?: string; // backend position ID (present when loaded from API)
  accountId?: string;
  accountName?: string;
  symbol: string;
  name: string;
  openDate: string; // ISO date string
  units: number;
  buyPrice: number;
  buyFee: number;
  stopLoss: number;
  industry: string;
  currentPrice: number;
  buyComments?: string;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  countryCode: string | null;
}

export interface QuoteResult {
  symbol: string;
  price: number;
  change: number | null; // day change in base currency
  changePercent: number | null; // day change as a fraction (e.g. 0.015 = +1.5%)
  currency: string | null;
}
