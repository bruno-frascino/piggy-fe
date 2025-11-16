'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { addClosedTrade } from '@/lib/closed-trades-store';
import type { ExchangeKey } from '@/lib/mock-portfolio';
import { getHoldingsForExchange } from '@/lib/mock-holdings';

type HoldingRow = LocalHolding & {
  openDateTs: number; // numeric timestamp for reliable sorting
  openPosition: number; // units * buyPrice
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

function formatDate(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

const returnClass = (v: number) => (v >= 0 ? 'text-green-600' : 'text-red-600');

export default function HoldingsTable({
  selectedExchange,
}: {
  selectedExchange: ExchangeKey;
}) {
  // Local holdings state so we can add positions
  const [holdings, setHoldings] = useState<LocalHolding[]>(() =>
    getHoldingsForExchange(selectedExchange)
  );
  useEffect(() => {
    setHoldings(getHoldingsForExchange(selectedExchange));
  }, [selectedExchange]);

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
      (acc, h) => acc + h.units * h.buyPrice,
      0
    );
    const totalCurrent = holdings.reduce(
      (acc, h) => acc + h.units * (h.currentPrice ?? h.buyPrice),
      0
    );
    const count = holdings.length;
    const currentReturnAbs = totalCurrent - totalOpen;
    const currentReturnPct = totalOpen > 0 ? currentReturnAbs / totalOpen : 0;
    return {
      totalOpen,
      totalCurrent,
      count,
      currentReturnAbs,
      currentReturnPct,
    };
  }, [holdings]);

  const rows: HoldingRow[] = useMemo(() => {
    const totalOpen =
      holdings.reduce((acc, h) => acc + h.units * h.buyPrice, 0) || 1; // avoid div/0

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
      const openPosition = h.units * h.buyPrice;
      const currentPrice = h.currentPrice ?? h.buyPrice;
      const currentPosition = h.units * currentPrice;
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
        openDateTs: isNaN(ts) ? 0 : ts,
        openPosition,
        currentPosition,
        currentReturnAbs,
        currentReturnPct,
        stopLossPosition: hasStop ? stopLossPosition : NaN,
        stopLossReturnPct: hasStop ? stopLossReturnPct : NaN,
        allocationPct,
        originalIndex: i,
      };
    });
  }, [holdings]);

  const anyStopLoss = useMemo(
    () =>
      holdings.some(h => typeof h.stopLoss === 'number' && !isNaN(h.stopLoss)),
    [holdings]
  );

  const currency = 'USD'; // could be dynamic per exchange/profile later

  return (
    <Card>
      <div className='flex items-center justify-between mb-3'>
        <h3 className='text-lg font-semibold text-gray-800'>
          Holdings — {selectedExchange}
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
              <span className='font-bold text-gray-700 tracking-wide'>
                TOTALS
              </span>
            }
          />
          <Column
            field='name'
            header='Name'
            style={{ minWidth: '200px' }}
            footer={
              <span>
                <span className='text-gray-600 font-medium'>Positions:</span>{' '}
                <span className='font-semibold text-gray-900'>
                  {totals.count}
                </span>
              </span>
            }
          />
          <Column
            header='Date'
            body={(r: HoldingRow) => formatDate(r.openDate)}
            style={{ minWidth: '120px' }}
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
            header='Fee'
            body={(r: HoldingRow) => formatCurrency(r.buyFee, currency)}
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
            body={(r: HoldingRow) =>
              formatCurrency(r.currentPrice ?? r.buyPrice, currency)
            }
            style={{ minWidth: '130px' }}
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
                    currentPrice: r.currentPrice ?? r.buyPrice,
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
        onSubmit={(newPos: LocalHolding) => {
          if (mode === 'edit' && editIdx !== null) {
            setHoldings(prev =>
              prev.map((h, i) => (i === editIdx ? newPos : h))
            );
          } else {
            // Append new positions so when dates are identical (same day) the earliest added remains on top after ascending sort.
            setHoldings(prev => [...prev, newPos]);
          }
          setShowDialog(false);
        }}
      />

      <ClosePositionDialog
        visible={showCloseDialog}
        initial={closeInitial}
        onHide={() => setShowCloseDialog(false)}
        onSubmit={(payload: ClosePositionPayload) => {
          if (closeIdx === null || closeInitial === null) return;
          // Persist closed trade entry
          const periodDays = (() => {
            const start = new Date(closeInitial.openDate).getTime();
            const end = new Date(payload.closeDate).getTime();
            if (isNaN(start) || isNaN(end)) return 0;
            return Math.max(
              0,
              Math.round((end - start) / (1000 * 60 * 60 * 24))
            );
          })();
          addClosedTrade({
            id: `${closeInitial.symbol}-${closeInitial.openDate}-${payload.closeDate}-${Math.random().toString(36).slice(2, 8)}`,
            symbol: closeInitial.symbol,
            name: closeInitial.name,
            openDate: closeInitial.openDate,
            closeDate: payload.closeDate,
            unitsClosed: payload.closeUnits,
            buyPrice: closeInitial.buyPrice,
            buyFee: closeInitial.buyFee,
            sellPrice: payload.sellPrice,
            sellFee: payload.sellFee,
            periodDays,
            buyComments: closeInitial.buyComments,
            sellComments: payload.comments,
            baseCurrency: 'USD',
          });
          // Update local holdings (remove or reduce)
          setHoldings(prev => {
            return prev.flatMap((h, i) => {
              if (i !== closeIdx) return [h];
              const remaining = Number(
                (h.units - payload.closeUnits).toFixed(3)
              );
              if (remaining <= 0) {
                return [];
              }
              return [{ ...h, units: remaining }];
            });
          });
          setShowCloseDialog(false);
          setCloseIdx(null);
          setCloseInitial(null);
        }}
      />
    </Card>
  );
}
