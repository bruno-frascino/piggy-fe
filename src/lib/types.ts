export type ExchangeKey = string;
export type AssetType = 'EQUITY' | 'ETF' | 'CRYPTO';
export type CryptoQuote = 'AUD' | 'USD';

export interface KrakenMarket {
  base: string;
  name: string;
  quote: CryptoQuote;
  symbol: string;
  exchangeCode: string;
}

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

export type PositionOrigin = 'MANUAL' | 'IMPORT_TRADE' | 'STAKING_REWARD';

/** Row returned by GET /api/exchanges. */
export interface ExchangeSummary {
  code: string;
  name: string;
  currency: string;
  isCrypto: boolean;
}

export interface HoldingPosition {
  assetType?: AssetType;
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
  stopLoss?: number; // undefined = no stop loss set
  industry: string;
  currentPrice: number;
  buyComments?: string;
  maxDrawdownPercent?: number; // Maximum percentage drop from entry price
  maxRunUpPercent?: number; // Peak percentage gain above entry price
  stopLossHitAt?: string; // ISO timestamp; set once the stop loss was reached, even if price recovered
  origin?: PositionOrigin;
  externalRef?: string; // source order/month key for imported parcels; '' for manual
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
  /** Immutable practice-account flag (excluded from tax reports and "All accounts" aggregates). */
  isDemo?: boolean;
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
  // Reports are append-only: regenerating supersedes the previous revision
  // rather than overwriting it, so an already-lodged PDF stays downloadable.
  version: number;
  supersededAt: string | null;
  isCurrent: boolean;
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

// Mirrors the backend `CloseReason` enum; absent = unknown (closed before it was tracked).
export type CloseReason = 'STOP_LOSS' | 'TARGET' | 'MANUAL' | 'OTHER';

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
  closeReason?: CloseReason;
  baseCurrency?: string; // placeholder for future multi-currency support
  maxDrawdownPercent?: number; // worst intra-trade drawdown from entry price, in percent (positive number)
  maxRunUpPercent?: number; // best intra-trade peak gain above entry price, in percent (positive number)
}

// Server-side scope for GET /positions/close-events. The close-date range bounds
// the payload; account/exchange slicing stays client-side over the returned page.
export interface ClosedTradesQuery {
  accountId?: string; // omit for "All accounts" (server excludes demo accounts)
  dateFrom?: string; // YYYY-MM-DD, inclusive
  dateTo?: string; // YYYY-MM-DD, inclusive
  limit?: number;
  offset?: number;
}

export interface ClosedTradesPage {
  trades: ClosedTrade[];
  total: number; // matching rows on the server, may exceed trades.length
}

// GET /tax-reports/position-usage — which generated reports already include a
// position, and whether that parcel changed after the report was generated.
export interface TaxReportUsage {
  reportId: string;
  financialYearLabel: string;
  generatedAt: string;
  stale: boolean;
}

export type TaxReportPositionUsage = Record<string, TaxReportUsage[]>;

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
  currency?: string; // ISO 4217 code; only set for `by=exchange` rows
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

// Screener & Watchlists — see piggy-api's context/api-surface.md for /screener, /watchlists

export interface ScreenerResult {
  symbol: string;
  name: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  price: number | null;
  lastAnnualDividend: number | null;
  isEtf: boolean;
  country: string | null;
  alreadyTracked: boolean;
  inWatchlist: boolean;
}

export type ScreenerMode = 'symbol' | 'filter';

export interface ScreenerFilters {
  symbol?: string;
  marketCapMin?: number;
  marketCapMax?: number;
  dividendMin?: number;
  dividendMax?: number;
  sector?: string;
  industry?: string;
  exchange?: string;
  limit?: number;
  page?: number;
}

export interface UpcomingDividend {
  symbol: string;
  exDate: string;
  paymentDate: string | null;
  dividend: number;
  yield: number | null;
  frequency: string | null;
}

export interface SavedScreen {
  id: string;
  name: string;
  filters: ScreenerFilters;
  createdAt?: string;
  updatedAt?: string;
}

export interface Watchlist {
  id: string;
  name: string;
  itemCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  assetType: string;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  addedAt?: string;
}

export interface WatchlistDetail extends Watchlist {
  items: WatchlistItem[];
}

export interface AddWatchlistItemPayload {
  symbol: string;
  exchangeCode: string;
  name?: string;
  assetType?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
}

// ─── Exchange imports (mirrors piggy-api src/lib/imports/types.ts) ──────────

export type ImportSource = 'KRAKEN';
export type ImportBatchStatus =
  | 'PENDING_REVIEW'
  | 'PARTIALLY_APPLIED'
  | 'COMMITTED'
  | 'DISCARDED'
  | 'FAILED';
export type ImportedEventStatus =
  | 'PENDING'
  | 'DEFERRED'
  | 'APPLIED'
  | 'SKIPPED'
  | 'DUPLICATE';
export type ImportQuoteCurrency = 'AUD' | 'USD';

export interface ImportBatch {
  id: string;
  accountId: string;
  source: ImportSource;
  method: 'CSV' | 'API';
  status: ImportBatchStatus;
  fileNames: string[];
  warnings: string[];
  createdAt: string;
  committedAt: string | null;
  eventCounts?: Partial<Record<ImportedEventStatus, number>>;
}

export interface ImportFilePayload {
  kind: 'trades' | 'ledgers';
  fileName: string;
  content: string;
}

export interface ImportPlannedParcel {
  ref: string;
  origin: 'IMPORT_TRADE' | 'STAKING_REWARD';
  externalRef: string;
  symbol: string;
  baseAsset: string;
  quoteCurrency: ImportQuoteCurrency;
  exchangeCode: string;
  openDate: string;
  quantity: string;
  entryPrice: string;
  totalBuyValue: string;
  buyFees: string;
  notes: string;
}

export interface ImportPlannedAllocation {
  positionRef: string;
  quantity: string;
  price: string;
  totalValue: string;
  fees: string;
  notes: string | null;
}

export interface ImportEligibleParcel {
  positionRef: string;
  remaining: string;
  acquiredAt: string;
  currency: string;
}

export type ImportCloseReason = CloseReason;

export interface ImportPlannedSell {
  eventId: string;
  externalId: string;
  occurredAt: string;
  sellDate: string;
  baseAsset: string;
  quoteCurrency: ImportQuoteCurrency;
  quantity: string;
  orderType: string | null;
  closeReason: ImportCloseReason | null;
  allocations: ImportPlannedAllocation[];
  userOverridden: boolean;
  dustIgnored: string | null;
  resolved: boolean;
  eligible: ImportEligibleParcel[];
}

export interface ImportStakingMonth {
  key: string;
  baseAsset: string;
  month: string;
  eventIds: string[];
  quantity: string;
  fmvAud: string;
  status: 'APPLY' | 'DUST' | 'DEFERRED' | 'BLOCKED';
}

export type ImportIssueType =
  | 'INSUFFICIENT_HOLDINGS'
  | 'DUST_SHORTFALL'
  | 'INVALID_ALLOCATION'
  | 'MISSING_FMV'
  | 'MISSING_FX';

export interface ImportPlanIssue {
  type: ImportIssueType;
  blocking: boolean;
  eventId: string;
  externalId: string;
  message: string;
}

export interface ImportReconciliation {
  reconciled: boolean;
  rows: Array<{
    asset: string;
    expected: string;
    simulated: string;
    difference: string;
  }>;
}

export interface ImportPlan {
  newPositions: ImportPlannedParcel[];
  sells: ImportPlannedSell[];
  staking: ImportStakingMonth[];
  unsupported: Array<{ eventId: string; externalId: string; reason: string }>;
  skipped: Array<{ eventId: string; externalId: string; reason: string }>;
  issues: ImportPlanIssue[];
  reconciliation: ImportReconciliation | null;
  summary: {
    buys: number;
    sells: number;
    stakingMonthsApplied: number;
    stakingMonthsDust: number;
    stakingMonthsDeferred: number;
    dustTotalAud: string;
    unsupported: number;
    skipped: number;
    blockingIssues: number;
  };
}

export interface ImportDetail {
  batch: ImportBatch;
  plan: ImportPlan;
  eventCounts: Partial<Record<ImportedEventStatus, number>>;
}

export interface ImportUploadResult {
  /** null when no new events need storing; existing events may still need review. */
  batch: ImportBatch | null;
  plan: ImportPlan | null;
  duplicates: number;
  warnings: string[];
  existingBatches: Array<{
    id: string;
    accountId: string;
    accountName: string;
    status: ImportBatchStatus;
    eventCount: number;
  }>;
}

export interface ImportEventResolution {
  skip?: boolean;
  /** null clears an override and restores the FIFO suggestion. */
  allocations?: Array<{ positionRef: string; quantity: string }> | null;
  closeReason?: ImportCloseReason | null;
  fmvAud?: string;
}

export interface ImportCommitResult {
  createdPositionIds: string[];
  appliedEvents: number;
}
export interface OpeningPreviewInput {
  openingDate: string;
  cashBalances: { currency: string; amount: string }[];
}

export interface OpeningStatement {
  id: string;
  accountId: string;
  version: number;
  openingDate: string;
  timezone: 'Australia/Sydney';
  state: 'DRAFT';
  sourceFingerprint: string;
  createdAt: string;
  cashBalances: { currency: string; amount: string }[];
  parcelCount: number;
}

export interface OpeningStatementPage {
  statements: OpeningStatement[];
  nextBeforeVersion: number | null;
}

export interface SaveOpeningStatementInput extends OpeningPreviewInput {
  sourceFingerprint: string;
}

export interface SaveOpeningStatementResult {
  statement: OpeningStatement;
  created: boolean;
}

export type DraftCashEvidenceReason =
  | 'UNRECORDED_OPERATION'
  | 'TIMING_DIFFERENCE'
  | 'SOURCE_CORRECTION_REQUIRED'
  | 'OTHER';

export interface DraftCashEvidenceInput {
  idempotencyKey: string;
  asOfDate: string;
  source: string;
  reference: string;
  attested: true;
  cashBalances: { currency: string; amount: string }[];
  decisions: {
    currency: string;
    reason: DraftCashEvidenceReason;
    note: string;
  }[];
}

export interface DraftCashFlowInput {
  idempotencyKey: string;
  effectiveDate: string;
  sequence: number;
  kind: 'DEPOSIT' | 'WITHDRAWAL';
  currency: string;
  amount: string;
  sourceReference: string;
}

export interface DraftCashFlowResult {
  operationId: string;
  state: 'DRAFT';
  created: boolean;
  replay: DraftCashReplay;
}

export interface DraftCashReplay {
  accountId: string;
  openingDate: string;
  funded: boolean;
  balances: {
    currency: string;
    openingAmount: string;
    endingAmount: string;
    minimumAmount: string;
    netExternalContribution: string;
  }[];
  activity: {
    idempotencyKey: string;
    effectiveDate: string;
    sequence: number;
    kind: string;
    changes: { currency: string; amount: string; balanceAfter: string }[];
  }[];
  fundingIssues: {
    currency: string;
    idempotencyKey: string;
    effectiveDate: string;
    sequence: number;
    balance: string;
  }[];
}

export interface DraftCashEvidenceComparison {
  matchesReplay: boolean;
  variances: {
    currency: string;
    expectedAmount: string;
    statementAmount: string;
    difference: string;
  }[];
  decisions: DraftCashEvidenceInput['decisions'];
}

export interface DraftCashEvidenceRecord {
  id: string;
  asOfDate: string;
  source: string;
  reference: string;
  attested: boolean;
  recordedAt: string;
  statementBalances: DraftCashEvidenceInput['cashBalances'];
  decisions: DraftCashEvidenceInput['decisions'];
  currentComparison: DraftCashEvidenceComparison;
  fundedAtEvidenceDate: boolean;
}

export interface DraftOpeningReconciliation {
  mode: 'RECONCILIATION_ONLY';
  state: 'DRAFT';
  accountingActive: false;
  activationReady: false;
  statementId: string;
  accountId: string;
  openingDate: string;
  asOfDate: string;
  source: {
    reviewedAsOfDate: string;
    savedFingerprint: string;
    currentFingerprint: string;
    changed: boolean;
  };
  cash: DraftCashReplay & { verification: 'UNVERIFIED' };
  cashOperations: {
    operationId: string;
    idempotencyKey: string;
    kind: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL';
    effectiveDate: string;
    sequence: number;
    sourceOrigin: 'MANUAL' | 'IMPORT';
    sourceReference: string;
    status: 'EFFECTIVE' | 'CORRECTED' | 'REVERSED';
  }[];
  cashEvidence: DraftCashEvidenceRecord[];
  inventory: {
    positionId: string;
    openingParcelKey: string | null;
    openingQuantity: string | null;
    liveOpeningQuantity: string | null;
    openingDifference: string | null;
    proposedRemaining: string | null;
    liveExpectedRemaining: string | null;
    liveRecordedRemaining: string | null;
    scenarioDifference: string | null;
  }[];
  proposedParcels: {
    parcelKey: string;
    assetId: string | null;
    positionId?: string;
    symbol?: string;
    currency: string;
    acquired: string;
    remaining: string;
  }[];
  tradeSources: {
    transactionId: string;
    positionId: string;
    kind: string;
    effectiveDate: string;
    quantity: string;
    operationId: string | null;
    linkage: 'LINKED' | 'UNLINKED' | 'REVERSED';
    potentialOverlapOperationIds: string[];
  }[];
  excludedLinkedSources: {
    transactionId: string;
    operationId: string;
    reason:
      | 'MISSING_SOURCE'
      | 'ON_OR_BEFORE_BOUNDARY'
      | 'AFTER_OBSERVATION_DATE';
  }[];
  previewIssues: OpeningPreview['issues'];
  reviewReasons: string[];
}

export interface DraftCashEvidencePreview {
  asOfDate: string;
  replay: DraftCashReplay;
  comparison: DraftCashEvidenceComparison;
}

export interface DraftCashEvidenceResult {
  evidenceId: string;
  created: boolean;
  replay: DraftCashReplay;
  comparison: DraftCashEvidenceComparison;
}

/** Persistence mirror; these records are inactive and never represent spendable cash. */
export interface AccountOpeningStatement {
  id: string;
  accountId: string;
  version: number;
  openingDate: string;
  timezone: string;
  state: string;
  sourceFingerprint: string;
  inputHash: string;
  previewSnapshot: unknown;
  createdAt: string;
}

export interface DraftCashEvidence {
  id: string;
  statementId: string;
  idempotencyKey: string;
  payloadHash: string;
  asOfDate: string;
  source: string;
  reference: string;
  attested: boolean;
  recordedAt: string;
}

export interface DraftCashEvidenceBalance {
  id: string;
  evidenceId: string;
  currency: string;
  amount: string;
}

export interface DraftCashEvidenceDecision {
  id: string;
  evidenceId: string;
  currency: string;
  reason: DraftCashEvidenceReason;
  note: string;
  recordedAt: string;
}

export interface OpeningCashBalance {
  id: string;
  statementId: string;
  currency: string;
  amount: string;
}

export interface DraftCashOperation {
  id: string;
  statementId: string;
  state: string;
  methodology: string;
  idempotencyKey: string;
  payloadHash: string;
  kind: string;
  effectiveDate: string;
  sequence: string;
  sourceOrigin: string;
  sourceReference: string;
  command: unknown;
  recordedAt: string;
}

export interface DraftCashPosting {
  id: string;
  operationId: string;
  legIndex: number;
  currency: string;
  amount: string;
  role: string;
}

export interface DraftManualTrade {
  id: string;
  operationId: string;
  parcelKey: string;
  assetId: string;
  symbol: string;
  currency: string;
  quantity: string;
  price: string;
  fees: string;
  requestHash: string;
  request: unknown;
}

export interface DraftCashRevision {
  id: string;
  statementId: string;
  operationId: string;
  revisionNumber: number;
  previousRevisionId: string | null;
  idempotencyKey: string;
  payloadHash: string;
  reason: string;
  request: unknown;
  recordedAt: string;
}

export interface DraftCashRevisionPosting {
  id: string;
  revisionId: string;
  legIndex: number;
  phase: string;
  currency: string;
  amount: string;
  role: string;
}

export interface DraftOperationTradeLink {
  id: string;
  statementId: string;
  operationId: string;
  transactionId: string;
}

export interface OpeningParcelBalance {
  id: string;
  statementId: string;
  positionId: string;
  symbol: string;
  currency: string;
  quantity: string;
}

export interface OpeningPreview {
  accountId: string;
  openingDate: string;
  timezone: 'Australia/Sydney';
  boundary: 'END_OF_DAY';
  asOfDate: string;
  mode: 'PREVIEW_ONLY';
  sourceFingerprint: string;
  parcels: {
    positionId: string;
    symbol: string;
    currency: string;
    openingQuantity: string;
    expectedCurrentQuantity: string;
    recordedCurrentQuantity: string;
  }[];
  cashBalances: {
    currency: string;
    openingAmount: string;
    tradeOnlyEndingAmount: string;
    minimumTradeOnlyAmount: string;
  }[];
  issues: {
    code: string;
    severity: 'BLOCKING' | 'WARNING';
    message: string;
    sourceId: string | null;
  }[];
  counts: {
    parcels: number;
    postBoundaryTrades: number;
    blockingIssues: number;
  };
}
