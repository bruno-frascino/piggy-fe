import type { ClosedTrade } from '@/lib/types';

type TradeAmounts = Pick<
  ClosedTrade,
  'unitsClosed' | 'buyPrice' | 'buyFee' | 'sellPrice' | 'sellFee'
>;

// Open/close are gross values (units × price). Fees are shown separately and
// P/L is net of both, matching the backend statistics and the ATO cost base.
export function closedTradeAmounts(t: TradeAmounts) {
  const open = t.unitsClosed * t.buyPrice;
  const close = t.unitsClosed * t.sellPrice;
  const pl = close - open - t.buyFee - t.sellFee;
  const cost = open + t.buyFee;
  return { open, close, pl, cost, returnFraction: cost > 0 ? pl / cost : 0 };
}
