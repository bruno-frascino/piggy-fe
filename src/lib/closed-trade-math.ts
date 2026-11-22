import type { ClosedTrade } from '@/lib/types';

type TradeAmounts = Pick<
  ClosedTrade,
  | 'unitsClosed'
  | 'buyPrice'
  | 'buyFee'
  | 'sellPrice'
  | 'sellFee'
  | 'splitAdjustedCostBasis'
>;

// The historical buy price is not adjusted for splits.
export function closedTradeAmounts(t: TradeAmounts) {
  const open =
    t.splitAdjustedCostBasis === undefined
      ? t.unitsClosed * t.buyPrice
      : t.splitAdjustedCostBasis - t.buyFee;
  const cost = t.splitAdjustedCostBasis ?? open + t.buyFee;
  const close = t.unitsClosed * t.sellPrice;
  const pl = close - cost - t.sellFee;
  return { open, close, pl, cost, returnFraction: cost > 0 ? pl / cost : 0 };
}
