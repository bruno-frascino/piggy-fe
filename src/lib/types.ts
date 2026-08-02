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

export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: unknown[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  baseCurrency: string;
  createdAt?: string;
  updatedAt?: string;
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

// A closed (or partially closed) position, sourced from the server via
// GET /positions/close-events (see useClosedPositions / apiClient.getClosedPositions).
// The server is the single source of truth for closed trades — there is no
// local cache or offline store for this data.
export interface ClosedTrade {
  id: string; // close event id (SELL transaction id)
  positionId?: string;
  accountId?: string;
  accountName?: string;
  symbol: string;
  name?: string;
  exchange?: string; // e.g., 'Binance'
  openDate: string; // ISO
  closeDate: string; // ISO
  unitsClosed: number;
  buyPrice: number;
  buyFee: number;
  sellPrice: number;
  sellFee: number;
  periodDays: number;
  buyComments?: string;
  sellComments?: string;
  baseCurrency?: string; // placeholder for future multi-currency support
  maxDrawdownPercent?: number; // worst intra-trade drawdown from entry price, in percent (positive number)
}

export interface StatisticsFilters {
  accountIds?: string[];
  exchangeCodes?: string[];
  assetTypes?: Array<'EQUITY' | 'ETF' | 'CRYPTO'>;
  status?: Array<'OPEN' | 'PARTIAL' | 'CLOSED'>;
  dateFrom?: string;
  dateTo?: string;
}

export interface StatisticsSummary {
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number | null;
  expectancyPerTrade: number;
  avgHoldingDays: number | null;
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  metricDefinitionVersion: string;
  asOf: string;
}

export interface StatisticsTimeSeriesPoint {
  bucketStart: string;
  bucketEnd: string;
  value: number;
}

export interface StatisticsTimeSeries {
  points: StatisticsTimeSeriesPoint[];
  currency: string;
  asOf: string;
}

export interface StatisticsHistogramBucket {
  min: number;
  max: number;
  count: number;
}

export interface StatisticsDistributions {
  returnPctHistogram: StatisticsHistogramBucket[];
  pnlHistogram: StatisticsHistogramBucket[];
  holdingDaysHistogram: StatisticsHistogramBucket[];
  sampleSize: number;
}

export interface StatisticsRisk {
  volatilityAnnualized: number | null;
  sharpeRatio: number | null;
  maxDrawdownPct: number | null;
  methodology: 'SNAPSHOT_RETURNS_V1';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  sampleSize: number;
  fallbackReason?: string;
}

export type StatisticsBreakdownBy =
  | 'account'
  | 'exchange'
  | 'assetType'
  | 'industry';

export type StatisticsBreakdownMetric =
  | 'marketValue'
  | 'realizedPnL'
  | 'totalPnL';

export interface StatisticsBreakdownRow {
  key: string;
  label: string;
  value: number;
  weight: number;
}

export interface StatisticsBreakdownsResponse {
  rows: StatisticsBreakdownRow[];
  total: number;
}

export interface StatisticsClosedTradeRow {
  id: string;
  positionId: string;
  symbol: string;
  accountId: string;
  exchangeCode: string;
  currency: string;
  openDate: string;
  closeDate: string;
  unitsClosed: number;
  pnl: number;
  returnPct: number;
  holdingDays: number;
}

export type StatisticsClosedTradesSortBy =
  | 'closeDate'
  | 'pnl'
  | 'returnPct'
  | 'holdingDays';

export type StatisticsClosedTradesSortDir = 'asc' | 'desc';

export interface StatisticsClosedTradesResponse {
  rows: StatisticsClosedTradeRow[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}
