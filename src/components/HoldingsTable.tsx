'use client';

import { useMemo } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import type { ExchangeKey } from '@/lib/mock-portfolio';
import { getHoldingsForExchange, HoldingPosition } from '@/lib/mock-holdings';

type HoldingRow = HoldingPosition & {
  openPosition: number; // units * buyPrice
  currentPosition: number; // units * currentPrice
  currentReturnAbs: number; // currentPosition - openPosition
  currentReturnPct: number; // (current - open)/open
  stopLossPosition: number; // units * stopLoss
  stopLossReturnPct: number; // (stopLossPos - open)/open
  allocationPct: number; // openPosition / totalOpen
};

function formatCurrency(n: number, currency: string = 'USD') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
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
  // Source holdings for selected exchange
  const base = useMemo(
    () => getHoldingsForExchange(selectedExchange),
    [selectedExchange]
  );

  const totals = useMemo(() => {
    const totalOpen = base.reduce((acc, h) => acc + h.units * h.buyPrice, 0);
    const totalCurrent = base.reduce(
      (acc, h) => acc + h.units * h.currentPrice,
      0
    );
    const count = base.length;
    const currentReturnAbs = totalCurrent - totalOpen;
    const currentReturnPct = totalOpen > 0 ? currentReturnAbs / totalOpen : 0;
    return {
      totalOpen,
      totalCurrent,
      count,
      currentReturnAbs,
      currentReturnPct,
    };
  }, [base]);

  const rows: HoldingRow[] = useMemo(() => {
    const totalOpen =
      base.reduce((acc, h) => acc + h.units * h.buyPrice, 0) || 1; // avoid div/0
    const sorted = [...base].sort(
      (a, b) => new Date(b.openDate).getTime() - new Date(a.openDate).getTime()
    );
    return sorted.map(h => {
      const openPosition = h.units * h.buyPrice;
      const currentPosition = h.units * h.currentPrice;
      const currentReturnAbs = currentPosition - openPosition;
      const currentReturnPct =
        openPosition > 0 ? (currentPosition - openPosition) / openPosition : 0;
      const stopLossPosition = h.units * h.stopLoss;
      const stopLossReturnPct =
        openPosition > 0 ? (stopLossPosition - openPosition) / openPosition : 0;
      const allocationPct = openPosition / totalOpen;
      return {
        ...h,
        openPosition,
        currentPosition,
        currentReturnAbs,
        currentReturnPct,
        stopLossPosition,
        stopLossReturnPct,
        allocationPct,
      };
    });
  }, [base]);

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
      </div>

      <DataTable
        value={rows}
        size='small'
        scrollable
        scrollHeight='400px'
        stripedRows
        footer={footer}
        emptyMessage='No holdings'
      >
        <Column field='symbol' header='Symbol' style={{ minWidth: '110px' }} />
        <Column field='name' header='Name' style={{ minWidth: '200px' }} />
        <Column
          header='Date'
          body={(r: HoldingRow) => formatDate(r.openDate)}
          style={{ minWidth: '120px' }}
        />
        <Column field='units' header='Units' style={{ minWidth: '90px' }} />
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
          body={(r: HoldingRow) => formatCurrency(r.currentPrice, currency)}
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
        <Column
          header='Stop Loss'
          body={(r: HoldingRow) => formatCurrency(r.stopLoss, currency)}
          style={{ minWidth: '120px' }}
        />
        <Column
          header='SL Return'
          body={(r: HoldingRow) => formatCurrency(r.stopLossPosition, currency)}
          style={{ minWidth: '130px' }}
        />
        <Column
          header='SL Return %'
          body={(r: HoldingRow) => (
            <span className={returnClass(r.stopLossReturnPct)}>
              {formatPct(r.stopLossReturnPct)}
            </span>
          )}
          style={{ minWidth: '130px' }}
        />
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
    </Card>
  );
}
