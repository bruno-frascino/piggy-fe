'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import {
  getClosedTrades,
  ClosedTrade,
  updateClosedTrade,
  deleteClosedTrade,
} from '@/lib/closed-trades-store';
import EditClosedTradeDialog from '@/components/EditClosedTradeDialog';

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
  const currentYear = new Date().getFullYear();
  const defaultStart = `${currentYear}-01-01`;
  const defaultEnd = `${currentYear}-12-31`;
  const [exchangeFilter, setExchangeFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);
  const [showDialog, setShowDialog] = useState(false);
  const [active, setActive] = useState<ClosedTrade | null>(null);

  useEffect(() => {
    setRows(getClosedTrades());
  }, []);

  const filtered = useMemo(() => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return rows.filter(r => {
      const byExchange =
        exchangeFilter === 'All' ||
        (r.exchange ?? 'Unknown') === exchangeFilter;
      const t = new Date(r.closeDate).getTime();
      const byDate = (isNaN(start) || t >= start) && (isNaN(end) || t <= end);
      return byExchange && byDate;
    });
  }, [rows, exchangeFilter, startDate, endDate]);

  const totals = filtered.reduce(
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

  const exchangeOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => set.add(r.exchange ?? 'Unknown'));
    return ['All', ...Array.from(set)];
  }, [rows]);

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4'>
      <div className='max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl 3xl:max-w-[1800px] mx-auto space-y-6'>
        {/* <CoreHeader title='📈 Closed Positions History' /> */}
        <Card>
          <div className='pb-2 mb-4 border-b border-gray-200'>
            <h3 className='text-xl font-semibold text-gray-900'>
              Closed Positions
            </h3>
          </div>
          {filtered.length === 0 ? (
            <div className='p-4 text-center text-blue-600'>
              No closed positions recorded yet
            </div>
          ) : (
            <>
              <div className='flex flex-wrap gap-3 items-end mb-3'>
                <div>
                  <label className='block text-sm text-gray-600 mb-1'>
                    Exchange
                  </label>
                  <Dropdown
                    value={exchangeFilter}
                    onChange={e => setExchangeFilter(e.value)}
                    options={exchangeOptions}
                    className='min-w-[12rem]'
                  />
                </div>
                <div>
                  <label className='block text-sm text-gray-600 mb-1'>
                    From
                  </label>
                  <InputText
                    type='date'
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className='block text-sm text-gray-600 mb-1'>To</label>
                  <InputText
                    type='date'
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
                <div className='ml-auto flex gap-2'>
                  <Button
                    label='Reset'
                    severity='secondary'
                    onClick={() => {
                      setExchangeFilter('All');
                      setStartDate(defaultStart);
                      setEndDate(defaultEnd);
                    }}
                  />
                </div>
              </div>
              <DataTable
                value={filtered}
                size='small'
                scrollable
                scrollHeight='400px'
                stripedRows
                className='holdings-table'
              >
                <Column
                  header='Symbol'
                  body={(r: ClosedTrade) => (
                    <button
                      className='text-blue-600 font-semibold hover:underline'
                      onClick={() => {
                        setActive(r);
                        setShowDialog(true);
                      }}
                      title='View / Edit Closed Position'
                    >
                      {r.symbol}
                    </button>
                  )}
                  style={{ minWidth: '120px' }}
                  frozen
                  alignFrozen='left'
                  footer={
                    <span className='font-bold text-gray-700 tracking-wide'>
                      TOTALS
                    </span>
                  }
                />
                <Column
                  header='Name'
                  field='name'
                  style={{ minWidth: '180px' }}
                  footer={
                    <span>
                      <span className='text-gray-600 font-medium'>
                        Positions:
                      </span>{' '}
                      <span className='font-semibold text-gray-900'>
                        {filtered.length}
                      </span>
                    </span>
                  }
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
                  frozen
                  alignFrozen='left'
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
                  frozen
                  alignFrozen='left'
                />
                <Column
                  header='Sell Price'
                  body={(r: ClosedTrade) => formatCurrency(r.sellPrice)}
                  style={{ minWidth: '120px' }}
                  frozen
                  alignFrozen='left'
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
                  footer={
                    <span className='font-semibold text-gray-900'>
                      {formatCurrency(totals.open)}
                    </span>
                  }
                />
                <Column
                  header='Close Position'
                  body={(r: ClosedTrade) =>
                    formatCurrency(r.unitsClosed * r.sellPrice - r.sellFee)
                  }
                  style={{ minWidth: '150px' }}
                  footer={
                    <span className='font-semibold text-gray-900'>
                      {formatCurrency(totals.close)}
                    </span>
                  }
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
                  frozen
                  alignFrozen='left'
                  footer={
                    <span className={returnClass(totals.pl)}>
                      {formatCurrency(totals.pl)}
                    </span>
                  }
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
                  frozen
                  alignFrozen='left'
                  footer={
                    <span className={returnClass(plPct)}>
                      {formatPct(plPct)}
                    </span>
                  }
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
              </DataTable>
              {showDialog && active && (
                <EditClosedTradeDialog
                  trade={active}
                  onHide={() => {
                    setShowDialog(false);
                    setActive(null);
                  }}
                  onSave={(updated: ClosedTrade) => {
                    const periodDays = (() => {
                      const start = new Date(updated.openDate).getTime();
                      const end = new Date(updated.closeDate).getTime();
                      if (isNaN(start) || isNaN(end)) return updated.periodDays;
                      return Math.max(
                        0,
                        Math.round((end - start) / (1000 * 60 * 60 * 24))
                      );
                    })();
                    updateClosedTrade(updated.id, { ...updated, periodDays });
                    setRows(getClosedTrades());
                    setShowDialog(false);
                    setActive(null);
                  }}
                  onDelete={(id: string) => {
                    // Confirmation now handled inside EditClosedTradeDialog via PrimeReact ConfirmDialog
                    deleteClosedTrade(id);
                    setRows(getClosedTrades());
                    setShowDialog(false);
                    setActive(null);
                  }}
                />
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
