'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { exchangeLabel, isCryptoExchange } from '@/lib/crypto';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import type {
  ClosedTrade,
  DraftSaleCorrectionInput,
  LiveImportedExecutionCorrectionMetadata,
  LiveSaleCorrectionMetadata,
  TaxReportUsage,
} from '@/lib/types';
import EditClosedTradeDialog from '@/components/EditClosedTradeDialog';
import LiveAcquisitionCorrectionDialog from '@/components/LiveAcquisitionCorrectionDialog';
import LiveImportedExecutionCorrectionDialog from '@/components/LiveImportedExecutionCorrectionDialog';
import ManualTradeVoidDialog from '@/components/ManualTradeVoidDialog';
import ManualTradeVoidHistory from '@/components/ManualTradeVoidHistory';
import PageHeader from '@/components/PageHeader';
import {
  useClosedPositions,
  useCorrectLiveManualSale,
  useDeletePosition,
  useTaxReportPositionUsage,
  useTradingAccounts,
  useUpdateCloseEvent,
  useUpdatePosition,
} from '@/hooks/api';
import {
  computeHistoryPeriodRange,
  formatDateDDMMYYYY,
  type HistoryPeriodPreset,
} from '@/lib/date';
import { formatCurrency, formatPct, returnClass } from '@/lib/format';
import { closeReasonLabel } from '@/lib/close-reason';
import { closedTradeAmounts } from '@/lib/closed-trade-math';
import { usePrivacy } from '@/lib/privacy-context';
import { useToast } from '@/lib/toast-context';
import { mutationErrorMessage } from '@/lib/mutation-error';

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
      const a = closedTradeAmounts(r);
      acc.open += a.open;
      acc.close += a.close;
      acc.pl += a.pl;
      acc.cost += a.cost;
      return acc;
    },
    { open: 0, close: 0, pl: 0, cost: 0 }
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
  const [showAllColumns, setShowAllColumns] = useState(false);
  const totals = calcTotals(trades);
  const plPct = totals.cost > 0 ? totals.pl / totals.cost : 0;
  const groupCurrency = trades[0]?.baseCurrency ?? 'USD';
  const { mask, hidden } = usePrivacy();

  return (
    <Card>
      <div
        className='pb-3 mb-3 border-b flex flex-wrap items-center justify-between gap-2'
        style={{ borderColor: 'var(--tr-border)' }}
      >
        <h3
          className='text-base font-semibold'
          style={{ color: 'var(--tr-text)' }}
        >
          {exchangeLabel(exchange)}
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
      <div className='flex items-center justify-between gap-2 mb-3 md:hidden'>
        <p className='text-xs' style={{ color: 'var(--tr-text-2)' }}>
          Tap a symbol to view or edit.
        </p>
        <Button
          label={showAllColumns ? 'Summary' : 'All columns'}
          aria-pressed={showAllColumns}
          size='small'
          text
          onClick={() => setShowAllColumns(current => !current)}
        />
      </div>
      <div className='table-region'>
        <DataTable
          value={trades}
          size='small'
          scrollable
          paginator
          rows={25}
          rowsPerPageOptions={[25, 50, 100]}
          stripedRows
          className={`holdings-table history-table${showAllColumns ? '' : ' history-table--compact'}`}
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
            body={(r: ClosedTrade) =>
              mask(
                isCryptoExchange(r.exchange)
                  ? r.unitsClosed.toLocaleString('en-AU', {
                      maximumFractionDigits: 12,
                    })
                  : r.unitsClosed.toFixed(3)
              )
            }
            style={{ minWidth: '130px' }}
          />
          <Column
            header='Buy Price'
            body={(r: ClosedTrade) =>
              formatCurrency(
                r.buyPrice,
                r.baseCurrency ?? groupCurrency,
                isCryptoExchange(r.exchange) ? 12 : 3
              )
            }
            style={{ minWidth: '120px' }}
          />
          <Column
            header='Sell Price'
            body={(r: ClosedTrade) =>
              formatCurrency(
                r.sellPrice,
                r.baseCurrency ?? groupCurrency,
                isCryptoExchange(r.exchange) ? 12 : 3
              )
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
                  closedTradeAmounts(r).open,
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
                  closedTradeAmounts(r).close,
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
              const { pl } = closedTradeAmounts(r);
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
              const pct = closedTradeAmounts(r).returnFraction;
              return (
                <span className={returnClass(pct, hidden)}>
                  {formatPct(pct)}
                </span>
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
            header='Max Run-up %'
            body={(r: ClosedTrade) =>
              r.maxRunUpPercent != null && r.maxRunUpPercent > 0 ? (
                <span className={hidden ? 'text-gray-500' : 'text-green-600'}>
                  +{r.maxRunUpPercent.toFixed(2)}%
                </span>
              ) : (
                <span className='text-gray-400'>—</span>
              )
            }
            style={{ minWidth: '150px' }}
          />
          <Column
            header='Closed By'
            body={(r: ClosedTrade) => {
              return closeReasonLabel(
                r.closeReason,
                closedTradeAmounts(r).returnFraction
              );
            }}
            style={{ minWidth: '170px' }}
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
      </div>
    </Card>
  );
}

export default function HistoryPage() {
  const { show: showToast } = useToast();
  const { mutateAsync: updateCloseEvent } = useUpdateCloseEvent();
  const { mutateAsync: updatePosition } = useUpdatePosition();
  const { mutateAsync: correctLiveManualSale } = useCorrectLiveManualSale();
  const [voidTrade, setVoidTrade] = useState<{
    accountId: string;
    transactionId: string;
    symbol: string;
    kind: 'BUY' | 'SELL';
    metadata: LiveSaleCorrectionMetadata;
  } | null>(null);
  const [acquisitionTrade, setAcquisitionTrade] = useState<ClosedTrade | null>(
    null
  );
  const [importedCorrection, setImportedCorrection] = useState<{
    accountId: string;
    symbol: string;
    correction: LiveImportedExecutionCorrectionMetadata;
  } | null>(null);
  const { mutateAsync: deletePosition } = useDeletePosition();
  const currentYear = new Date().getFullYear();
  const defaultStart = `${currentYear}-01-01`;
  const defaultEnd = `${currentYear}-12-31`;
  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);

  // Account and close-date range are the server-side scope ("All accounts" excludes
  // demo accounts on the server); exchange is sliced client-side so its dropdown
  // keeps listing every option in range.
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('accountId')) setAccountFilter(params.get('accountId'));
    if (params.get('period') === 'all') {
      setStartDate('');
      setEndDate('');
    }
  }, []);
  const { data, isLoading } = useClosedPositions({
    accountId: accountFilter ?? undefined,
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
  const [exchangeFilter, setExchangeFilter] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [active, setActive] = useState<ClosedTrade | null>(null);

  const showWriteError = (action: string, error: unknown) => {
    const fallback = `Could not ${action}. Please try again.`;
    showToast({
      severity: 'error',
      summary: 'Action failed',
      detail: mutationErrorMessage(error, fallback),
      life: 5000,
    });
  };

  const applyPreset = (preset: HistoryPeriodPreset) => {
    const { start, end } = computeHistoryPeriodRange(preset, new Date());
    setStartDate(start);
    setEndDate(end);
    setActivePreset(preset);
  };

  const { data: accounts = [] } = useTradingAccounts(true);
  const accountOptions = useMemo(
    () => [
      { label: 'All accounts', value: null as string | null },
      ...[...accounts]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(a => ({
          label: a.isDemo ? `${a.name} (Demo)` : a.name,
          value: a.id as string | null,
        })),
    ],
    [accounts]
  );

  const exchangeOptions = useMemo(() => {
    const names = new Set<string>();
    rows.forEach(r => names.add(r.exchange ?? 'Unknown'));
    return [
      { label: 'All exchanges', value: null },
      ...Array.from(names)
        .sort()
        .map(name => ({ label: exchangeLabel(name), value: name })),
    ];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      return !exchangeFilter || (r.exchange ?? 'Unknown') === exchangeFilter;
    });
  }, [rows, exchangeFilter]);

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
    <div className='app-page'>
      <div className='space-y-5'>
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
          <div className='filter-grid items-end'>
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
                className='w-full'
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
                className='w-full'
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
            onVoidSale={
              active.cashCorrection && active.accountId && active.id
                ? () => {
                    setVoidTrade({
                      accountId: active.accountId!,
                      transactionId: active.id!,
                      symbol: active.symbol,
                      kind: 'SELL',
                      metadata: active.cashCorrection!,
                    });
                    setShowDialog(false);
                    setActive(null);
                  }
                : undefined
            }
            onVoidAcquisition={
              active.acquisitionCorrection && active.accountId
                ? () => {
                    setVoidTrade({
                      accountId: active.accountId!,
                      transactionId:
                        active.acquisitionCorrection!.transactionId,
                      symbol: active.symbol,
                      kind: 'BUY',
                      metadata: active.acquisitionCorrection!,
                    });
                    setShowDialog(false);
                    setActive(null);
                  }
                : undefined
            }
            onCorrectAcquisition={
              active.acquisitionCorrection && active.accountId
                ? () => {
                    setAcquisitionTrade(active);
                    setShowDialog(false);
                    setActive(null);
                  }
                : undefined
            }
            onCorrectImportedExecution={
              active.importedExecutionCorrection && active.accountId
                ? () => {
                    setImportedCorrection({
                      accountId: active.accountId!,
                      symbol: active.symbol,
                      correction: active.importedExecutionCorrection!,
                    });
                    setShowDialog(false);
                    setActive(null);
                  }
                : undefined
            }
            onCorrectImportedAcquisition={
              active.importedAcquisitionCorrection && active.accountId
                ? () => {
                    setImportedCorrection({
                      accountId: active.accountId!,
                      symbol: active.symbol,
                      correction: active.importedAcquisitionCorrection!,
                    });
                    setShowDialog(false);
                    setActive(null);
                  }
                : undefined
            }
            reportUsage={usageFor(active)}
            onHide={() => {
              setShowDialog(false);
              setActive(null);
            }}
            onSave={async (
              updated: ClosedTrade,
              correction?: DraftSaleCorrectionInput
            ) => {
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

              const closeEventUpdate = {
                ...(!correction && updated.closeDate !== active.closeDate
                  ? { closeDate: updated.closeDate }
                  : {}),
                ...(!correction && updated.sellPrice !== active.sellPrice
                  ? { exitPrice: updated.sellPrice }
                  : {}),
                ...(!correction && updated.sellFee !== active.sellFee
                  ? { sellFees: updated.sellFee }
                  : {}),
                ...(updated.sellComments !== active.sellComments
                  ? { notes: updated.sellComments ?? '' }
                  : {}),
                ...(updated.closeReason !== active.closeReason
                  ? { closeReason: updated.closeReason ?? null }
                  : {}),
              };

              if (updated.id && Object.keys(closeEventUpdate).length > 0) {
                updates.push(
                  updateCloseEvent({
                    id: updated.id,
                    data: closeEventUpdate,
                  })
                );
              }

              try {
                await Promise.all(updates);
                if (correction) {
                  if (!updated.id || !active.accountId)
                    throw new Error(
                      'This sale is missing its account or transaction identity.'
                    );
                  await correctLiveManualSale({
                    accountId: active.accountId,
                    transactionId: updated.id,
                    input: correction,
                  });
                }
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
        {voidTrade && (
          <ManualTradeVoidDialog
            {...voidTrade}
            onHide={() => setVoidTrade(null)}
            onSaved={() => {
              setVoidTrade(null);
              showToast({
                severity: 'success',
                summary: 'Trade voided',
                detail:
                  'Inventory and cash updated. Original records retained for audit.',
              });
            }}
          />
        )}
        {accountFilter &&
          !accounts.find(account => account.id === accountFilter)?.isDemo && (
            <ManualTradeVoidHistory
              key={accountFilter}
              accountId={accountFilter}
            />
          )}
        {acquisitionTrade?.accountId &&
          acquisitionTrade.acquisitionCorrection && (
            <LiveAcquisitionCorrectionDialog
              accountId={acquisitionTrade.accountId}
              symbol={acquisitionTrade.symbol}
              correction={acquisitionTrade.acquisitionCorrection}
              onHide={() => setAcquisitionTrade(null)}
              onSaved={() => {
                setAcquisitionTrade(null);
                showToast({
                  severity: 'success',
                  summary: 'Acquisition corrected',
                  detail:
                    'Cash and parcel results were updated with an audit revision.',
                });
              }}
            />
          )}
        {importedCorrection && (
          <LiveImportedExecutionCorrectionDialog
            accountId={importedCorrection.accountId}
            symbol={importedCorrection.symbol}
            correction={importedCorrection.correction}
            onHide={() => setImportedCorrection(null)}
            onSaved={() => {
              setImportedCorrection(null);
              showToast({
                severity: 'success',
                summary: 'Imported execution corrected',
                detail:
                  'Cash and parcel results were updated with an audit revision.',
              });
            }}
          />
        )}
      </div>
    </div>
  );
}
