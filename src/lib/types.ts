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
  symbol: string;
  name: string;
  openDate: string; // ISO date string
  units: number;
  buyPrice: number;
  buyFee: number;
  stopLoss: number;
  industry: string;
  currentPrice: number;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  countryCode: string | null;
}
