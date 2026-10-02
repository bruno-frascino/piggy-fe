'use client';

import { useCallback, useMemo, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import type { ClosedTrade, TaxReportUsage } from '@/lib/types';
import EditClosedTradeDialog from '@/components/EditClosedTradeDialog';
import PageHeader from '@/components/PageHeader';
import {
  useClosedPositions,
  useDeletePosition,
  useTaxReportPositionUsage,
  useUpdateCloseEvent,
  useUpdatePosition,
} from '@/hooks/api';
import {
  computeHistoryPeriodRange,
  formatDateDDMMYYYY,
  type HistoryPeriodPreset,
} from '@/lib/date';
import { formatCurrency, formatPct, returnClass } from '@/lib/format';
import { usePrivacy } from '@/lib/privacy-context';
import { useToast } from '@/lib/toast-context';

const PERIOD_PRESETS: { label: string; value: HistoryPeriodPreset }[] = [
  { label: 'Current FY', value: 'CURRENT_FY' },
  { label: 'Last FY', value: 'LAST_FY' },
  { label: 'YTD', value: 'YTD' },
  { label: 'Last Year', value: 'LAST_YEAR' },
  { label: 'All', value: 'ALL' },
];

function calcTotals(trades: ClosedTrade[]) {
  return trades.reduce(
    (acc, r) => {
      const openPos = r.unitsClosed * r.buyPrice + r.buyFee;
      const closePos = r.unitsClosed * r.sellPrice - r.sellFee;
      acc.open += openPos;
      acc.close += closePos;
      acc.pl += closePos - openPos;
      return acc;
    },
    { open: 0, close: 0, pl: 0 }
  );
}

interface ExchangeTableProps {
  exchange: string;
  accountName?: string;
  trades: ClosedTrade[];
  usageFor: (trade: ClosedTrade) => TaxReportUsage[];
  onEdit: (trade: ClosedTrade) => void;
}

function ExchangeTable({
  exchange,
  accountName,
  trades,
  usageFor,
  onEdit,
}: ExchangeTableProps) {
  const totals = calcTotals(trades);
  const plPct = totals.open > 0 ? totals.pl / totals.open : 0;
  const groupCurrency = trades[0]?.baseCurrency ?? 'USD';
  const { mask, hidden } = usePrivacy();

  return (
    <Card>
      <div
        className='pb-2 mb-4 border-b flex items-center justify-between'
        style={{ borderColor: 'var(--tr-border)' }}
      >
        <h3
          className='text-xl font-semibold'
          style={{ color: 'var(--tr-text)' }}
        >
          {exchange}
          {accountName && (
            <span
              className='ml-2 text-sm font-normal'
              style={{ color: 'var(--tr-text-2)' }}
            >
              ({accountName})
            </span>
          )}
        </h3>
        <span className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
          {trades.length} position{trades.length !== 1 ? 's' : ''}
        </span>
      </div>
      <DataTable
        value={trades}
        size='small'
        scrollable
        scrollHeight='400px'
        stripedRows
        className='holdings-table'
        cellMemo={false}
      >
        <Column
          header='Symbol'
          body={(r: ClosedTrade) => {
            const usage = usageFor(r);
            const stale = usage.filter(u => u.stale);
            return (
              <span className='inline-flex items-center gap-1'>
                <button
                  className='text-blue-600 font-semibold hover:underline'
                  onClick={() => onEdit(r)}
                  title='View / Edit Closed Position'
                >
                  {r.symbol}
                </button>
                {usage.length > 0 && (
                  <i
                    className={
                      stale.length > 0
                        ? 'pi pi-exclamation-triangle text-amber-500 text-xs'
                        : 'pi pi-file-pdf text-gray-400 text-xs'
                    }
                    title={
                      stale.length > 0
                        ? `Changed since ${stale.map(u => u.financialYearLabel).join(', ')} tax report was generated — regenerate it`
                        : `Included in the ${usage.map(u => u.financialYearLabel).join(', ')} tax report`
                    }
                  />
                )}
              </span>
            );
          }}
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
              <span className='text-gray-600 font-medium'>Positions:</span>{' '}
              <span className='font-semibold text-gray-900'>
                {trades.length}
              </span>
            </span>
          }
        />
        <Column
          header='Open Date'
          body={(r: ClosedTrade) => formatDateDDMMYYYY(r.openDate)}
          style={{ minWidth: '120px' }}
        />
        <Column
          header='Close Date'
          body={(r: ClosedTrade) => formatDateDDMMYYYY(r.closeDate)}
          style={{ minWidth: '120px' }}
        />
        <Column
          header='Period'
          body={(r: ClosedTrade) => `${r.periodDays}d`}
          style={{ minWidth: '90px' }}
        />
        <Column
          header='Units Closed'
          body={(r: ClosedTrade) => mask(r.unitsClosed.toFixed(3))}
          style={{ minWidth: '130px' }}
        />
        <Column
          header='Buy Price'
          body={(r: ClosedTrade) =>
            formatCurrency(r.buyPrice, r.baseCurrency ?? groupCurrency)
          }
          style={{ minWidth: '120px' }}
        />
        <Column
          header='Sell Price'
          body={(r: ClosedTrade) =>
            formatCurrency(r.sellPrice, r.baseCurrency ?? groupCurrency)
          }
          style={{ minWidth: '120px' }}
        />
        <Column
          header='Buy Fee'
          body={(r: ClosedTrade) =>
            mask(formatCurrency(r.buyFee, r.baseCurrency ?? groupCurrency))
          }
          style={{ minWidth: '110px' }}
        />
        <Column
          header='Sell Fee'
          body={(r: ClosedTrade) =>
            mask(formatCurrency(r.sellFee, r.baseCurrency ?? groupCurrency))
          }
          style={{ minWidth: '110px' }}
        />
        <Column
          header='Open Position'
          body={(r: ClosedTrade) =>
            mask(
              formatCurrency(
                r.unitsClosed * r.buyPrice + r.buyFee,
                r.baseCurrency ?? groupCurrency
              )
            )
          }
          style={{ minWidth: '150px' }}
          footer={
            <span className='font-semibold text-gray-900'>
              {mask(formatCurrency(totals.open, groupCurrency))}
            </span>
          }
        />
        <Column
          header='Close Position'
          body={(r: ClosedTrade) =>
            mask(
              formatCurrency(
                r.unitsClosed * r.sellPrice - r.sellFee,
                r.baseCurrency ?? groupCurrency
              )
            )
          }
          style={{ minWidth: '150px' }}
          footer={
            <span className='font-semibold text-gray-900'>
              {mask(formatCurrency(totals.close, groupCurrency))}
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
              <span className={returnClass(pl, hidden)}>
                {mask(formatCurrency(pl, r.baseCurrency ?? groupCurrency))}
              </span>
            );
          }}
          style={{ minWidth: '130px' }}
          footer={
            <span className={returnClass(totals.pl, hidden)}>
              {mask(formatCurrency(totals.pl, groupCurrency))}
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
              <span className={returnClass(pct, hidden)}>{formatPct(pct)}</span>
            );
          }}
          style={{ minWidth: '130px' }}
          footer={
            <span className={returnClass(plPct, hidden)}>
              {formatPct(plPct)}
            </span>
          }
        />
        <Column
          header='Max Drawdown %'
          body={(r: ClosedTrade) =>
            r.maxDrawdownPercent != null && r.maxDrawdownPercent > 0 ? (
              <span className={hidden ? 'text-gray-500' : 'text-red-600'}>
                -{r.maxDrawdownPercent.toFixed(2)}%
              </span>
            ) : (
              <span className='text-gray-400'>—</span>
            )
          }
          style={{ minWidth: '150px' }}
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
    </Card>
  );
}

export default function HistoryPage() {
  const { show: showToast } = useToast();
  const { mutateAsync: updateCloseEvent } = useUpdateCloseEvent();
  const { mutateAsync: updatePosition } = useUpdatePosition();
  const { mutateAsync: deletePosition } = useDeletePosition();
  const currentYear = new Date().getFullYear();
  const defaultStart = `${currentYear}-01-01`;
  const defaultEnd = `${currentYear}-12-31`;
  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);

  // The close-date range is the server-side scope; account and exchange are
  // sliced client-side so their dropdowns keep listing every option in range.
  const { data, isLoading } = useClosedPositions({
    dateFrom: startDate || undefined,
    dateTo: endDate || undefined,
  });
  const rows = useMemo(() => data?.trades ?? [], [data]);
  const truncated = (data?.total ?? 0) > rows.length;

  const { data: reportUsage } = useTaxReportPositionUsage();
  const usageFor = useCallback(
    (trade: ClosedTrade) =>
      (trade.positionId ? reportUsage?.[trade.positionId] : undefined) ?? [],
    [reportUsage]
  );

  const [activePreset, setActivePreset] = useState<HistoryPeriodPreset | null>(
    null
  );
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [exchangeFilter, setExchangeFilter] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [active, setActive] = useState<ClosedTrade | null>(null);

  const showWriteError = (action: string, error: unknown) => {
    const fallback = `Could not ${action}. Please try again.`;
    showToast({
      severity: 'error',
      summary: 'Action failed',
      detail: (error instanceof Error && error.message) || fallback,
      life: 5000,
    });
  };

  const applyPreset = (preset: HistoryPeriodPreset) => {
    const { start, end } = computeHistoryPeriodRange(preset, new Date());
    setStartDate(start);
    setEndDate(end);
    setActivePreset(preset);
  };

  const accountOptions = useMemo(() => {
    const names = new Set<string>();
    rows.forEach(r => {
      if (r.accountName) names.add(r.accountName);
    });
    return [
      { label: 'All accounts', value: null },
      ...Array.from(names)
        .sort()
        .map(name => ({ label: name, value: name })),
    ];
  }, [rows]);

  const exchangeOptions = useMemo(() => {
    const names = new Set<string>();
    rows.forEach(r => names.add(r.exchange ?? 'Unknown'));
    return [
      { label: 'All exchanges', value: null },
      ...Array.from(names)
        .sort()
        .map(name => ({ label: name, value: name })),
    ];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const matchesAccount =
        !accountFilter || (r.accountName ?? undefined) === accountFilter;
      const matchesExchange =
        !exchangeFilter || (r.exchange ?? 'Unknown') === exchangeFilter;
      return matchesAccount && matchesExchange;
    });
  }, [rows, accountFilter, exchangeFilter]);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { exchange: string; accountName?: string; trades: ClosedTrade[] }
    >();
    filtered.forEach(r => {
      const exchange = r.exchange ?? 'Unknown';
      const accountName = r.accountName;
      const key = `${accountName ?? ''}||${exchange}`;
      if (!map.has(key)) map.set(key, { exchange, accountName, trades: [] });
      map.get(key)!.trades.push(r);
    });
    return Array.from(map.values()).sort((a, b) => {
      const accCompare = (a.accountName ?? '').localeCompare(
        b.accountName ?? ''
      );
      return accCompare !== 0
        ? accCompare
        : a.exchange.localeCompare(b.exchange);
    });
  }, [filtered]);

  return (
    <div className='min-h-screen bg-[--tr-bg] p-4'>
      <div className='max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl 3xl:max-w-[1800px] mx-auto space-y-6'>
        <PageHeader
          title='History'
          subtitle='Closed positions across your accounts and exchanges'
        />
        <Card>
          <div className='flex flex-wrap gap-1 mb-3'>
            {PERIOD_PRESETS.map(preset => (
              <button
                key={preset.value}
                onClick={() => applyPreset(preset.value)}
                className={`min-h-10 px-3 inline-flex items-center justify-center text-xs rounded border transition select-none ${
                  activePreset === preset.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className='flex flex-wrap gap-3 items-end'>
            <div>
              <label
                className='block text-sm font-medium mb-1'
                style={{ color: 'var(--tr-text-2)' }}
              >
                From
              </label>
              <Calendar
                value={(() => {
                  const parts = startDate.split('-').map(Number);
                  return parts.length === 3 && parts[0] > 0
                    ? new Date(parts[0], parts[1] - 1, parts[2])
                    : null;
                })()}
                onChange={e => {
                  const d = e.value as Date | null;
                  setActivePreset(null);
                  if (d) {
                    const y = d.getFullYear();
                    const mo = String(d.getMonth() + 1).padStart(2, '0');
                    const dy = String(d.getDate()).padStart(2, '0');
                    setStartDate(`${y}-${mo}-${dy}`);
                  } else {
                    setStartDate('');
                  }
                }}
                dateFormat='dd/mm/yy'
                mask='99/99/9999'
                readOnlyInput={false}
                inputRef={input => {
                  if (input) input.inputMode = 'numeric';
                }}
                showIcon
                placeholder='DD/MM/YYYY'
              />
            </div>
            <div>
              <label
                className='block text-sm font-medium mb-1'
                style={{ color: 'var(--tr-text-2)' }}
              >
                To
              </label>
              <Calendar
                value={(() => {
                  const parts = endDate.split('-').map(Number);
                  return parts.length === 3 && parts[0] > 0
                    ? new Date(parts[0], parts[1] - 1, parts[2])
                    : null;
                })()}
                onChange={e => {
                  const d = e.value as Date | null;
                  setActivePreset(null);
                  if (d) {
                    const y = d.getFullYear();
                    const mo = String(d.getMonth() + 1).padStart(2, '0');
                    const dy = String(d.getDate()).padStart(2, '0');
                    setEndDate(`${y}-${mo}-${dy}`);
                  } else {
                    setEndDate('');
                  }
                }}
                dateFormat='dd/mm/yy'
                mask='99/99/9999'
                readOnlyInput={false}
                inputRef={input => {
                  if (input) input.inputMode = 'numeric';
                }}
                showIcon
                placeholder='DD/MM/YYYY'
              />
            </div>
            <div>
              <label
                className='block text-sm font-medium mb-1'
                style={{ color: 'var(--tr-text-2)' }}
              >
                Account
              </label>
              <Dropdown
                value={accountFilter}
                options={accountOptions}
                onChange={e => setAccountFilter(e.value ?? null)}
                optionLabel='label'
                optionValue='value'
                placeholder='All accounts'
                className='w-12rem'
              />
            </div>
            <div>
              <label
                className='block text-sm font-medium mb-1'
                style={{ color: 'var(--tr-text-2)' }}
              >
                Exchange
              </label>
              <Dropdown
                value={exchangeFilter}
                options={exchangeOptions}
                onChange={e => setExchangeFilter(e.value ?? null)}
                optionLabel='label'
                optionValue='value'
                placeholder='All exchanges'
                className='w-12rem'
              />
            </div>
            <Button
              label='Reset'
              outlined
              onClick={() => {
                setStartDate(defaultStart);
                setEndDate(defaultEnd);
                setActivePreset(null);
                setAccountFilter(null);
                setExchangeFilter(null);
              }}
            />
          </div>
        </Card>

        {truncated && (
          <Message
            severity='warn'
            text={`Showing the ${rows.length} most recent of ${data?.total} closed positions in this period. Narrow the date range to see the rest.`}
          />
        )}

        {isLoading ? (
          <Card>
            <div className='p-4 text-center text-gray-400'>
              <i className='pi pi-spin pi-spinner mr-2' />
              Loading history…
            </div>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <div className='p-4 text-center text-blue-600'>
              No closed positions recorded yet
            </div>
          </Card>
        ) : (
          groups.map(group => (
            <ExchangeTable
              key={`${group.accountName ?? ''}||${group.exchange}`}
              exchange={group.exchange}
              accountName={group.accountName}
              trades={group.trades}
              usageFor={usageFor}
              onEdit={trade => {
                setActive(trade);
                setShowDialog(true);
              }}
            />
          ))
        )}

        {showDialog && active && (
          <EditClosedTradeDialog
            trade={active}
            reportUsage={usageFor(active)}
            onHide={() => {
              setShowDialog(false);
              setActive(null);
            }}
            onSave={async (updated: ClosedTrade) => {
              const updates: Promise<unknown>[] = [];

              if (
                updated.positionId &&
                updated.buyComments !== active.buyComments
              ) {
                updates.push(
                  updatePosition({
                    id: updated.positionId,
                    payload: { openReason: updated.buyComments ?? null },
                  })
                );
              }

              if (updated.id) {
                updates.push(
                  updateCloseEvent({
                    id: updated.id,
                    data: {
                      closeDate: updated.closeDate,
                      exitPrice: updated.sellPrice,
                      sellFees: updated.sellFee,
                      notes: updated.sellComments ?? '',
                    },
                  })
                );
              }

              try {
                await Promise.all(updates);
                setShowDialog(false);
                setActive(null);
              } catch (error) {
                showWriteError('save this closed position', error);
              }
            }}
            onDeletePosition={async (positionId: string) => {
              if (!positionId) return;
              try {
                await deletePosition(positionId);
                setShowDialog(false);
                setActive(null);
              } catch (error) {
                showWriteError('delete this position', error);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
