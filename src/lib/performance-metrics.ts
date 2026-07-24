import type { ClosedTrade } from './closed-trades-store';

const DAYS_PER_WEEK = 7;

/**
 * Sums realized P&L across closed trades scoped to a specific account +
 * exchange. Mirrors the backend's PortfolioSnapshot.totalValue basis
 * (capitalAllocated + unrealizedPnL + realizedPnL) so live "today" equity
 * figures derived from open holdings can be put on the same footing as the
 * historical snapshots by adding this term.
 */
export function sumRealizedPnLForScope(
  closedTrades: ClosedTrade[] | undefined,
  accountId: string | undefined,
  exchange: string | undefined
): number {
  if (!closedTrades || !accountId || !exchange) return 0;

  return closedTrades.reduce((acc, trade) => {
    if (trade.accountId !== accountId || trade.exchange !== exchange) {
      return acc;
    }
    const proceeds = trade.unitsClosed * trade.sellPrice - trade.sellFee;
    const cost = trade.unitsClosed * trade.buyPrice + trade.buyFee;
    return acc + (proceeds - cost);
  }, 0);
}

export function calculateGainLossPerWeek(
  gainLoss: number,
  daysOpen: number
): number | null {
  if (
    !Number.isFinite(gainLoss) ||
    !Number.isFinite(daysOpen) ||
    daysOpen <= 0
  ) {
    return null;
  }

  return gainLoss / (daysOpen / DAYS_PER_WEEK);
}

export function calculateReturnPctPerWeek(
  returnPct: number,
  daysOpen: number
): number | null {
  if (
    !Number.isFinite(returnPct) ||
    !Number.isFinite(daysOpen) ||
    daysOpen <= 0
  ) {
    return null;
  }

  return returnPct / (daysOpen / DAYS_PER_WEEK);
}
