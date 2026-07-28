import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { LocalHolding } from '@/components/AddHoldingsDialog';
import type { ExchangeKey, QuoteResult } from '@/lib/types';
import { useHoldings, useQuotes, useClosedPositions } from '@/hooks/api';
import { apiClient } from '@/lib/api-client';
import { sumRealizedPnLForScope } from '@/lib/performance-metrics';

export type HoldingRow = LocalHolding & {
  openDateTs: number; // numeric timestamp for reliable sorting
  daysOpen: number; // number of calendar days position has been open
  openPosition: number; // units * buyPrice + buyFee
  effectivePrice: number; // live quote price when available, fallback to stored
  currentPosition: number; // units * currentPrice
  currentReturnAbs: number; // currentPosition - openPosition
  currentReturnPct: number; // (current - open)/open
  priceDrawdownPct: number; // (effectivePrice - buyPrice) / buyPrice — used for max drawdown tracking
  stopLossPosition: number; // units * stopLoss
  stopLossReturnPct: number; // (stopLossPos - open)/open
  allocationPct: number; // openPosition / totalOpen
  originalIndex: number; // index in holdings array
};

function isOnline() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Owns all data-derivation concerns for HoldingsTable: syncing remote
 * holdings into local state, merging in live quotes, computing per-row and
 * aggregate totals, bubbling live totals to the parent, and the rate-limited
 * max-drawdown ratchet effect. Extracted verbatim (same effects/deps) from
 * HoldingsTable.tsx so behavior is unchanged — see
 * src/components/HoldingsTable.test.tsx for characterization tests covering
 * the row computation and the ratchet effect.
 */
export function useHoldingRows({
  selectedExchange,
  selectedAccountId,
  baseCurrency,
  onExchangeDetected,
  onLiveTotals,
}: {
  selectedExchange?: ExchangeKey;
  selectedAccountId: string;
  baseCurrency?: string;
  onExchangeDetected?: (exchange: string) => void;
  onLiveTotals?: (t: {
    totalEquity: number;
    totalPL: number;
    dayPL: number;
  }) => void;
}) {
  const queryClient = useQueryClient();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const { data: remoteHoldings } = useHoldings(
    selectedExchange,
    selectedAccountId
  );
  const { data: closedPositions } = useClosedPositions();
  const [holdings, setHoldings] = useState<LocalHolding[]>([]);

  useEffect(() => {
    if (remoteHoldings) {
      setHoldings(remoteHoldings);

      if (onExchangeDetected) {
        const seen = new Set<string>();
        for (const holding of remoteHoldings) {
          const exchangeCode = holding.exchangeCode?.trim();
          if (!exchangeCode || seen.has(exchangeCode)) continue;
          seen.add(exchangeCode);
          onExchangeDetected(exchangeCode);
        }
      }
    }
  }, [remoteHoldings, onExchangeDetected]);

  // Live quotes for all symbols in current holdings
  const symbols = useMemo(
    () => [...new Set(holdings.map(h => h.symbol))],
    [holdings]
  );
  const { data: quotesData } = useQuotes(symbols);
  const quoteMap = useMemo(() => {
    if (!quotesData) return new Map<string, QuoteResult>();
    return new Map(quotesData.map(q => [q.symbol, q]));
  }, [quotesData]);

  const totals = useMemo(() => {
    const totalOpen = holdings.reduce(
      (acc, h) => acc + h.units * h.buyPrice + (h.buyFee ?? 0),
      0
    );
    const totalCurrent = holdings.reduce((acc, h) => {
      const livePrice =
        quoteMap.get(h.symbol)?.price ?? h.currentPrice ?? h.buyPrice;
      return acc + h.units * livePrice;
    }, 0);
    const dayPL = holdings.reduce((acc, h) => {
      const change = quoteMap.get(h.symbol)?.change ?? 0;
      return acc + change * h.units;
    }, 0);
    const count = holdings.length;
    const currentReturnAbs = totalCurrent - totalOpen;
    const currentReturnPct = totalOpen > 0 ? currentReturnAbs / totalOpen : 0;
    return {
      totalOpen,
      totalCurrent,
      count,
      currentReturnAbs,
      currentReturnPct,
      dayPL,
    };
  }, [holdings, quoteMap]);

  // Realized P&L banked from closed positions, scoped to this account+exchange.
  // The backend's PortfolioSnapshot.totalValue = capitalAllocated + unrealizedPnL
  // + realizedPnL, so the live "today" equity bubbled up to the chart must also
  // include this term to stay on the same basis as the historical snapshots —
  // otherwise the chart's rightmost point silently drops all banked gains/losses.
  const totalRealizedPnL = useMemo(
    () =>
      sumRealizedPnLForScope(
        closedPositions,
        selectedAccountId,
        selectedExchange
      ),
    [closedPositions, selectedAccountId, selectedExchange]
  );

  // Bubble live totals up to parent (DashboardView stats cards)
  useEffect(() => {
    onLiveTotals?.({
      totalEquity: totals.totalCurrent + totalRealizedPnL,
      totalPL: totals.currentReturnAbs,
      dayPL: totals.dayPL,
    });
  }, [totals, totalRealizedPnL, onLiveTotals]);

  const rows: HoldingRow[] = useMemo(() => {
    const totalOpen =
      holdings.reduce(
        (acc, h) => acc + h.units * h.buyPrice + (h.buyFee ?? 0),
        0
      ) || 1;

    // Group holdings by symbol preserving first occurrence order for groups.
    interface Group {
      symbol: string;
      items: { h: LocalHolding; i: number; ts: number }[];
      anchorTs: number;
      groupOrder: number;
    }
    const groupMap = new Map<string, Group>();
    holdings.forEach((h, i) => {
      const ts = new Date(h.openDate).getTime();
      if (!groupMap.has(h.symbol)) {
        groupMap.set(h.symbol, {
          symbol: h.symbol,
          items: [],
          anchorTs: ts,
          groupOrder: i,
        });
      }
      const g = groupMap.get(h.symbol)!;
      g.items.push({ h, i, ts });
      if (ts < g.anchorTs) g.anchorTs = ts; // track oldest date in group
    });

    // Sort groups by their oldest (anchor) date ascending; tie-breaker by first occurrence order.
    const groups = Array.from(groupMap.values()).sort((a, b) => {
      if (a.anchorTs === b.anchorTs) return a.groupOrder - b.groupOrder;
      return a.anchorTs - b.anchorTs;
    });

    // Within each group, sort items by date ascending; tie-breaker by original index.
    const ordered = groups.flatMap(g =>
      g.items.sort((a, b) => (a.ts === b.ts ? a.i - b.i : a.ts - b.ts))
    );

    return ordered.map(({ h, i, ts }) => {
      const openPosition = h.units * h.buyPrice + (h.buyFee ?? 0);
      const effectivePrice =
        quoteMap.get(h.symbol)?.price ?? h.currentPrice ?? h.buyPrice;
      const currentPosition = h.units * effectivePrice;
      const currentReturnAbs = currentPosition - openPosition;
      const currentReturnPct =
        openPosition > 0 ? currentReturnAbs / openPosition : 0;
      const hasStop = typeof h.stopLoss === 'number' && !isNaN(h.stopLoss);
      const stopLossPrice = hasStop ? (h.stopLoss as number) : NaN;
      const stopLossPosition = hasStop ? h.units * stopLossPrice : NaN;
      const stopLossReturnPct =
        hasStop && openPosition > 0
          ? (stopLossPosition - openPosition) / openPosition
          : NaN;
      const allocationPct = openPosition / totalOpen;
      const daysOpen =
        !isNaN(ts) && ts > 0
          ? Math.max(0, Math.floor((now - ts) / MS_PER_DAY))
          : 0;
      // Price-only drawdown from entry — only valid when a live quote exists
      const priceDrawdownPct =
        effectivePrice > 0 && h.buyPrice > 0
          ? ((effectivePrice - h.buyPrice) / h.buyPrice) * 100
          : 0;
      return {
        ...h,
        currentPrice: effectivePrice,
        openDateTs: isNaN(ts) ? 0 : ts,
        daysOpen,
        openPosition,
        effectivePrice,
        currentPosition,
        currentReturnAbs,
        currentReturnPct,
        priceDrawdownPct,
        stopLossPosition: hasStop ? stopLossPosition : NaN,
        stopLossReturnPct: hasStop ? stopLossReturnPct : NaN,
        allocationPct,
        originalIndex: i,
      };
    });
  }, [holdings, quoteMap]);

  // Auto-update max drawdown when live quotes arrive.
  // Uses `rows` (not raw holdings) so effectivePrice is consistent with what the table shows.
  // Only fires when a real live quote exists — fallback prices (stored/entry) are skipped.
  const lastMaxDrawdownUpdateRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    if (!isOnline() || rows.length === 0) return;

    const nowMs = Date.now();
    const updates: Array<{ id: string; currentPrice: number }> = [];

    for (const row of rows) {
      if (!row.id) continue;
      // Skip if no live quote — effectivePrice would just be the stored/entry price
      if (!quoteMap.has(row.symbol)) continue;

      // priceDrawdownPct is negative when current price < entry price
      if (row.priceDrawdownPct >= 0) continue;

      const absDrawdownPct = Math.abs(row.priceDrawdownPct);
      const existingMaxDrawdown = row.maxDrawdownPercent || 0;

      if (absDrawdownPct > existingMaxDrawdown + 0.01) {
        const lastUpdate = lastMaxDrawdownUpdateRef.current.get(row.id);
        // Rate limit: only update once per 5 minutes per position
        if (!lastUpdate || nowMs - lastUpdate > 5 * 60 * 1000) {
          updates.push({ id: row.id, currentPrice: row.effectivePrice });
          lastMaxDrawdownUpdateRef.current.set(row.id, nowMs);
        }
      }
    }

    if (updates.length > 0) {
      void Promise.all(
        updates.map(({ id, currentPrice }) =>
          apiClient.updatePosition(id, { currentPrice }).catch(() => {})
        )
      ).then(() => {
        void queryClient.invalidateQueries({ queryKey: ['holdings'] });
      });
    }
  }, [rows, quoteMap, queryClient]);

  const tableScrollHeight = useMemo(() => {
    const minPx = 260;
    const rowPx = 44;
    const chromePx = 122; // header + paginator/footer spacing inside DataTable scroll area
    const preferredPx = chromePx + rows.length * rowPx;
    return `clamp(${minPx}px, ${preferredPx}px, calc(100vh - 260px))`;
  }, [rows.length]);

  const anyStopLoss = useMemo(
    () =>
      holdings.some(h => typeof h.stopLoss === 'number' && !isNaN(h.stopLoss)),
    [holdings]
  );

  // Derive display currency: live quote data (Yahoo Finance) is the most reliable source.
  // Falls back to the exchange baseCurrency prop, then USD.
  const currency = useMemo(() => {
    for (const symbol of symbols) {
      const q = quoteMap.get(symbol);
      if (q?.currency) return q.currency;
    }
    return baseCurrency ?? 'USD';
  }, [symbols, quoteMap, baseCurrency]);

  const handleResetMaxDrawdown = useCallback(
    (row: HoldingRow) => {
      if (!row.id || !isOnline()) return;
      void apiClient
        .updatePosition(row.id, { maxDrawdownPercent: null })
        .then(() => queryClient.invalidateQueries({ queryKey: ['holdings'] }))
        .catch(() => {});
    },
    [queryClient]
  );

  const handleRecalculateDrawdown = useCallback(
    (row: HoldingRow) => {
      if (!row.id || !isOnline()) return;
      void apiClient
        .recalculateDrawdown(row.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ['holdings'] }))
        .catch(() => {});
    },
    [queryClient]
  );

  return {
    holdings,
    setHoldings,
    rows,
    totals,
    quoteMap,
    symbols,
    currency,
    anyStopLoss,
    tableScrollHeight,
    handleResetMaxDrawdown,
    handleRecalculateDrawdown,
  };
}
