'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import type { ExchangeKey } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import {
  enqueueQueuedWrite,
  syncQueuedWritesNow,
  type QueuedWriteActionInput,
} from '@/lib/offline-write-queue';
import { useToast } from '@/lib/toast-context';
import { formatCurrency, formatPct, returnClass } from '@/lib/format';
import { useHoldingRows, type HoldingRow } from '@/hooks/useHoldingRows';

function formatNumber(n: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 3,
  }).format(n);
}

export default function HoldingsTable({
  selectedAccountId,
  selectedAccountName,
  selectedExchange,
  onExchangeDetected,
  baseCurrency,
  onLiveTotals,
}: {
  selectedAccountId: string;
  selectedAccountName?: string;
  selectedExchange?: ExchangeKey;
  onExchangeDetected?: (exchange: string) => void;
  baseCurrency?: string;
  onLiveTotals?: (t: {
    totalEquity: number;
    totalPL: number;
    dayPL: number;
  }) => void;
}) {
  const queryClient = useQueryClient();
  const { show: showToast } = useToast();
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
    handleRecalculateDrawdown,
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
  const [dialogInitial, setDialogInitial] = useState<
    Partial<LocalHolding> | undefined
  >(undefined);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeIdx, setCloseIdx] = useState<number | null>(null);
  const [closeInitial, setCloseInitial] = useState<LocalHolding | null>(null);
  const replayInFlightRef = useRef(false);

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
    const detail = error instanceof Error ? error.message : fallback;
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
      await apiClient.deletePosition(current.id);
      await invalidateAfterWrite();
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
    <Card>
      <div className='flex items-center justify-between mb-4 pb-2 border-b border-gray-200'>
        <h3 className='text-xl font-semibold text-gray-900'>
          Holdings
          {selectedAccountName ? ` · ${selectedAccountName}` : ''}
          {selectedExchange ? ` · ${selectedExchange}` : ''}
        </h3>
        <div>
          <Button
            icon='pi pi-plus'
            rounded
            severity='success'
            aria-label='Add Position'
            className='!w-11 !h-11'
            onClick={() => {
              setSubmitError('');
              setMode('add');
              setEditIdx(null);
              setDialogInitial(undefined);
              setShowDialog(true);
            }}
          />
        </div>
      </div>

      {submitError && (
        <div className='mb-3 text-sm text-red-600'>{submitError}</div>
      )}

      {rows.length === 0 ? (
        <div className='p-4 text-center text-blue-600'>
          There are no open positions yet
        </div>
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
                    className='grid grid-cols-4 gap-x-1 py-2 items-center min-w-0'
                  >
                    {/* Col 1: Symbol + Units */}
                    <div className='min-w-0'>
                      <button
                        className='font-semibold text-blue-600 text-xs hover:underline block truncate max-w-full'
                        onClick={() => {
                          setMode('edit');
                          setEditIdx(r.originalIndex);
                          setDialogInitial({
                            id: r.id,
                            accountName: r.accountName,
                            exchangeCode: r.exchangeCode,
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
                            maxDrawdownPercent: r.maxDrawdownPercent,
                          });
                          setShowDialog(true);
                        }}
                      >
                        {r.symbol}
                      </button>
                      <span className='text-gray-400 block text-[10px]'>
                        {formatNumber(r.units)}
                      </span>
                    </div>
                    {/* Col 2: Current Position */}
                    <div className='text-right min-w-0'>
                      <button
                        className='text-blue-600 hover:underline text-xs block w-full text-right truncate'
                        title='Close position'
                        onClick={() => {
                          setCloseIdx(r.originalIndex);
                          setCloseInitial({
                            id: r.id,
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
                    </div>
                    {/* Col 3: Day Change */}
                    <div className='text-right min-w-0'>
                      {dayAbs !== null ? (
                        <span className={`text-xs ${returnClass(dayAbs)}`}>
                          <span className='block truncate'>
                            {formatCurrency(dayAbs, currency)}
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
                        className={`text-xs ${returnClass(r.currentReturnAbs)}`}
                      >
                        <span className='block truncate'>
                          {formatCurrency(r.currentReturnAbs, currency)}
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
                  {formatCurrency(totals.totalCurrent, currency)}
                </span>
              </div>
              <div className='text-right min-w-0'>
                {totals.dayPL !== 0 ? (
                  <span
                    className={`text-xs font-semibold ${returnClass(totals.dayPL)} block truncate`}
                  >
                    {formatCurrency(totals.dayPL, currency)}
                  </span>
                ) : (
                  <span className='text-gray-400 text-xs'>—</span>
                )}
              </div>
              <div className='text-right min-w-0'>
                <span
                  className={`text-xs font-semibold ${returnClass(totals.currentReturnAbs)}`}
                >
                  <span className='block truncate'>
                    {formatCurrency(totals.currentReturnAbs, currency)}
                  </span>
                  <span className='text-[10px] opacity-75'>
                    {formatPct(totals.currentReturnPct)}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Tablet/desktop or mobile landscape: full scrollable table */}
          <div className='hidden md:block holdings-landscape-table'>
            <DataTable
              value={rows}
              size='small'
              scrollable
              scrollHeight={tableScrollHeight}
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
                        id: r.id,
                        accountName: r.accountName,
                        exchangeCode: r.exchangeCode,
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
                        maxDrawdownPercent: r.maxDrawdownPercent,
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
                body={(r: HoldingRow) =>
                  formatCurrency(r.openPosition, currency)
                }
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
                  formatCurrency(r.effectivePrice, currency)
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
                    <span
                      className={`font-semibold ${returnClass(totals.dayPL)}`}
                    >
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
                        id: r.id,
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
              <Column
                header='Max Drawdown %'
                body={(r: HoldingRow) => (
                  <span className='inline-flex items-center gap-1'>
                    {r.maxDrawdownPercent != null &&
                    r.maxDrawdownPercent > 0 ? (
                      <>
                        <span className='text-red-600'>
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
                header='Days Open'
                body={(r: HoldingRow) => formatNumber(r.daysOpen)}
                style={{ minWidth: '120px' }}
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
          </div>
        </>
      )}

      <AddHoldingsDialog
        visible={showDialog}
        mode={mode}
        initial={dialogInitial}
        accountName={selectedAccountName}
        lockAccount
        exchangeCode={selectedExchange}
        onHide={() => setShowDialog(false)}
        onExchangeDetected={onExchangeDetected}
        onDelete={mode === 'edit' ? handleDeletePosition : undefined}
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
                openDate: newPos.openDate,
                entryPrice: newPos.buyPrice,
                quantity: newPos.units,
                buyFees: newPos.buyFee,
                assetName: newPos.name,
                industry: newPos.industry,
                stopLossPrice: newPos.stopLoss ?? null,
                notes: newPos.buyComments,
                // undefined means not touched; null resets; number overrides
                maxDrawdownPercent: newPos.maxDrawdownPercent,
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
                  await apiClient.updatePosition(current.id, payload);
                  await invalidateAfterWrite();
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
              exchangeCode: resolvedExchange,
              accountId: selectedAccountId,
              accountName: selectedAccountName ?? newPos.accountName,
              assetName: newPos.name,
              industry: newPos.industry,
              openDate: newPos.openDate,
              entryPrice: newPos.buyPrice,
              quantity: newPos.units,
              buyFees: newPos.buyFee,
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
              await apiClient.createPosition(payload);
              await invalidateAfterWrite();
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

                await apiClient.closePosition(
                  closeInitial.id,
                  closePayload.closeDate,
                  closePayload.exitPrice,
                  closePayload.quantity,
                  closePayload.fees,
                  closePayload.notes
                );
                await invalidateAfterWrite();
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
