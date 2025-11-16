'use client';

import { useEffect, useState } from 'react';
import CoreHeader from '@/components/CoreHeader';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import {
  getClosedTrades,
  clearClosedTrades,
  ClosedTrade,
} from '@/lib/closed-trades-store';

function formatCurrency(n: number, currency: string = 'USD') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
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

export default function HistoryPage() {
  const [rows, setRows] = useState<ClosedTrade[]>([]);

  useEffect(() => {
    setRows(getClosedTrades());
  }, []);

  const totals = rows.reduce(
    (acc, r) => {
      const openPosition = r.unitsClosed * r.buyPrice + r.buyFee;
      const closePosition = r.unitsClosed * r.sellPrice - r.sellFee;
      const pl = closePosition - openPosition;
      acc.open += openPosition;
      acc.close += closePosition;
      acc.pl += pl;
      return acc;
    },
    { open: 0, close: 0, pl: 0 }
  );

  const plPct = totals.open > 0 ? totals.pl / totals.open : 0;

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4'>
      <div className='max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl 3xl:max-w-[1800px] mx-auto space-y-6'>
        <CoreHeader title='📜 Closed Positions History' />
        <Card>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='text-lg font-semibold text-gray-800'>
              Closed Positions
            </h3>
            {rows.length > 0 && (
              <Button
                label='Clear History'
                icon='pi pi-times'
                severity='danger'
                outlined
                onClick={() => {
                  clearClosedTrades();
                  setRows([]);
                }}
              />
            )}
          </div>
          {rows.length === 0 ? (
            <div className='p-4 text-center text-blue-600'>
              No closed positions recorded yet
            </div>
          ) : (
            <DataTable
              value={rows}
              size='small'
              scrollable
              scrollHeight='400px'
              stripedRows
              className='holdings-table'
            >
              <Column
                header='Symbol'
                field='symbol'
                style={{ minWidth: '120px' }}
              />
              <Column
                header='Name'
                field='name'
                style={{ minWidth: '180px' }}
              />
              <Column
                header='Open Date'
                body={(r: ClosedTrade) => formatDate(r.openDate)}
                style={{ minWidth: '120px' }}
              />
              <Column
                header='Close Date'
                body={(r: ClosedTrade) => formatDate(r.closeDate)}
                style={{ minWidth: '120px' }}
              />
              <Column
                header='Period'
                body={(r: ClosedTrade) => `${r.periodDays}d`}
                style={{ minWidth: '90px' }}
              />
              <Column
                header='Units Closed'
                body={(r: ClosedTrade) => r.unitsClosed.toFixed(3)}
                style={{ minWidth: '130px' }}
              />
              <Column
                header='Buy Price'
                body={(r: ClosedTrade) => formatCurrency(r.buyPrice)}
                style={{ minWidth: '120px' }}
              />
              <Column
                header='Sell Price'
                body={(r: ClosedTrade) => formatCurrency(r.sellPrice)}
                style={{ minWidth: '120px' }}
              />
              <Column
                header='Buy Fee'
                body={(r: ClosedTrade) => formatCurrency(r.buyFee)}
                style={{ minWidth: '110px' }}
              />
              <Column
                header='Sell Fee'
                body={(r: ClosedTrade) => formatCurrency(r.sellFee)}
                style={{ minWidth: '110px' }}
              />
              <Column
                header='Open Position'
                body={(r: ClosedTrade) =>
                  formatCurrency(r.unitsClosed * r.buyPrice + r.buyFee)
                }
                style={{ minWidth: '150px' }}
              />
              <Column
                header='Close Position'
                body={(r: ClosedTrade) =>
                  formatCurrency(r.unitsClosed * r.sellPrice - r.sellFee)
                }
                style={{ minWidth: '150px' }}
              />
              <Column
                header='P/L'
                body={(r: ClosedTrade) => {
                  const pl =
                    r.unitsClosed * r.sellPrice -
                    r.sellFee -
                    (r.unitsClosed * r.buyPrice + r.buyFee);
                  return (
                    <span className={returnClass(pl)}>
                      {formatCurrency(pl)}
                    </span>
                  );
                }}
                style={{ minWidth: '130px' }}
              />
              <Column
                header='P/L %'
                body={(r: ClosedTrade) => {
                  const open = r.unitsClosed * r.buyPrice + r.buyFee;
                  const pl = r.unitsClosed * r.sellPrice - r.sellFee - open;
                  const pct = open > 0 ? pl / open : 0;
                  return (
                    <span className={returnClass(pct)}>{formatPct(pct)}</span>
                  );
                }}
                style={{ minWidth: '130px' }}
              />
              <Column
                header='Buy Comments'
                body={(r: ClosedTrade) => r.buyComments || ''}
                style={{ minWidth: '180px' }}
              />
              <Column
                header='Sell Comments'
                body={(r: ClosedTrade) => r.sellComments || ''}
                style={{ minWidth: '180px' }}
              />
              <Column
                header=''
                footer={
                  <div className='flex flex-col text-xs text-gray-700'>
                    <span>Total Open: {formatCurrency(totals.open)}</span>
                    <span>Total Close: {formatCurrency(totals.close)}</span>
                    <span className={returnClass(totals.pl)}>
                      Total P/L: {formatCurrency(totals.pl)}
                    </span>
                    <span className={returnClass(plPct)}>
                      Total P/L %: {formatPct(plPct)}
                    </span>
                  </div>
                }
                style={{ minWidth: '180px' }}
              />
            </DataTable>
          )}
        </Card>
      </div>
    </div>
  );
}
