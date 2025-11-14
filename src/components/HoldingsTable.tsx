'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import AddHoldingsDialog, {
  LocalHolding,
} from '@/components/AddHoldingsDialog';
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

  const footer = (
    <div className='flex flex-wrap items-center gap-4 text-sm px-2 py-2'>
      <span className='font-medium'>Totals</span>
      <span>• Open positions: {totals.count}</span>
      <span>• Total Open: {formatCurrency(totals.totalOpen, currency)}</span>
      <span>
        • Total Current: {formatCurrency(totals.totalCurrent, currency)}
      </span>
      <span>
        • Current Return: {formatCurrency(totals.currentReturnAbs, currency)} (
        {formatPct(totals.currentReturnPct)})
      </span>
    </div>
  );

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

      <DataTable
        value={rows}
        size='small'
        scrollable
        scrollHeight='400px'
        rowHover
        stripedRows
        footer={footer}
        emptyMessage='No holdings'
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
        />
        <Column field='name' header='Name' style={{ minWidth: '200px' }} />
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
          body={(r: HoldingRow) => formatCurrency(r.currentPosition, currency)}
          style={{ minWidth: '150px' }}
        />
        <Column
          header='Return'
          body={(r: HoldingRow) => (
            <span className={returnClass(r.currentReturnAbs)}>
              {formatCurrency(r.currentReturnAbs, currency)}
            </span>
          )}
          style={{ minWidth: '130px' }}
        />
        <Column
          header='Return %'
          body={(r: HoldingRow) => (
            <span className={returnClass(r.currentReturnPct)}>
              {formatPct(r.currentReturnPct)}
            </span>
          )}
          style={{ minWidth: '150px' }}
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
    </Card>
  );
}
