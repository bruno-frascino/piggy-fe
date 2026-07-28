import type { ClosedTrade } from '../types';
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
  return { id, name, status, closedAt };
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
  const stopLoss = pos.stopLossPrice != null ? Number(pos.stopLossPrice) : 0;
  const unrealizedPnL =
    pos.unrealizedPnL != null ? Number(pos.unrealizedPnL) : null;
  const currentPrice =
    unrealizedPnL !== null && effectiveQty > 0
      ? entryPrice + unrealizedPnL / effectiveQty
      : entryPrice;
  const maxDrawdownPercent =
    pos.maxDrawdownPercent != null ? Number(pos.maxDrawdownPercent) : undefined;
  const normalizedOpenReason =
    typeof pos.openReason === 'string' ? pos.openReason.trim() : '';
  const normalizedLegacyNotes =
    typeof pos.notes === 'string' ? pos.notes.trim() : '';

  return {
    id: typeof pos.id === 'string' ? pos.id : undefined,
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
    buyComments: normalizedOpenReason || normalizedLegacyNotes || undefined,
    maxDrawdownPercent,
  };
}

export function toDateStr(v: unknown): string {
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return '';
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
    baseCurrency: typeof exch?.currency === 'string' ? exch.currency : 'USD',
    maxDrawdownPercent:
      position.maxDrawdownPercent != null
        ? Number(position.maxDrawdownPercent)
        : undefined,
  };
}
