'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import ImportUploadDialog from '@/components/ImportUploadDialog';
import PositionDetailsDialog from '@/components/PositionDetailsDialog';
import LiveAcquisitionCorrectionDialog from '@/components/LiveAcquisitionCorrectionDialog';
import ManualTradeVoidDialog from '@/components/ManualTradeVoidDialog';
import LiveImportedExecutionCorrectionDialog from '@/components/LiveImportedExecutionCorrectionDialog';
import QueryFeedback from './QueryFeedback';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Skeleton } from 'primereact/skeleton';
import AddHoldingsDialog, {
  LocalHolding,
} from '@/components/AddHoldingsDialog';
import ClosePositionDialog, {
  ClosePositionPayload,
} from '@/components/ClosePositionDialog';
import type { ExchangeKey } from '@/lib/types';
import {
  enqueueQueuedWrite,
  syncQueuedWritesNow,
  type QueuedWriteActionInput,
} from '@/lib/offline-write-queue';
import { useToast } from '@/lib/toast-context';
import { mutationErrorMessage } from '@/lib/mutation-error';
import {
  formatCurrency,
  formatNumber,
  formatPct,
  returnClass,
} from '@/lib/format';
import { exchangeLabel, isCryptoExchange } from '@/lib/crypto';
import { usePrivacy } from '@/lib/privacy-context';
import { useHoldingRows, type HoldingRow } from '@/hooks/useHoldingRows';
import {
  useClosePosition,
  useCreatePosition,
  useDeletePosition,
  useUpdatePosition,
} from '@/hooks/api';

function StopLossTriggeredMark({ inGain = false }: { inGain?: boolean }) {
  return (
    <i
      className={`pi pi-exclamation-triangle text-xs stop-loss-triggered-icon${
        inGain ? ' stop-loss-in-gain-icon' : ''
      }`}
      role='img'
      title='Stop loss triggered'
      aria-label='Stop loss triggered'
    />
  );
}

/** Gains are only tinted in demo accounts; otherwise a triggered stop gets the stop-loss tint. */
function isGainHighlighted(r: HoldingRow, isDemo: boolean) {
  return isDemo && r.currentReturnAbs > 0;
}

/**
 * A stop triggered while the position is still above its entry (e.g. a trailing stop)
 * is a locked-in gain, so the gain tint wins over the stop-loss tint.
 */
function rowHighlightClass(r: HoldingRow, isDemo: boolean) {
  if (isGainHighlighted(r, isDemo)) return 'position-in-gain';
  if (r.stopLossTriggered) return 'stop-loss-triggered';
  return '';
}

export default function HoldingsTable({
  selectedAccountId,
  selectedAccountName,
  isDemo = false,
  selectedExchange,
  onExchangeDetected,
  onExchangeSelected,
  baseCurrency,
  onLiveTotals,
}: {
  selectedAccountId: string;
  selectedAccountName?: string;
  isDemo?: boolean;
  selectedExchange?: ExchangeKey;
  onExchangeDetected?: (exchange: string) => void;
  onExchangeSelected?: (exchange: string) => void;
  baseCurrency?: string;
  onLiveTotals?: (t: {
    totalEquity: number;
    totalPL: number;
    dayPL: number;
  }) => void;
}) {
  const online = useNetworkStatus();
  const tableId = useId();
  const [showAdvancedColumns, setShowAdvancedColumns] = useState(false);
  const [voidHolding, setVoidHolding] = useState<LocalHolding | null>(null);
  const [detailsSelection, setDetailsSelection] = useState<{
    id?: string;
    index: number;
    accountId: string;
    exchange?: ExchangeKey;
  } | null>(null);
  const queryClient = useQueryClient();
  const { show: showToast } = useToast();
  const { mask, hidden } = usePrivacy();
  const { mutateAsync: createPosition, isPending: creating } =
    useCreatePosition();
  const { mutateAsync: updatePosition, isPending: updating } =
    useUpdatePosition();
  const { mutateAsync: closePosition } = useClosePosition();
  const { mutateAsync: deletePosition } = useDeletePosition();
  const [submitError, setSubmitError] = useState<string>('');

  const {
    holdings,
    setHoldings,
    rows,
    totals,
    quoteMap,
    currency,
    anyStopLoss,
    tableScrollHeight,
    handleResetMaxDrawdown,
    handleResetMaxRunUp,
    handleRecalculateDrawdown,
    holdingsQuery,
    quotesQuery,
    realizedQuery,
  } = useHoldingRows({
    selectedExchange,
    selectedAccountId,
    baseCurrency,
    onExchangeDetected,
    onLiveTotals,
  });

  const [showDialog, setShowDialog] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [correctionHolding, setCorrectionHolding] =
    useState<LocalHolding | null>(null);
  const [importedCorrectionHolding, setImportedCorrectionHolding] =
    useState<LocalHolding | null>(null);
  const [dialogInitial, setDialogInitial] = useState<
    Partial<LocalHolding> | undefined
  >(undefined);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeIdx, setCloseIdx] = useState<number | null>(null);
  const [closeInitial, setCloseInitial] = useState<LocalHolding | null>(null);
  const replayInFlightRef = useRef(false);

  const detailsRow =
    detailsSelection?.accountId === selectedAccountId &&
    detailsSelection.exchange === selectedExchange
      ? rows.find(row =>
          detailsSelection.id
            ? row.id === detailsSelection.id
            : row.originalIndex === detailsSelection.index
        )
      : undefined;

  const openDetails = (row: HoldingRow) => {
    setDetailsSelection({
      id: row.id,
      index: row.originalIndex,
      accountId: selectedAccountId,
      exchange: selectedExchange,
    });
  };

  const openEdit = (row: HoldingRow) => {
    setDetailsSelection(null);
    setSubmitError('');
    setMode('edit');
    setEditIdx(row.originalIndex);
    setDialogInitial({
      ...row,
      currentPrice: row.currentPrice ?? row.buyPrice,
    });
    setShowDialog(true);
  };

  const openClose = (row: HoldingRow) => {
    setDetailsSelection(null);
    setCloseIdx(row.originalIndex);
    setCloseInitial({ ...row, currentPrice: row.effectivePrice });
    setShowCloseDialog(true);
  };

  const openAdd = () => {
    setSubmitError('');
    setMode('add');
    setEditIdx(null);
    setDialogInitial(undefined);
    setShowDialog(true);
  };

  const isOnline = () => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  };

  const queueWrite = (action: QueuedWriteActionInput, detail: string) => {
    const pending = enqueueQueuedWrite(action);
    setSubmitError('');
    showToast({
      severity: 'info',
      summary: 'Saved Offline',
      detail: `${detail} Syncs automatically when you are online. Pending: ${pending}`,
      life: 4500,
    });
  };

  const ensureOnlineForImmediateWrite = (action: string) => {
    if (isOnline()) {
      return true;
    }

    const message = `You are offline. Reconnect to ${action}.`;
    setSubmitError(message);
    showToast({
      severity: 'warn',
      summary: 'Offline',
      detail: message,
      life: 4000,
    });
    return false;
  };

  const invalidateAfterWrite = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['holdings'] });
    await queryClient.invalidateQueries({ queryKey: ['closed-positions'] });
    await queryClient.invalidateQueries({ queryKey: ['portfolio-history'] });
    await queryClient.invalidateQueries({ queryKey: ['user-portfolio'] });
    if (selectedAccountId) {
      await queryClient.invalidateQueries({
        queryKey: ['user-portfolio', selectedAccountId],
      });
    }
  }, [queryClient, selectedAccountId]);

  const syncQueuedWrites = useCallback(async () => {
    if (replayInFlightRef.current || !isOnline()) {
      return;
    }

    replayInFlightRef.current = true;
    try {
      const { processed, remaining } = await syncQueuedWritesNow();

      if (processed > 0) {
        await invalidateAfterWrite();
        showToast({
          severity: 'success',
          summary: 'Synced',
          detail: `${processed} queued change${processed === 1 ? '' : 's'} synced.`,
          life: 3500,
        });
      }

      if (remaining > 0 && isOnline()) {
        showToast({
          severity: 'warn',
          summary: 'Sync Paused',
          detail: `${remaining} queued change${remaining === 1 ? '' : 's'} still pending.`,
          life: 4000,
        });
      }
    } finally {
      replayInFlightRef.current = false;
    }
  }, [invalidateAfterWrite, showToast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onOnline = () => {
      void syncQueuedWrites();
    };

    window.addEventListener('online', onOnline);
    void syncQueuedWrites();

    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, [syncQueuedWrites]);

  const showWriteError = (action: string, error: unknown) => {
    const fallback = `Could not ${action}. Please try again.`;
    const detail = mutationErrorMessage(error, fallback);
    setSubmitError(detail || fallback);
    showToast({
      severity: 'error',
      summary: 'Action failed',
      detail: detail || fallback,
      life: 5000,
    });
  };

  const handleDeletePosition = async () => {
    if (editIdx === null) return;
    const current = holdings[editIdx];
    if (!current?.id) return;

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `Delete position ${current.symbol}? This cannot be undone.`
      );
      if (!confirmed) return;
    }

    if (!ensureOnlineForImmediateWrite('delete this position')) {
      return;
    }

    try {
      await deletePosition(current.id);
      setHoldings(prev => prev.filter((_, index) => index !== editIdx));
      setShowDialog(false);
      setEditIdx(null);
      setDialogInitial(undefined);
      showToast({
        severity: 'success',
        summary: 'Deleted',
        detail: `Position ${current.symbol} deleted.`,
        life: 3500,
      });
    } catch (error) {
      showWriteError('delete position', error);
    }
  };

  // Dialog state is managed inside AddHoldingsDialog

  return (
    <Card className='holdings-panel'>
      <div className='holdings-header mb-4 border-b border-gray-200'>
        <h3 className='text-xl font-semibold text-gray-900'>
          Holdings
          {selectedAccountName ? ` · ${selectedAccountName}` : ''}
          {selectedExchange ? ` · ${exchangeLabel(selectedExchange)}` : ''}
        </h3>
        <div className='holdings-header-actions'>
          {rows.length > 0 && (
            <Button
              type='button'
              label='Advanced columns'
              icon='pi pi-sliders-h'
              outlined
              severity='secondary'
              size='small'
              className='holdings-column-toggle'
              aria-pressed={showAdvancedColumns}
              aria-controls={tableId}
              onClick={() => setShowAdvancedColumns(value => !value)}
            />
          )}
          {!isDemo && (
            <Button
              icon='pi pi-upload'
              rounded
              outlined
              severity='secondary'
              aria-label='Import from exchange'
              tooltip='Import from exchange'
              tooltipOptions={{ position: 'bottom' }}
              className='!w-11 !h-11'
              onClick={() => setShowImportDialog(true)}
            />
          )}
          <Button
            icon='pi pi-plus'
            label='Add position'
            aria-label='Add Position'
            className='portfolio-primary-action'
            onClick={openAdd}
          />
        </div>
      </div>
      {holdingsQuery && (
        <QueryFeedback
          label='Holdings'
          isError={holdingsQuery.isError}
          isFetching={holdingsQuery.isFetching}
          hasData={holdingsQuery.data !== undefined}
          onRetry={() => void holdingsQuery.refetch()}
        />
      )}
      {rows.length > 0 && quotesQuery && (
        <>
          <QueryFeedback
            label='Quotes'
            showOffline={false}
            isError={quotesQuery.isError}
            isFetching={quotesQuery.isFetching}
            hasData={quotesQuery.data !== undefined}
            onRetry={() => void quotesQuery.refetch()}
          />
          <p className='text-xs text-gray-500 my-3' role='status'>
            {quotesQuery.isFetching
              ? 'Updating quotes…'
              : quotesQuery.dataUpdatedAt > 0
                ? `Quotes last fetched ${new Date(quotesQuery.dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
                : 'No live quotes loaded yet.'}{' '}
            Quote fetch time is not the exchange trading time.
          </p>
          {rows.some(row => !quoteMap.has(row.symbol)) &&
            !isCryptoExchange(selectedExchange) && (
              <Message
                severity='warn'
                text='Some live prices are unavailable. Those positions use stored prices; returns are estimates and daily movement may be incomplete.'
              />
            )}
        </>
      )}
      {realizedQuery?.isError && (
        <QueryFeedback
          label='Realised P/L'
          showOffline={false}
          isError
          isFetching={realizedQuery.isFetching}
          hasData={realizedQuery.data !== undefined}
          onRetry={() => void realizedQuery.refetch()}
        />
      )}

      {submitError && (
        <div className='mb-3 text-sm text-red-600'>{submitError}</div>
      )}
      {isCryptoExchange(selectedExchange) && rows.length > 0 && (
        <Message
          severity={
            rows.some(row => !quoteMap.has(row.symbol)) ? 'warn' : 'info'
          }
          className='mb-3'
          text={
            rows.some(row => !quoteMap.has(row.symbol))
              ? 'Some live crypto prices are unavailable. Those positions use their stored price; returns are estimates. Daily crypto changes are not available.'
              : 'Crypto values are shown in the selected purchase currency. Daily changes are not available.'
          }
        />
      )}

      {online && holdingsQuery?.isLoading && rows.length === 0 ? (
        <div role='status' aria-label='Loading holdings' className='space-y-3'>
          {[0, 1, 2].map(key => (
            <Skeleton key={key} height='2.75rem' />
          ))}
        </div>
      ) : rows.length === 0 ? (
        holdingsQuery?.isError ||
        (!online && holdingsQuery?.data === undefined) ? null : (
          <div className='portfolio-empty-state'>
            <h4 className='font-semibold'>No open positions yet</h4>
            <p className='text-sm text-gray-500'>
              Add a purchase to start tracking this portfolio
              {!isDemo ? ', or import your exchange trades.' : '.'}
            </p>
            <div className='flex flex-wrap justify-center gap-2'>
              <Button
                label='Add your first position'
                icon='pi pi-plus'
                onClick={openAdd}
              />
              {!isDemo && (
                <Button
                  label='Import trades'
                  icon='pi pi-upload'
                  outlined
                  onClick={() => setShowImportDialog(true)}
                />
              )}
            </div>
          </div>
        )
      ) : (
        <>
          {/* Mobile portrait: compact 4-column table */}
          <div className='block md:hidden holdings-portrait-cards'>
            {/* Header */}
            <div className='grid grid-cols-4 gap-x-1 pb-1 border-b border-gray-200'>
              <div className='text-[10px] font-semibold text-gray-400 uppercase tracking-wide'>
                Symbol
              </div>
              <div className='text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right'>
                Position
              </div>
              <div className='text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right'>
                Day
              </div>
              <div className='text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right'>
                Return
              </div>
            </div>
            {/* Rows */}
            <div className='divide-y divide-gray-100'>
              {rows.map((r, cardIdx) => {
                const q = quoteMap.get(r.symbol);
                const dayAbs = q?.change != null ? q.change * r.units : null;
                const dayPct = q?.changePercent ?? null;
                return (
                  <div
                    key={`${r.symbol}-${r.openDate}-${cardIdx}`}
                    className={`grid grid-cols-4 gap-x-1 py-2 items-center min-w-0${
                      rowHighlightClass(r, isDemo)
                        ? ` ${rowHighlightClass(r, isDemo)}`
                        : ''
                    }`}
                  >
                    {/* Col 1: Symbol + Units */}
                    <div className='min-w-0'>
                      <button
                        className='font-semibold text-blue-600 text-xs hover:underline block truncate max-w-full'
                        title='View position details'
                        onClick={() => openDetails(r)}
                      >
                        {r.symbol}
                      </button>
                      {r.stopLossTriggered && (
                        <StopLossTriggeredMark
                          inGain={isGainHighlighted(r, isDemo)}
                        />
                      )}
                      <span className='text-gray-400 block text-[10px]'>
                        {mask(formatNumber(r.units))}
                      </span>
                    </div>
                    {/* Col 2: Current Position */}
                    <div className='text-right min-w-0'>
                      <button
                        className='text-blue-600 hover:underline text-xs block w-full text-right truncate'
                        title='Close position'
                        onClick={() => openClose(r)}
                      >
                        {mask(formatCurrency(r.currentPosition, currency))}
                      </button>
                    </div>
                    {/* Col 3: Day Change */}
                    <div className='text-right min-w-0'>
                      {dayAbs !== null ? (
                        <span
                          className={`text-xs ${returnClass(dayAbs, hidden)}`}
                        >
                          <span className='block truncate'>
                            {mask(formatCurrency(dayAbs, currency))}
                          </span>
                          {dayPct !== null && (
                            <span className='text-[10px] opacity-75'>
                              ({dayPct >= 0 ? '+' : ''}
                              {dayPct.toFixed(2)}%)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className='text-gray-400 text-xs'>—</span>
                      )}
                    </div>
                    {/* Col 4: Total Return */}
                    <div className='text-right min-w-0'>
                      <span
                        className={`text-xs ${returnClass(r.currentReturnAbs, hidden)}`}
                      >
                        <span className='block truncate'>
                          {mask(formatCurrency(r.currentReturnAbs, currency))}
                        </span>
                        <span className='text-[10px] opacity-75'>
                          {formatPct(r.currentReturnPct)}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Totals row */}
            <div
              className='grid grid-cols-4 gap-x-1 mt-2 rounded-lg px-2 py-2 items-center'
              style={{ backgroundColor: 'var(--tr-brand-bg)' }}
            >
              <div className='min-w-0'>
                <span className='font-bold text-gray-700 text-[10px] uppercase tracking-wide block'>
                  Totals
                </span>
                <span className='text-gray-400 text-[10px]'>
                  {totals.count} pos
                </span>
              </div>
              <div className='text-right min-w-0'>
                <span className='font-semibold text-gray-900 text-xs block truncate'>
                  {mask(formatCurrency(totals.totalCurrent, currency))}
                </span>
              </div>
              <div className='text-right min-w-0'>
                {totals.dayPL !== 0 ? (
                  <span
                    className={`text-xs font-semibold ${returnClass(totals.dayPL, hidden)} block truncate`}
                  >
                    {mask(formatCurrency(totals.dayPL, currency))}
                  </span>
                ) : (
                  <span className='text-gray-400 text-xs'>—</span>
                )}
              </div>
              <div className='text-right min-w-0'>
                <span
                  className={`text-xs font-semibold ${returnClass(totals.currentReturnAbs, hidden)}`}
                >
                  <span className='block truncate'>
                    {mask(formatCurrency(totals.currentReturnAbs, currency))}
                  </span>
                  <span className='text-[10px] opacity-75'>
                    {formatPct(totals.currentReturnPct)}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Tablet/desktop: summary with optional advanced columns */}
          <div
            id={tableId}
            className='table-region hidden md:block holdings-landscape-table'
          >
            <DataTable
              value={rows}
              size='small'
              scrollable
              scrollHeight={tableScrollHeight}
              rowHover
              stripedRows
              rowClassName={(r: HoldingRow) => rowHighlightClass(r, isDemo)}
              className='holdings-table'
              cellMemo={false}
            >
              <Column
                header='Symbol'
                body={(r: HoldingRow) => (
                  <span className='inline-flex items-center gap-1'>
                    <button
                      className='font-semibold text-blue-600 hover:underline'
                      title='View position details'
                      onClick={() => openDetails(r)}
                    >
                      {r.symbol}
                    </button>
                    {r.stopLossTriggered && (
                      <StopLossTriggeredMark
                        inGain={isGainHighlighted(r, isDemo)}
                      />
                    )}
                  </span>
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
                body={(r: HoldingRow) => mask(formatNumber(r.units))}
                style={{ minWidth: '110px' }}
              />
              <Column
                header='Buy'
                hidden={!showAdvancedColumns}
                body={(r: HoldingRow) =>
                  formatCurrency(
                    r.buyPrice,
                    currency,
                    isCryptoExchange(r.exchangeCode) ? 12 : 3
                  )
                }
                style={{ minWidth: '120px' }}
              />
              <Column
                header='Open'
                hidden={!showAdvancedColumns}
                body={(r: HoldingRow) =>
                  mask(formatCurrency(r.openPosition, currency))
                }
                style={{ minWidth: '140px' }}
                footer={
                  <span>
                    <span className='font-semibold text-gray-900'>
                      {mask(formatCurrency(totals.totalOpen, currency))}
                    </span>
                  </span>
                }
              />
              <Column
                header='Price'
                body={(r: HoldingRow) =>
                  formatCurrency(
                    r.effectivePrice,
                    currency,
                    isCryptoExchange(r.exchangeCode) ? 12 : 3
                  )
                }
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
                    <span className={returnClass(dayAbs, hidden)}>
                      {mask(formatCurrency(dayAbs, currency))}{' '}
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
                    <span
                      className={`font-semibold ${returnClass(totals.dayPL, hidden)}`}
                    >
                      {mask(formatCurrency(totals.dayPL, currency))}
                    </span>
                  ) : null
                }
              />
              <Column
                header='Position value'
                body={(r: HoldingRow) => (
                  <button
                    className='text-blue-600 hover:underline'
                    title='Close position'
                    onClick={() => openClose(r)}
                  >
                    {mask(formatCurrency(r.currentPosition, currency))}
                  </button>
                )}
                style={{ minWidth: '150px' }}
                footer={
                  <span>
                    <span className='font-semibold text-gray-900'>
                      {mask(formatCurrency(totals.totalCurrent, currency))}
                    </span>
                  </span>
                }
              />
              <Column
                header='Return'
                body={(r: HoldingRow) => (
                  <span className={returnClass(r.currentReturnAbs, hidden)}>
                    {mask(formatCurrency(r.currentReturnAbs, currency))}
                  </span>
                )}
                style={{ minWidth: '130px' }}
                footer={
                  <span>
                    <span
                      className={`font-semibold ${returnClass(totals.currentReturnAbs, hidden)}`}
                    >
                      {mask(formatCurrency(totals.currentReturnAbs, currency))}
                    </span>
                  </span>
                }
              />
              <Column
                header='Return %'
                body={(r: HoldingRow) => (
                  <span className={returnClass(r.currentReturnPct, hidden)}>
                    {formatPct(r.currentReturnPct)}
                  </span>
                )}
                style={{ minWidth: '150px' }}
                footer={
                  <span
                    className={returnClass(totals.currentReturnPct, hidden)}
                  >
                    {formatPct(totals.currentReturnPct)}
                  </span>
                }
              />
              <Column
                header='Max Drawdown %'
                hidden={!showAdvancedColumns}
                body={(r: HoldingRow) => (
                  <span className='inline-flex items-center gap-1'>
                    {r.maxDrawdownPercent != null &&
                    r.maxDrawdownPercent > 0 ? (
                      <>
                        <span
                          className={hidden ? 'text-gray-500' : 'text-red-600'}
                        >
                          -{r.maxDrawdownPercent.toFixed(2)}%
                        </span>
                        <button
                          title='Reset max drawdown'
                          className='text-gray-300 hover:text-gray-500 leading-none'
                          onClick={() => handleResetMaxDrawdown(r)}
                        >
                          <i className='pi pi-times text-xs' />
                        </button>
                      </>
                    ) : (
                      <span className='text-gray-400'>—</span>
                    )}
                    <button
                      title='Recalculate from price history'
                      className='text-gray-300 hover:text-blue-500 leading-none'
                      onClick={() => handleRecalculateDrawdown(r)}
                    >
                      <i className='pi pi-history text-xs' />
                    </button>
                  </span>
                )}
                style={{ minWidth: '170px' }}
              />
              <Column
                header='Max Run-up %'
                hidden={!showAdvancedColumns}
                body={(r: HoldingRow) => (
                  <span className='inline-flex items-center gap-1'>
                    {r.maxRunUpPercent != null && r.maxRunUpPercent > 0 ? (
                      <>
                        <span
                          className={
                            hidden ? 'text-gray-500' : 'text-green-600'
                          }
                        >
                          +{r.maxRunUpPercent.toFixed(2)}%
                        </span>
                        <button
                          title='Reset max run-up'
                          className='text-gray-300 hover:text-gray-500 leading-none'
                          onClick={() => handleResetMaxRunUp(r)}
                        >
                          <i className='pi pi-times text-xs' />
                        </button>
                      </>
                    ) : (
                      <span className='text-gray-400'>—</span>
                    )}
                  </span>
                )}
                style={{ minWidth: '150px' }}
              />
              {anyStopLoss && (
                <Column
                  header='Stop Loss'
                  hidden={!showAdvancedColumns}
                  body={(r: HoldingRow) =>
                    typeof r.stopLoss === 'number' && r.stopLoss > 0
                      ? formatCurrency(
                          r.stopLoss,
                          currency,
                          isCryptoExchange(r.exchangeCode) ? 12 : 3
                        )
                      : '—'
                  }
                  style={{ minWidth: '120px' }}
                />
              )}
              {anyStopLoss && (
                <Column
                  header='SL Return'
                  hidden={!showAdvancedColumns}
                  body={(r: HoldingRow) =>
                    isNaN(r.stopLossPosition)
                      ? ''
                      : mask(formatCurrency(r.stopLossPosition, currency))
                  }
                  style={{ minWidth: '130px' }}
                />
              )}
              {anyStopLoss && (
                <Column
                  header='SL Return %'
                  hidden={!showAdvancedColumns}
                  body={(r: HoldingRow) =>
                    isNaN(r.stopLossReturnPct) ? (
                      ''
                    ) : (
                      <span
                        className={returnClass(r.stopLossReturnPct, hidden)}
                      >
                        {formatPct(r.stopLossReturnPct)}
                      </span>
                    )
                  }
                  style={{ minWidth: '130px' }}
                />
              )}
              <Column
                header='Days Open'
                hidden={!showAdvancedColumns}
                body={(r: HoldingRow) => formatNumber(r.daysOpen)}
                style={{ minWidth: '120px' }}
              />
              <Column
                header='Allocation'
                hidden={!showAdvancedColumns}
                body={(r: HoldingRow) => formatPct(r.allocationPct)}
                style={{ minWidth: '120px' }}
              />
              <Column
                field='industry'
                header='Industry'
                hidden={!showAdvancedColumns}
                style={{ minWidth: '180px' }}
              />
            </DataTable>
          </div>
        </>
      )}

      {detailsRow && (
        <PositionDetailsDialog
          row={detailsRow}
          currency={currency}
          accountName={selectedAccountName}
          hasQuote={quoteMap.has(detailsRow.symbol)}
          onHide={() => setDetailsSelection(null)}
          onEdit={() => openEdit(detailsRow)}
          onClose={() => openClose(detailsRow)}
        />
      )}

      {showImportDialog && (
        <ImportUploadDialog
          visible
          accountId={selectedAccountId}
          accountName={selectedAccountName}
          onHide={() => setShowImportDialog(false)}
        />
      )}

      <AddHoldingsDialog
        visible={showDialog}
        mode={mode}
        initial={dialogInitial}
        accountName={selectedAccountName}
        lockAccount
        exchangeCode={selectedExchange}
        onHide={() => setShowDialog(false)}
        busy={creating || updating}
        error={submitError}
        onImport={() => {
          setShowDialog(false);
          setShowImportDialog(true);
        }}
        onDelete={mode === 'edit' ? handleDeletePosition : undefined}
        onCorrectAcquisition={
          mode === 'edit' &&
          editIdx !== null &&
          holdings[editIdx]?.acquisitionCorrection
            ? () => {
                setCorrectionHolding(holdings[editIdx]);
                setShowDialog(false);
              }
            : undefined
        }
        onVoidAcquisition={
          mode === 'edit' &&
          editIdx !== null &&
          holdings[editIdx]?.acquisitionCorrection
            ? () => {
                setVoidHolding(holdings[editIdx]);
                setShowDialog(false);
              }
            : undefined
        }
        onCorrectImportedExecution={
          mode === 'edit' &&
          editIdx !== null &&
          holdings[editIdx]?.importedExecutionCorrection
            ? () => {
                setImportedCorrectionHolding(holdings[editIdx]);
                setShowDialog(false);
              }
            : undefined
        }
        onSubmit={(newPos: LocalHolding) => {
          const submit = async () => {
            if (mode === 'edit' && editIdx !== null) {
              const current = holdings[editIdx];
              const payload = {
                symbol: newPos.symbol,
                exchangeCode:
                  newPos.exchangeCode?.trim().toUpperCase() ||
                  current?.exchangeCode?.trim().toUpperCase() ||
                  selectedExchange?.trim().toUpperCase(),
                accountId: current?.accountId,
                accountName: newPos.accountName,
                ...(newPos.openDate !== current?.openDate
                  ? { openDate: newPos.openDate }
                  : {}),
                ...(newPos.buyPrice !== current?.buyPrice
                  ? { entryPrice: newPos.buyPrice }
                  : {}),
                ...(newPos.units !== current?.units
                  ? { quantity: newPos.units }
                  : {}),
                ...(newPos.buyFee !== current?.buyFee
                  ? { buyFees: newPos.buyFee }
                  : {}),
                assetName: newPos.name,
                industry: newPos.industry,
                stopLossPrice: newPos.stopLoss ?? null,
                openReason: newPos.buyComments ?? null,
              };

              if (current?.id) {
                if (!isOnline()) {
                  queueWrite(
                    {
                      type: 'update-position',
                      positionId: current.id,
                      payload,
                    },
                    'Position update queued.'
                  );
                } else {
                  await updatePosition({ id: current.id, payload });
                }

                setHoldings(prev =>
                  prev.map((h, i) => (i === editIdx ? { ...h, ...newPos } : h))
                );
              } else {
                setHoldings(prev =>
                  prev.map((h, i) => (i === editIdx ? newPos : h))
                );
              }
              setSubmitError('');
              setShowDialog(false);
              return;
            }

            const resolvedExchange =
              newPos.exchangeCode?.trim().toUpperCase() ||
              selectedExchange?.trim().toUpperCase();
            if (!resolvedExchange) {
              setSubmitError(
                'Exchange could not be inferred. Pick a stock from search suggestions so exchange is detected.'
              );
              return;
            }

            const payload = {
              symbol: newPos.symbol,
              assetType: newPos.assetType,
              exchangeCode: resolvedExchange,
              accountId: selectedAccountId,
              accountName: selectedAccountName ?? newPos.accountName,
              assetName: newPos.name,
              industry: newPos.industry,
              openDate: newPos.openDate,
              entryPrice: newPos.buyPrice,
              quantity: newPos.units,
              buyFees: newPos.buyFee,
              ...(newPos.stopLoss ? { stopLossPrice: newPos.stopLoss } : {}),
              notes: newPos.buyComments,
            };

            if (!isOnline()) {
              queueWrite(
                {
                  type: 'create-position',
                  payload,
                },
                'Position queued for creation.'
              );
              setHoldings(prev => [
                ...prev,
                {
                  ...newPos,
                  accountId: selectedAccountId,
                  accountName: selectedAccountName ?? newPos.accountName,
                  exchangeCode: resolvedExchange,
                },
              ]);
            } else {
              await createPosition(payload);
              onExchangeSelected?.(resolvedExchange);
              showToast({
                severity: 'success',
                summary: 'Position added',
                detail: `${newPos.symbol} added to ${selectedAccountName ?? newPos.accountName ?? 'Main'} · ${exchangeLabel(resolvedExchange)}.`,
              });
            }

            setSubmitError('');
            setShowDialog(false);
          };

          submit().catch(error => {
            showWriteError(
              mode === 'edit' ? 'update position' : 'add position',
              error
            );
          });
        }}
      />

      {correctionHolding?.accountId &&
        correctionHolding.acquisitionCorrection && (
          <LiveAcquisitionCorrectionDialog
            accountId={correctionHolding.accountId}
            symbol={correctionHolding.symbol}
            correction={correctionHolding.acquisitionCorrection}
            onHide={() => setCorrectionHolding(null)}
            onSaved={() => {
              setCorrectionHolding(null);
              showToast({
                severity: 'success',
                summary: 'Acquisition corrected',
                detail:
                  'Cash and parcel results were updated with an audit revision.',
              });
            }}
          />
        )}

      {voidHolding?.accountId && voidHolding.acquisitionCorrection && (
        <ManualTradeVoidDialog
          accountId={voidHolding.accountId}
          transactionId={voidHolding.acquisitionCorrection.transactionId}
          symbol={voidHolding.symbol}
          kind='BUY'
          metadata={voidHolding.acquisitionCorrection}
          onHide={() => setVoidHolding(null)}
          onSaved={() => {
            setVoidHolding(null);
            showToast({
              severity: 'success',
              summary: 'Acquisition voided',
              detail:
                'Cash and holdings updated. Original trade and postings retained for audit.',
            });
          }}
        />
      )}

      {importedCorrectionHolding?.accountId &&
        importedCorrectionHolding.importedExecutionCorrection && (
          <LiveImportedExecutionCorrectionDialog
            accountId={importedCorrectionHolding.accountId}
            symbol={importedCorrectionHolding.symbol}
            correction={importedCorrectionHolding.importedExecutionCorrection}
            onHide={() => setImportedCorrectionHolding(null)}
            onSaved={() => {
              setImportedCorrectionHolding(null);
              showToast({
                severity: 'success',
                summary: 'Imported execution corrected',
                detail:
                  'Cash and parcel results were updated with an audit revision.',
              });
            }}
          />
        )}

      <ClosePositionDialog
        visible={showCloseDialog}
        initial={closeInitial}
        onHide={() => setShowCloseDialog(false)}
        onSubmit={(payload: ClosePositionPayload) => {
          if (closeIdx === null || closeInitial === null) return;

          const doClose = async () => {
            const isPartialClose = payload.closeUnits < closeInitial.units;
            const quantity = isPartialClose ? payload.closeUnits : undefined;
            const closePayload = {
              closeDate: payload.closeDate,
              exitPrice: payload.sellPrice,
              quantity,
              fees: payload.sellFee || undefined,
              notes: payload.comments || undefined,
              closeReason: payload.closeReason,
            };

            // If the holding came from the API it has an id — persist via API
            if (closeInitial.id) {
              if (!isOnline()) {
                queueWrite(
                  {
                    type: 'close-position',
                    positionId: closeInitial.id,
                    payload: closePayload,
                  },
                  'Position close queued.'
                );
              } else {
                if (!ensureOnlineForImmediateWrite('close this position')) {
                  return;
                }

                await closePosition({
                  id: closeInitial.id,
                  closeDate: closePayload.closeDate,
                  exitPrice: closePayload.exitPrice,
                  quantity: closePayload.quantity,
                  fees: closePayload.fees,
                  notes: closePayload.notes,
                  closeReason: closePayload.closeReason,
                });
              }
            }

            setSubmitError('');

            // Update local holdings list (remove fully closed, reduce partial)
            setHoldings(prev =>
              prev.flatMap((h, i) => {
                if (i !== closeIdx) return [h];
                const remaining = Number(
                  (h.units - payload.closeUnits).toFixed(6)
                );
                if (remaining <= 0) return [];
                return [{ ...h, units: remaining }];
              })
            );
            setShowCloseDialog(false);
            setCloseIdx(null);
            setCloseInitial(null);
          };

          doClose().catch(error => {
            showWriteError('close position', error);
          });
        }}
      />
    </Card>
  );
}
