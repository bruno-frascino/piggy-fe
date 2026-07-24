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
  exchangeCode?: string;
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
  maxDrawdownPercent?: number; // Maximum percentage drop from entry price
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

export interface TradingAccount {
  id: string;
  name: string;
  status?: 'ACTIVE' | 'CLOSED';
  closedAt?: string | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  baseCurrency: string;
}

export interface UpdateUserProfilePayload {
  name?: string;
  baseCurrency?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface TaxReportLineItem {
  positionId: string;
  symbol: string;
  assetType: string;
  exchangeCode: string;
  currency: string;
  accountId: string;
  accountName: string;
  quantity: number;
  acquireDate: string;
  disposeDate: string;
  holdingDays: number;
  discountEligible: boolean;
  proceedsForeign: number;
  costBaseForeign: number;
  proceedsAud: number;
  costBaseAud: number;
  capitalGainAud: number;
  fxRateAcquire: number;
  fxRateAcquireSource: 'RBA' | 'YAHOO_FALLBACK';
  fxRateDispose: number;
  fxRateDisposeSource: 'RBA' | 'YAHOO_FALLBACK';
}

export interface TaxReport {
  id: string;
  financialYearStartYear: number;
  financialYearLabel: string;
  accountIds: string[];
  generatedAt: string;
  totalProceedsAud: number;
  totalCostBaseAud: number;
  totalCapitalGainGrossAud: number;
  totalCapitalLossAud: number;
  carriedForwardLossOpeningAud: number;
  discountAppliedAud: number;
  netCapitalGainAud: number;
  carriedForwardLossClosingAud: number;
  pdfSizeBytes: number;
  lineItems?: TaxReportLineItem[];
}
