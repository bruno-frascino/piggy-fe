import type {
  CloseReason,
  ClosedTrade,
  LiveAcquisitionCorrectionMetadata,
} from '../types';
import type {
  EquityPoint,
  HoldingPosition,
  TradingAccount,
  UserProfile,
} from '../types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function unwrapArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data as T[];
  }
  return [];
}

export function normalizeEquitySeries(payload: unknown): EquityPoint[] {
  if (!Array.isArray(payload)) return [];

  return payload
    .map(point => {
      if (!isRecord(point)) return null;

      const rawDate = point.date ?? point.timestamp ?? point.time;
      const rawEquity = point.equity ?? point.value ?? point.totalEquity;

      if (typeof rawDate !== 'string' || typeof rawEquity !== 'number') {
        return null;
      }

      return { date: rawDate, equity: rawEquity };
    })
    .filter((point): point is EquityPoint => point !== null);
}

export function mapToTradingAccount(row: unknown): TradingAccount | null {
  if (!isRecord(row)) return null;

  const id = typeof row.id === 'string' ? row.id : null;
  const name = typeof row.name === 'string' ? row.name : null;
  const status = row.status === 'CLOSED' ? 'CLOSED' : 'ACTIVE';
  const closedAt =
    typeof row.closedAt === 'string' || row.closedAt === null
      ? row.closedAt
      : null;

  if (!id || !name) return null;
  return { id, name, status, closedAt, isDemo: row.isDemo === true };
}

export function mapToUserProfile(row: unknown): UserProfile | null {
  if (!isRecord(row)) return null;

  const id = typeof row.id === 'string' ? row.id : null;
  const email = typeof row.email === 'string' ? row.email : null;
  const name = typeof row.name === 'string' ? row.name : null;
  const baseCurrency =
    typeof row.baseCurrency === 'string' && row.baseCurrency
      ? row.baseCurrency
      : 'USD';

  if (!id || !email || !name) return null;

  return {
    id,
    email,
    name,
    baseCurrency,
  };
}

export function mapSnapshotToEquityPoint(row: unknown): EquityPoint | null {
  if (!isRecord(row)) return null;

  const rawDate = row.date;
  const rawValue = row.totalValue ?? row.equity ?? row.value;

  const date =
    typeof rawDate === 'string'
      ? rawDate.slice(0, 10)
      : rawDate instanceof Date
        ? rawDate.toISOString().slice(0, 10)
        : null;
  if (!date) return null;

  const equity = Number(rawValue);
  if (!Number.isFinite(equity)) return null;

  return { date, equity };
}

export function mapPositionToHolding(pos: unknown): HoldingPosition | null {
  if (!isRecord(pos)) return null;
  const asset = isRecord(pos.asset) ? pos.asset : null;
  const account = isRecord(pos.account) ? pos.account : null;
  const exchange = asset && isRecord(asset.exchange) ? asset.exchange : null;
  if (!asset) return null;

  const symbol = typeof asset.symbol === 'string' ? asset.symbol : null;
  if (!symbol) return null;

  const rawDate = pos.openDate;
  const openDate =
    typeof rawDate === 'string'
      ? rawDate.slice(0, 10)
      : rawDate instanceof Date
        ? (rawDate as Date).toISOString().slice(0, 10)
        : null;
  if (!openDate) return null;

  const entryPrice = Number(pos.entryPrice) || 0;
  const quantity = Number(pos.quantity) || 0;
  const buyFees = Number(pos.buyFees) || 0;
  const transactions = Array.isArray(pos.transactions) ? pos.transactions : [];
  const buyQty = transactions.reduce((sum, tx) => {
    if (!isRecord(tx) || tx.type !== 'BUY') return sum;
    return sum + (Number(tx.quantity) || 0);
  }, 0);
  const sellQty = transactions.reduce((sum, tx) => {
    if (!isRecord(tx) || tx.type !== 'SELL') return sum;
    return sum + (Number(tx.quantity) || 0);
  }, 0);
  const baseQty = buyQty > 0 ? buyQty : quantity;
  const remainingQty =
    baseQty > 0 ? Math.max(0, baseQty - sellQty) : Math.max(0, quantity);
  const effectiveQty = sellQty > 0 ? remainingQty : quantity;
  const effectiveBuyFee =
    baseQty > 0 ? buyFees * (effectiveQty / baseQty) : buyFees;
  const rawStopLoss =
    pos.stopLossPrice != null ? Number(pos.stopLossPrice) : NaN;
  // null / non-positive means "no stop loss".
  const stopLoss =
    Number.isFinite(rawStopLoss) && rawStopLoss > 0 ? rawStopLoss : undefined;
  const unrealizedPnL =
    pos.unrealizedPnL != null ? Number(pos.unrealizedPnL) : null;
  const currentPrice =
    unrealizedPnL !== null && effectiveQty > 0
      ? entryPrice + unrealizedPnL / effectiveQty
      : entryPrice;
  const maxDrawdownPercent =
    pos.maxDrawdownPercent != null ? Number(pos.maxDrawdownPercent) : undefined;
  const maxRunUpPercent =
    pos.maxRunUpPercent != null ? Number(pos.maxRunUpPercent) : undefined;
  const stopLossHitAt =
    typeof pos.stopLossHitAt === 'string' && pos.stopLossHitAt
      ? pos.stopLossHitAt
      : undefined;
  const normalizedOpenReason =
    typeof pos.openReason === 'string' ? pos.openReason.trim() : '';
  const normalizedLegacyNotes =
    typeof pos.notes === 'string' ? pos.notes.trim() : '';
  const legacyOpenReason =
    normalizedLegacyNotes === 'Opened from dashboard'
      ? ''
      : normalizedLegacyNotes;

  return {
    acquisitionCorrection: mapAcquisitionCorrection(pos.acquisitionCorrection),
    id: typeof pos.id === 'string' ? pos.id : undefined,
    assetType:
      asset.assetType === 'CRYPTO' ||
      asset.assetType === 'ETF' ||
      asset.assetType === 'EQUITY'
        ? asset.assetType
        : undefined,
    origin:
      pos.origin === 'MANUAL' ||
      pos.origin === 'IMPORT_TRADE' ||
      pos.origin === 'STAKING_REWARD'
        ? pos.origin
        : undefined,
    externalRef:
      typeof pos.externalRef === 'string' ? pos.externalRef : undefined,
    accountId: typeof account?.id === 'string' ? account.id : undefined,
    accountName:
      typeof account?.name === 'string' && account.name
        ? account.name
        : undefined,
    exchangeCode:
      typeof exchange?.code === 'string' && exchange.code
        ? exchange.code
        : typeof exchange?.name === 'string' && exchange.name
          ? exchange.name
          : undefined,
    symbol,
    name: typeof asset.name === 'string' ? asset.name : symbol,
    openDate,
    units: effectiveQty,
    buyPrice: entryPrice,
    buyFee: Number(effectiveBuyFee.toFixed(6)),
    stopLoss,
    industry:
      typeof asset.sector === 'string'
        ? asset.sector
        : typeof asset.industry === 'string'
          ? asset.industry
          : '',
    currentPrice,
    buyComments: normalizedOpenReason || legacyOpenReason || undefined,
    maxDrawdownPercent,
    maxRunUpPercent,
    stopLossHitAt,
  };
}

export function toDateStr(v: unknown): string {
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return '';
}

export function mapAcquisitionCorrection(
  raw: unknown
): LiveAcquisitionCorrectionMetadata | undefined {
  if (
    !isRecord(raw) ||
    typeof raw.transactionId !== 'string' ||
    !raw.transactionId ||
    typeof raw.operationId !== 'string' ||
    !raw.operationId ||
    typeof raw.expectedRevisionId !== 'string' ||
    !raw.expectedRevisionId ||
    typeof raw.expectedSourceFingerprint !== 'string' ||
    !/^[a-f0-9]{64}$/.test(raw.expectedSourceFingerprint) ||
    typeof raw.effectiveDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(raw.effectiveDate) ||
    typeof raw.sequence !== 'number' ||
    !Number.isSafeInteger(raw.sequence) ||
    raw.sequence < 1 ||
    typeof raw.quantity !== 'string' ||
    !/^\d+(\.\d+)?$/.test(raw.quantity) ||
    typeof raw.price !== 'string' ||
    !/^\d+(\.\d+)?$/.test(raw.price) ||
    typeof raw.fees !== 'string' ||
    !/^\d+(\.\d+)?$/.test(raw.fees)
  )
    return undefined;
  return {
    transactionId: raw.transactionId,
    operationId: raw.operationId,
    expectedRevisionId: raw.expectedRevisionId,
    expectedSourceFingerprint: raw.expectedSourceFingerprint,
    effectiveDate: raw.effectiveDate,
    sequence: raw.sequence,
    quantity: raw.quantity,
    price: raw.price,
    fees: raw.fees,
  };
}

const CLOSE_REASONS: readonly string[] = [
  'STOP_LOSS',
  'TARGET',
  'MANUAL',
  'OTHER',
];

function isCloseReason(value: unknown): value is CloseReason {
  return typeof value === 'string' && CLOSE_REASONS.includes(value);
}

export function mapCloseEventToClosedTrade(event: unknown): ClosedTrade | null {
  if (!isRecord(event)) return null;

  const eventId = typeof event.id === 'string' ? event.id : null;
  if (!eventId) return null;

  const position = isRecord(event.position) ? event.position : null;
  if (!position) return null;

  const asset = isRecord(position.asset) ? position.asset : null;
  if (!asset) return null;
  const exch = isRecord(asset.exchange) ? asset.exchange : null;
  const account = isRecord(position.account) ? position.account : null;

  const symbol = typeof asset.symbol === 'string' ? asset.symbol : null;
  if (!symbol) return null;

  const openDate = toDateStr(position.openDate);
  const closeDate = toDateStr(event.date);
  if (!openDate || !closeDate) return null;

  const soldQty = Number(event.quantity) || 0;
  if (!Number.isFinite(soldQty) || soldQty <= 0) return null;

  const transactions = Array.isArray(position.transactions)
    ? position.transactions
    : [];
  const buyQty = transactions.reduce((sum, tx) => {
    if (!isRecord(tx) || tx.type !== 'BUY') return sum;
    return sum + (Number(tx.quantity) || 0);
  }, 0);

  const totalBuyFees = Number(position.buyFees) || 0;
  const proratedBuyFee =
    buyQty > 0 ? totalBuyFees * (soldQty / buyQty) : totalBuyFees;

  const start = new Date(openDate).getTime();
  const end = new Date(closeDate).getTime();
  const periodDays =
    isNaN(start) || isNaN(end)
      ? 0
      : Math.max(0, Math.round((end - start) / 86400000));
  const rawCashCorrection = isRecord(event.cashCorrection)
    ? event.cashCorrection
    : null;
  const cashCorrection =
    rawCashCorrection &&
    typeof rawCashCorrection.operationId === 'string' &&
    typeof rawCashCorrection.expectedRevisionId === 'string' &&
    typeof rawCashCorrection.expectedSourceFingerprint === 'string' &&
    typeof rawCashCorrection.effectiveDate === 'string' &&
    typeof rawCashCorrection.sequence === 'number' &&
    Number.isSafeInteger(rawCashCorrection.sequence)
      ? {
          operationId: rawCashCorrection.operationId,
          expectedRevisionId: rawCashCorrection.expectedRevisionId,
          expectedSourceFingerprint:
            rawCashCorrection.expectedSourceFingerprint,
          effectiveDate: rawCashCorrection.effectiveDate,
          sequence: rawCashCorrection.sequence,
        }
      : undefined;

  return {
    id: eventId,
    positionId: typeof position.id === 'string' ? position.id : undefined,
    accountId: typeof account?.id === 'string' ? account.id : undefined,
    accountName:
      typeof account?.name === 'string' && account.name
        ? account.name
        : undefined,
    symbol,
    name: typeof asset.name === 'string' ? asset.name : symbol,
    exchange: typeof exch?.code === 'string' ? exch.code : undefined,
    openDate,
    closeDate,
    unitsClosed: Number(soldQty.toFixed(6)),
    buyPrice: Number(position.entryPrice) || 0,
    buyFee: Number(proratedBuyFee.toFixed(6)),
    sellPrice: Number(event.price) || 0,
    sellFee: Number(event.fees) || 0,
    periodDays,
    buyComments:
      typeof position.openReason === 'string' && position.openReason.trim()
        ? position.openReason.trim()
        : undefined,
    sellComments:
      typeof event.notes === 'string'
        ? event.notes
        : typeof position.notes === 'string'
          ? position.notes
          : undefined,
    closeReason: isCloseReason(event.closeReason)
      ? event.closeReason
      : undefined,
    baseCurrency: typeof exch?.currency === 'string' ? exch.currency : 'USD',
    maxDrawdownPercent:
      position.maxDrawdownPercent != null
        ? Number(position.maxDrawdownPercent)
        : undefined,
    maxRunUpPercent:
      position.maxRunUpPercent != null
        ? Number(position.maxRunUpPercent)
        : undefined,
    ...(cashCorrection ? { cashCorrection } : {}),
    acquisitionCorrection: mapAcquisitionCorrection(
      event.acquisitionCorrection
    ),
  };
}
