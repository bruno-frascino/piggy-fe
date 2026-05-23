'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import AddHoldingsDialog, {
  LocalHolding,
} from '@/components/AddHoldingsDialog';
import ClosePositionDialog, {
  ClosePositionPayload,
} from '@/components/ClosePositionDialog';
import type { ExchangeKey, QuoteResult } from '@/lib/types';
import { useHoldings, useQuotes } from '@/hooks/api';
import { apiClient } from '@/lib/api-client';

type HoldingRow = LocalHolding & {
  openDateTs: number; // numeric timestamp for reliable sorting
  openPosition: number; // units * buyPrice + buyFee
  effectivePrice: number; // live quote price when available, fallback to stored
  currentPosition: number; // units * currentPrice
  currentReturnAbs: number; // currentPosition - openPosition
  currentReturnPct: number; // (current - open)/open
  stopLossPosition: number; // units * stopLoss
  stopLossReturnPct: number; // (stopLossPos - open)/open
  allocationPct: number; // openPosition / totalOpen
  originalIndex: number; // index in holdings array
};

function formatCurrency(n: number, currency: string = 'USD') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 3,
  }).format(n);
}

function formatNumber(n: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 3,
  }).format(n);
}

function formatPct(v: number) {
  const p = v * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`;
}

const returnClass = (v: number) => (v >= 0 ? 'text-green-600' : 'text-red-600');

export default function HoldingsTable({
  selectedExchange,
  onExchangeDetected,
  baseCurrency,
  onLiveTotals,
}: {
  selectedExchange: ExchangeKey;
  onExchangeDetected?: (exchange: string) => void;
  baseCurrency?: string;
  onLiveTotals?: (t: {
    totalEquity: number;
    totalPL: number;
    dayPL: number;
  }) => void;
}) {
  const queryClient = useQueryClient();
  const { data: remoteHoldings } = useHoldings(selectedExchange);
  const [holdings, setHoldings] = useState<LocalHolding[]>([]);
  useEffect(() => {
    if (remoteHoldings) {
      setHoldings(remoteHoldings);
    }
  }, [remoteHoldings]);

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

  const [showDialog, setShowDialog] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [dialogInitial, setDialogInitial] = useState<
    Partial<LocalHolding> | undefined
  >(undefined);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeIdx, setCloseIdx] = useState<number | null>(null);
  const [closeInitial, setCloseInitial] = useState<LocalHolding | null>(null);

  // Dialog state is managed inside AddHoldingsDialog

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

  // Bubble live totals up to parent (DashboardView stats cards)
  useEffect(() => {
    onLiveTotals?.({
      totalEquity: totals.totalCurrent,
      totalPL: totals.currentReturnAbs,
      dayPL: totals.dayPL,
    });
  }, [totals, onLiveTotals]);

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
      return {
        ...h,
        currentPrice: effectivePrice,
        openDateTs: isNaN(ts) ? 0 : ts,
        openPosition,
        effectivePrice,
        currentPosition,
        currentReturnAbs,
        currentReturnPct,
        stopLossPosition: hasStop ? stopLossPosition : NaN,
        stopLossReturnPct: hasStop ? stopLossReturnPct : NaN,
        allocationPct,
        originalIndex: i,
      };
    });
  }, [holdings, quoteMap]);

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

  return (
    <Card>
      <div className='flex items-center justify-between mb-4 pb-2 border-b border-gray-200'>
        <h3 className='text-xl font-semibold text-gray-900'>
          Holdings {selectedExchange}
        </h3>
        <div>
          <Button
            icon='pi pi-plus'
            rounded
            severity='success'
            aria-label='Add Position'
            onClick={() => {
              setMode('add');
              setEditIdx(null);
              setDialogInitial(undefined);
              setShowDialog(true);
            }}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className='p-4 text-center text-blue-600'>
          There are no open positions yet
        </div>
      ) : (
        <DataTable
          value={rows}
          size='small'
          scrollable
          scrollHeight='400px'
          rowHover
          stripedRows
          className='holdings-table'
        >
          <Column
            header='Symbol'
            body={(r: HoldingRow) => (
              <button
                className='font-semibold text-blue-600 hover:underline'
                onClick={() => {
                  setMode('edit');
                  setEditIdx(r.originalIndex);
                  setDialogInitial({
                    symbol: r.symbol,
                    name: r.name,
                    openDate: r.openDate,
                    units: r.units,
                    buyPrice: r.buyPrice,
                    buyFee: r.buyFee,
                    stopLoss: r.stopLoss,
                    industry: r.industry,
                    currentPrice: r.currentPrice ?? r.buyPrice,
                    buyComments: r.buyComments,
                  });
                  setShowDialog(true);
                }}
              >
                {r.symbol}
              </button>
            )}
            frozen
            alignFrozen='left'
            style={{ minWidth: '130px', width: '130px' }}
            footer={
              <span>
                <span className='font-bold text-gray-700 tracking-wide'>
                  TOTALS
                </span>{' '}
                <span className='text-gray-600 font-medium'>
                  · Positions: {totals.count}
                </span>
              </span>
            }
          />
          <Column
            header='Units'
            body={(r: HoldingRow) => formatNumber(r.units)}
            style={{ minWidth: '110px' }}
          />
          <Column
            header='Buy'
            body={(r: HoldingRow) => formatCurrency(r.buyPrice, currency)}
            style={{ minWidth: '120px' }}
          />
          <Column
            header='Open'
            body={(r: HoldingRow) => formatCurrency(r.openPosition, currency)}
            style={{ minWidth: '140px' }}
            footer={
              <span>
                <span className='font-semibold text-gray-900'>
                  {formatCurrency(totals.totalOpen, currency)}
                </span>
              </span>
            }
          />
          <Column
            header='Price'
            body={(r: HoldingRow) => formatCurrency(r.effectivePrice, currency)}
            style={{ minWidth: '130px' }}
          />
          <Column
            header={
              <span className='inline-flex items-center gap-1'>
                Day Change
                <i
                  className='pi pi-info-circle text-xs text-gray-400'
                  title='Daily P/L for this row = day price change per unit x units held.'
                />
              </span>
            }
            body={(r: HoldingRow) => {
              const q = quoteMap.get(r.symbol);
              if (!q || q.change === null)
                return <span className='text-gray-400'>—</span>;
              const dayAbs = q.change * r.units;
              const pct = q.changePercent ?? 0;
              return (
                <span className={returnClass(dayAbs)}>
                  {formatCurrency(dayAbs, currency)}{' '}
                  <span className='text-xs opacity-75'>
                    ({pct >= 0 ? '+' : ''}
                    {pct.toFixed(2)}%)
                  </span>
                </span>
              );
            }}
            style={{ minWidth: '180px' }}
            footer={
              totals.dayPL !== 0 ? (
                <span className={`font-semibold ${returnClass(totals.dayPL)}`}>
                  {formatCurrency(totals.dayPL, currency)}
                </span>
              ) : null
            }
          />
          <Column
            header='Position'
            body={(r: HoldingRow) => (
              <button
                className='text-blue-600 hover:underline'
                title='Close position'
                onClick={() => {
                  setCloseIdx(r.originalIndex);
                  setCloseInitial({
                    symbol: r.symbol,
                    name: r.name,
                    openDate: r.openDate,
                    units: r.units,
                    buyPrice: r.buyPrice,
                    buyFee: r.buyFee,
                    stopLoss: r.stopLoss,
                    industry: r.industry,
                    currentPrice: r.effectivePrice,
                  });
                  setShowCloseDialog(true);
                }}
              >
                {formatCurrency(r.currentPosition, currency)}
              </button>
            )}
            style={{ minWidth: '150px' }}
            footer={
              <span>
                <span className='font-semibold text-gray-900'>
                  {formatCurrency(totals.totalCurrent, currency)}
                </span>
              </span>
            }
          />
          <Column
            header='Return'
            body={(r: HoldingRow) => (
              <span className={returnClass(r.currentReturnAbs)}>
                {formatCurrency(r.currentReturnAbs, currency)}
              </span>
            )}
            style={{ minWidth: '130px' }}
            footer={
              <span>
                <span
                  className={`font-semibold ${returnClass(totals.currentReturnAbs)}`}
                >
                  {formatCurrency(totals.currentReturnAbs, currency)}
                </span>
              </span>
            }
          />
          <Column
            header='Return %'
            body={(r: HoldingRow) => (
              <span className={returnClass(r.currentReturnPct)}>
                {formatPct(r.currentReturnPct)}
              </span>
            )}
            style={{ minWidth: '150px' }}
            footer={
              <span className={returnClass(totals.currentReturnPct)}>
                {formatPct(totals.currentReturnPct)}
              </span>
            }
          />
          {anyStopLoss && (
            <>
              <Column
                header='Stop Loss'
                body={(r: HoldingRow) =>
                  typeof r.stopLoss === 'number' && !isNaN(r.stopLoss)
                    ? formatCurrency(r.stopLoss, currency)
                    : ''
                }
                style={{ minWidth: '120px' }}
              />
              <Column
                header='SL Return'
                body={(r: HoldingRow) =>
                  isNaN(r.stopLossPosition)
                    ? ''
                    : formatCurrency(r.stopLossPosition, currency)
                }
                style={{ minWidth: '130px' }}
              />
              <Column
                header='SL Return %'
                body={(r: HoldingRow) =>
                  isNaN(r.stopLossReturnPct) ? (
                    ''
                  ) : (
                    <span className={returnClass(r.stopLossReturnPct)}>
                      {formatPct(r.stopLossReturnPct)}
                    </span>
                  )
                }
                style={{ minWidth: '130px' }}
              />
            </>
          )}
          <Column
            header='Allocation'
            body={(r: HoldingRow) => formatPct(r.allocationPct)}
            style={{ minWidth: '120px' }}
          />
          <Column
            field='industry'
            header='Industry'
            style={{ minWidth: '180px' }}
          />
        </DataTable>
      )}

      <AddHoldingsDialog
        visible={showDialog}
        mode={mode}
        initial={dialogInitial}
        onHide={() => setShowDialog(false)}
        onExchangeDetected={onExchangeDetected}
        onSubmit={(newPos: LocalHolding) => {
          const submit = async () => {
            if (mode === 'edit' && editIdx !== null) {
              setHoldings(prev =>
                prev.map((h, i) => (i === editIdx ? newPos : h))
              );
              setShowDialog(false);
              return;
            }

            await apiClient.createPosition({
              symbol: newPos.symbol,
              exchangeCode: selectedExchange,
              assetName: newPos.name,
              industry: newPos.industry,
              openDate: newPos.openDate,
              entryPrice: newPos.buyPrice,
              quantity: newPos.units,
              buyFees: newPos.buyFee,
              notes: newPos.buyComments,
            });

            await queryClient.invalidateQueries({
              queryKey: ['holdings', selectedExchange],
            });
            await queryClient.invalidateQueries({
              queryKey: ['user-portfolio'],
            });
            setShowDialog(false);
          };

          submit().catch(console.error);
        }}
      />

      <ClosePositionDialog
        visible={showCloseDialog}
        initial={closeInitial}
        onHide={() => setShowCloseDialog(false)}
        onSubmit={(payload: ClosePositionPayload) => {
          if (closeIdx === null || closeInitial === null) return;

          const doClose = async () => {
            // If the holding came from the API it has an id — persist via API
            if (closeInitial.id) {
              await apiClient.closePosition(
                closeInitial.id,
                payload.closeDate,
                payload.sellPrice,
                payload.closeUnits < closeInitial.units
                  ? payload.closeUnits
                  : undefined,
                payload.sellFee || undefined,
                payload.comments || undefined
              );
              // Refresh open holdings and closed-positions queries
              await queryClient.invalidateQueries({
                queryKey: ['holdings', selectedExchange],
              });
              await queryClient.invalidateQueries({
                queryKey: ['closed-positions'],
              });
            }

            // Update local holdings list (remove fully closed, reduce partial)
            setHoldings(prev =>
              prev.flatMap((h, i) => {
                if (i !== closeIdx) return [h];
                const remaining = Number(
                  (h.units - payload.closeUnits).toFixed(3)
                );
                if (remaining <= 0) return [];
                return [{ ...h, units: remaining }];
              })
            );
            setShowCloseDialog(false);
            setCloseIdx(null);
            setCloseInitial(null);
          };

          doClose().catch(console.error);
        }}
      />
    </Card>
  );
}
