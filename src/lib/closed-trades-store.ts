// Simple in-memory + localStorage backed store for closed trades
// This is intentionally lightweight; replace with real persistence later.

export interface ClosedTrade {
  id: string; // unique (symbol + openDate + closeDate + random suffix)
  symbol: string;
  name?: string;
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
}

function load(): ClosedTrade[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('closedTrades');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ClosedTrade[];
    return [];
  } catch {
    return [];
  }
}

function save(list: ClosedTrade[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('closedTrades', JSON.stringify(list));
  } catch {
    // no-op
  }
}

let cache: ClosedTrade[] = [];

export function getClosedTrades(): ClosedTrade[] {
  if (!cache.length) cache = load();
  return cache;
}

export function addClosedTrade(t: ClosedTrade) {
  cache = [...getClosedTrades(), t];
  save(cache);
}

export function clearClosedTrades() {
  cache = [];
  save(cache);
}
