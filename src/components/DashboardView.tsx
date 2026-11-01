'use client';

import { exchangeLabel } from '@/lib/crypto';

import { useEffect, useId, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import PortfolioSkeleton from './PortfolioSkeleton';
import QueryFeedback from './QueryFeedback';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { ExchangeKey, EquityPoint, TradingAccount } from '@/lib/types';
import {
  useCreateAccount,
  useCloseAccount,
  useDeleteAccount,
  useReopenAccount,
  useUpdateAccount,
  useTradingAccounts,
} from '@/hooks/api';
import { useAccountSelection } from '@/hooks/useAccountSelection';
import { useExchangeDiscovery } from '@/hooks/useExchangeDiscovery';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import Dialog from './AppDialog';
import HoldingsTable from '@/components/HoldingsTable';
import AccountActionDialog from '@/components/AccountActionDialog';
import AccountsBar from '@/components/AccountsBar';
import EmptyAccountsState from '@/components/EmptyAccountsState';
import OpeningPreviewDialog from '@/components/OpeningPreviewDialog';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  formatDateDDMMYYYY,
  computeChartCutoffDate,
  toLocalDateString,
  type ChartTimeframe,
} from '@/lib/date';
import { usePrivacy } from '@/lib/privacy-context';
import { useTheme } from '@/lib/theme-context';
import { CHART_COLORS } from '@/lib/theme';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

// Suggested Exchange structure
// id: stable unique identifier
// name: display name (must be unique)
// type: enum/category (e.g., 'crypto', 'stocks', 'mixed')
// baseCurrency: reporting currency (ISO 4217 code)
// description: optional notes
// equitySeries: time series of equity points (already present in mock)
// holdings: positions; can be resolved separately
export interface ExchangeDefinition {
  id: string;
  name: ExchangeKey; // keep compatibility with existing keys
  type: 'crypto' | 'stocks' | 'mixed';
  baseCurrency: string; // e.g., 'USD'
  description?: string;
}

function summarize(series: EquityPoint[]) {
  if (series.length < 1) return { totalEquity: 0, totalPL: 0, dayPL: 0 };
  const first = series[0].equity;
  const last = series[series.length - 1].equity;
  const prev = series.length > 1 ? series[series.length - 2].equity : last;
  return { totalEquity: last, totalPL: last - first, dayPL: last - prev };
}

export default function DashboardView() {
  const online = useNetworkStatus();
  const chartId = useId();
  const [chartExpanded, setChartExpanded] = useState(false);
  const { resolvedTheme } = useTheme();
  const chartColors = CHART_COLORS[resolvedTheme];
  const accountsQuery = useTradingAccounts(true);
  const { data: accountList = [], isLoading: isAccountsLoading } =
    accountsQuery;
  const createAccount = useCreateAccount();
  const closeAccount = useCloseAccount();
  const deleteAccount = useDeleteAccount();
  const reopenAccount = useReopenAccount();
  const updateAccount = useUpdateAccount();
  const {
    selectedAccountId,
    setSelectedAccountId,
    activeAccounts,
    closedAccounts,
    selectedAccount,
  } = useAccountSelection(accountList);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountIsDemo, setNewAccountIsDemo] = useState(false);
  const [accountCreateError, setAccountCreateError] = useState('');
  const [accountActionError, setAccountActionError] = useState('');
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [previewAccount, setPreviewAccount] = useState<TradingAccount | null>(
    null
  );
  const [accountActionDialog, setAccountActionDialog] = useState<{
    action: 'close' | 'delete';
    account: TradingAccount;
  } | null>(null);
  const [renameDialog, setRenameDialog] = useState<{
    account: TradingAccount;
    newName: string;
  } | null>(null);
  const [renameError, setRenameError] = useState('');

  const {
    selected,
    setSelected,
    exchangeList,
    exchange,
    isPortfolioLoading,
    seededFromPortfolio,
    portfolioHistory,
    isCreatingSnapshot,
    handleExchangeDetected,
    handleExchangeSelected,
    portfolioQuery,
    historyQuery,
  } = useExchangeDiscovery(selectedAccountId);

  const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);
  const { hidden: valuesHidden, mask } = usePrivacy();

  const [liveTotals, setLiveTotals] = useState<{
    totalEquity: number;
    totalPL: number;
    dayPL: number;
  } | null>(null);
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('ALL');

  // Reset live totals whenever the selected exchange changes
  useEffect(() => {
    setLiveTotals(null);
  }, [selected]);

  // Extract a user-friendly message from an API error response.
  // 5xx (server) errors are never surfaced verbatim — a generic fallback is used.
  const extractApiError = (err: unknown, fallback: string): string => {
    const e = err as {
      message?: string;
      response?: {
        status?: number;
        data?: {
          message?: string;
          error?: string;
          details?: Array<{ msg?: string }>;
        };
      };
    };
    const status = e.response?.status ?? 0;
    if (status >= 500) return fallback;
    if (!e.response && e.message)
      return 'Cannot reach the server. Please check your connection.';
    const detailsMsg = e.response?.data?.details?.[0]?.msg;
    const apiMsg = e.response?.data?.message ?? e.response?.data?.error;
    return detailsMsg || apiMsg || fallback;
  };

  const handleCreateAccount = async () => {
    const name = newAccountName.trim() || 'Main';
    setAccountCreateError('');

    // Mirror backend validation: trimmed string length must be 1..80.
    if (name.length > 80) {
      setAccountCreateError('Account name must be 80 characters or less.');
      return;
    }

    try {
      const created = await createAccount.mutateAsync({
        name,
        ...(newAccountIsDemo ? { isDemo: true } : {}),
      });
      setNewAccountName('');
      setNewAccountIsDemo(false);
      setShowAccountDialog(false);
      if (created?.id) {
        setSelectedAccountId(created.id);
      }
    } catch (err: unknown) {
      setAccountCreateError(
        extractApiError(err, 'Could not create account. Please try again.')
      );
    }
  };

  const handleAccountActionRequest = (
    action: 'close' | 'delete',
    account: TradingAccount
  ) => {
    setAccountActionError('');
    setAccountActionDialog({ action, account });
  };

  const handleConfirmAccountAction = async () => {
    if (!accountActionDialog) return;

    const { action, account } = accountActionDialog;
    setAccountActionError('');

    try {
      if (action === 'delete') {
        await deleteAccount.mutateAsync(account.id);

        if (selectedAccountId === account.id) {
          const remaining = accountList.filter(a => a.id !== account.id);
          setSelectedAccountId(remaining[0]?.id ?? '');
        }
      } else {
        await closeAccount.mutateAsync(account.id);

        if (selectedAccountId === account.id) {
          const remainingActive = accountList.filter(
            a => a.id !== account.id && (a.status ?? 'ACTIVE') !== 'CLOSED'
          );
          setSelectedAccountId(remainingActive[0]?.id ?? '');
        }
      }

      setAccountActionDialog(null);
    } catch (err: unknown) {
      setAccountActionError(
        extractApiError(
          err,
          action === 'delete'
            ? 'Could not delete account. Please try again.'
            : 'Could not close account. Please try again.'
        )
      );
    }
  };

  const handleReopenAccount = async (account: TradingAccount) => {
    setAccountActionError('');
    try {
      await reopenAccount.mutateAsync(account.id);
      setSelectedAccountId(account.id);
    } catch (err: unknown) {
      setAccountActionError(
        extractApiError(err, 'Could not reopen account. Please try again.')
      );
    }
  };

  const handleRenameAccount = async () => {
    if (!renameDialog) return;
    const trimmedName = renameDialog.newName.trim();
    if (!trimmedName) {
      setRenameError('Account name cannot be empty.');
      return;
    }
    if (trimmedName.length > 80) {
      setRenameError('Account name must be 80 characters or less.');
      return;
    }

    setRenameError('');
    try {
      await updateAccount.mutateAsync({
        accountId: renameDialog.account.id,
        name: trimmedName,
      });
      setRenameDialog(null);
    } catch (err: unknown) {
      setRenameError(
        extractApiError(err, 'Could not rename account. Please try again.')
      );
    }
  };

  const chartSeries = useMemo(
    () => [...portfolioHistory].sort((a, b) => a.date.localeCompare(b.date)),
    [portfolioHistory]
  );

  // Replace (or append) today's point with the live equity so the chart's
  // rightmost value always matches the stat cards.
  const liveChartSeries = useMemo(() => {
    if (!liveTotals || !selected) return chartSeries;
    const today = toLocalDateString(new Date());
    const withoutToday = chartSeries.filter(p => p.date !== today);
    return [...withoutToday, { date: today, equity: liveTotals.totalEquity }];
  }, [chartSeries, liveTotals, selected]);

  const filteredChartSeries = useMemo(() => {
    if (timeframe === 'ALL') return liveChartSeries;
    const cutoff = computeChartCutoffDate(timeframe, new Date());
    const cutoffStr = toLocalDateString(cutoff);
    return liveChartSeries.filter(p => p.date >= cutoffStr);
  }, [liveChartSeries, timeframe]);
  const lastSnapshotDate = useMemo(
    () =>
      chartSeries.length > 0 ? chartSeries[chartSeries.length - 1].date : null,
    [chartSeries]
  );
  const stats = useMemo(
    () =>
      liveTotals ??
      (chartSeries.length
        ? summarize(chartSeries)
        : { totalEquity: 0, totalPL: 0, dayPL: 0 }),
    [liveTotals, chartSeries]
  );

  const data = useMemo(
    () => ({
      labels: filteredChartSeries.map(p => formatDateDDMMYYYY(p.date)),
      datasets: [
        {
          label: 'Portfolio Equity',
          data: filteredChartSeries.map(p => p.equity),
          borderColor: chartColors.line,
          backgroundColor: chartColors.fill,
          tension: 0.25,
          fill: true,
          pointRadius: filteredChartSeries.length <= 1 ? 5 : 0,
          pointHoverRadius: 5,
        },
      ],
    }),
    [filteredChartSeries, chartColors]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: chartColors.surface,
          titleColor: chartColors.text,
          bodyColor: chartColors.text,
          borderColor: chartColors.grid,
          borderWidth: 1,
          callbacks: {
            label: (ctx: { parsed: { y: number | null } }) =>
              valuesHidden || ctx.parsed.y == null
                ? mask('')
                : `$${numberFormatter.format(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 4, color: chartColors.text },
        },
        y: {
          grid: { color: chartColors.grid },
          ticks: {
            color: chartColors.text,
            callback: (value: number | string) =>
              valuesHidden
                ? mask('')
                : `$${numberFormatter.format(Number(value))}`,
          },
        },
      },
    }),
    [valuesHidden, mask, numberFormatter, chartColors]
  );

  if (isAccountsLoading && online) {
    return <PortfolioSkeleton />;
  }

  if (accountsQuery.data === undefined && (accountsQuery.isError || !online)) {
    return (
      <div className='app-page'>
        <QueryFeedback
          label='Accounts'
          isError={accountsQuery.isError}
          isFetching={accountsQuery.isFetching}
          hasData={false}
          onRetry={() => void accountsQuery.refetch()}
        />
      </div>
    );
  }

  const hasAnyAccount = accountList.length > 0;

  if (online && hasAnyAccount && !seededFromPortfolio && isPortfolioLoading) {
    return <PortfolioSkeleton />;
  }

  return (
    <div className='min-h-screen bg-[--tr-bg]'>
      {hasAnyAccount && (
        <AccountsBar
          activeAccounts={activeAccounts}
          closedAccounts={closedAccounts}
          selectedAccountId={selectedAccountId}
          onSelectAccount={id => {
            setAccountActionError('');
            setPreviewAccount(null);
            setSelectedAccountId(id);
          }}
          onAddAccount={() => {
            setAccountCreateError('');
            setShowAccountDialog(true);
          }}
          onRenameAccount={account => {
            setRenameError('');
            setRenameDialog({ account, newName: account.name });
          }}
          onCloseAccount={account =>
            handleAccountActionRequest('close', account)
          }
          onDeleteAccount={account =>
            handleAccountActionRequest('delete', account)
          }
          onReopenAccount={handleReopenAccount}
          reopenPending={reopenAccount.isPending}
          deletePending={deleteAccount.isPending}
        />
      )}

      {selectedAccount && !selectedAccount.isDemo && (
        <div className='app-page py-2'>
          <Button
            label='Opening-balance preview'
            icon='pi pi-calculator'
            outlined
            disabled={!online}
            onClick={() => setPreviewAccount(selectedAccount)}
          />
        </div>
      )}
      {previewAccount && (
        <OpeningPreviewDialog
          key={previewAccount.id}
          account={previewAccount}
          onHide={() => setPreviewAccount(null)}
        />
      )}

      <AccountActionDialog
        visible={accountActionDialog !== null}
        action={accountActionDialog?.action ?? 'close'}
        accountName={accountActionDialog?.account.name ?? ''}
        isDemo={accountActionDialog?.account.isDemo ?? false}
        loading={closeAccount.isPending || deleteAccount.isPending}
        error={accountActionError}
        onCancel={() => setAccountActionDialog(null)}
        onConfirm={() => {
          void handleConfirmAccountAction();
        }}
      />

      <Dialog
        header={`Rename ${renameDialog?.account.name ?? 'Account'}`}
        visible={renameDialog !== null}
        style={{ width: '520px', maxWidth: '95vw' }}
        modal
        blockScroll
        closable={!updateAccount.isPending}
        closeOnEscape={!updateAccount.isPending}
        onHide={() => {
          if (!updateAccount.isPending) {
            setRenameDialog(null);
            setRenameError('');
          }
        }}
      >
        <form
          className='space-y-3'
          onSubmit={e => {
            e.preventDefault();
            void handleRenameAccount();
          }}
        >
          <p className='text-sm text-gray-500'>
            Enter a new name for this account.
          </p>
          {renameError && (
            <div className='text-sm text-red-600'>{renameError}</div>
          )}
          <InputText
            value={renameDialog?.newName ?? ''}
            onChange={e =>
              setRenameDialog(
                renameDialog
                  ? { ...renameDialog, newName: e.target.value }
                  : null
              )
            }
            placeholder='Account name'
            className='w-full'
            autoFocus
            disabled={updateAccount.isPending}
          />
          <div className='flex justify-end gap-2 pt-2'>
            <Button
              type='button'
              label='Cancel'
              severity='secondary'
              outlined
              onClick={() => {
                setRenameDialog(null);
                setRenameError('');
              }}
              disabled={updateAccount.isPending}
            />
            <Button
              type='submit'
              label='Rename'
              icon='pi pi-check'
              disabled={updateAccount.isPending}
              loading={updateAccount.isPending}
            />
          </div>
        </form>
      </Dialog>

      <Dialog
        header='Add Account'
        visible={showAccountDialog}
        style={{ width: '520px', maxWidth: '95vw' }}
        modal
        blockScroll
        onHide={() => {
          setShowAccountDialog(false);
          setAccountCreateError('');
          setNewAccountIsDemo(false);
        }}
      >
        <form
          className='space-y-3'
          onSubmit={e => {
            e.preventDefault();
            handleCreateAccount();
          }}
        >
          <p className='text-sm text-gray-500'>
            Create a portfolio account. If left empty, the default name is Main.
          </p>
          {accountCreateError && (
            <div className='text-sm text-red-600'>{accountCreateError}</div>
          )}
          <InputText
            value={newAccountName}
            onChange={e => setNewAccountName(e.target.value)}
            placeholder='Account name (optional, default: Main)'
            className='w-full'
            autoFocus
          />
          <div className='flex items-start gap-2 pt-2'>
            <Checkbox
              inputId='new-account-demo'
              checked={newAccountIsDemo}
              onChange={e => setNewAccountIsDemo(e.checked === true)}
            />
            <label htmlFor='new-account-demo' className='text-sm'>
              Demo account (practice — excluded from tax reports)
              <span className='block text-xs text-gray-500'>
                Cannot be changed later. Also left out of &quot;All
                accounts&quot; totals.
              </span>
            </label>
          </div>
          <div className='flex justify-end gap-2 pt-2'>
            <Button
              type='button'
              label='Cancel'
              severity='secondary'
              outlined
              onClick={() => {
                setShowAccountDialog(false);
                setAccountCreateError('');
                setNewAccountIsDemo(false);
              }}
            />
            <Button
              type='submit'
              label='Create Account'
              icon='pi pi-plus'
              disabled={createAccount.isPending}
              loading={createAccount.isPending}
            />
          </div>
        </form>
      </Dialog>

      {hasAnyAccount ? (
        <div className='px-4 sm:px-5 py-4 sm:py-5'>
          <div className='portfolio-workspace mx-auto space-y-4'>
            <QueryFeedback
              label='Accounts'
              isError={accountsQuery.isError}
              isFetching={accountsQuery.isFetching}
              hasData={accountsQuery.data !== undefined}
              onRetry={() => void accountsQuery.refetch()}
            />
            <header>
              <h1 className='portfolio-heading'>Your portfolio</h1>
              <p className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
                Track your positions, performance and next move.
              </p>
            </header>
            {selectedAccountId ? (
              <>
                <section
                  aria-label='Exchange filters'
                  className='portfolio-exchange-toolbar'
                >
                  <QueryFeedback
                    label='Exchanges'
                    showOffline={false}
                    isError={portfolioQuery.isError}
                    isFetching={portfolioQuery.isFetching}
                    hasData={portfolioQuery.data !== undefined}
                    onRetry={() => void portfolioQuery.refetch()}
                  />
                  <div className='portfolio-exchange-label'>
                    <h3
                      className='text-sm font-medium'
                      style={{ color: 'var(--tr-text)' }}
                    >
                      Exchange
                    </h3>
                  </div>
                  {exchangeList.length === 0 && !portfolioQuery.isError && (
                    <div className='py-2'>
                      <p className='text-slate-500 text-sm max-w-xs'>
                        No exchanges yet for this account. Create your first
                        position and the exchange will be inferred from the
                        selected stock.
                      </p>
                    </div>
                  )}
                  <div className='portfolio-filters'>
                    {exchangeList.map(e => {
                      const isSelected = selected === e.name;
                      return (
                        <div key={e.name} className='relative inline-block'>
                          <button
                            onClick={() => setSelected(e.name)}
                            className='portfolio-chip'
                            aria-pressed={isSelected}
                          >
                            {exchangeLabel(e.name)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <div className='portfolio-metrics'>
                  <Card>
                    <h3
                      className='text-sm font-medium mb-1'
                      style={{ color: 'var(--tr-text-2)' }}
                    >
                      Total Equity
                    </h3>
                    <p
                      className='text-3xl sm:text-4xl font-semibold'
                      style={{ color: 'var(--tr-text)' }}
                    >
                      {mask(`$${numberFormatter.format(stats.totalEquity)}`)}
                    </p>
                  </Card>
                  <Card>
                    <h3
                      className='text-sm font-medium mb-1'
                      style={{ color: 'var(--tr-text-2)' }}
                    >
                      Total P/L
                    </h3>
                    <p
                      className='text-2xl font-bold'
                      style={{
                        color:
                          stats.totalPL >= 0
                            ? 'var(--tr-success)'
                            : 'var(--tr-danger)',
                      }}
                    >
                      {mask(
                        `${stats.totalPL >= 0 ? '+' : ''}$${numberFormatter.format(Math.abs(stats.totalPL))}`
                      )}
                    </p>
                  </Card>
                  <Card>
                    <h3
                      className='text-sm font-medium mb-1'
                      style={{ color: 'var(--tr-text-2)' }}
                    >
                      Day P/L
                    </h3>
                    <p
                      className='text-2xl font-bold'
                      style={{
                        color:
                          stats.dayPL >= 0
                            ? 'var(--tr-success)'
                            : 'var(--tr-danger)',
                      }}
                    >
                      {mask(
                        `${stats.dayPL >= 0 ? '+' : ''}$${numberFormatter.format(Math.abs(stats.dayPL))}`
                      )}
                    </p>
                  </Card>
                </div>
                <details className='metric-explanation'>
                  <summary>
                    About portfolio values
                    {exchange?.baseCurrency
                      ? ` (${exchange.baseCurrency})`
                      : ''}
                  </summary>
                  <p>
                    Values cover the selected account and exchange. Total Equity
                    includes current holdings value plus realised P/L; Total P/L
                    combines open-position returns and realised P/L. Day P/L
                    uses the available daily quote changes for open positions,
                    not cash deposits or withdrawals. Missing quotes use stored
                    prices and daily movement may be incomplete.
                  </p>
                </details>

                <Card>
                  <QueryFeedback
                    label='Equity history'
                    showOffline={false}
                    isError={historyQuery.isError}
                    isFetching={historyQuery.isFetching}
                    hasData={historyQuery.data !== undefined}
                    onRetry={() => void historyQuery.refetch()}
                  />
                  <div className='flex flex-wrap gap-2 items-center justify-between mb-3'>
                    <h3 className='text-base font-semibold text-gray-800'>
                      Equity History
                    </h3>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='text-xs text-gray-500'>
                        Last snapshot:{' '}
                        {isCreatingSnapshot
                          ? 'Updating...'
                          : lastSnapshotDate
                            ? formatDateDDMMYYYY(lastSnapshotDate)
                            : 'No snapshot yet'}
                      </span>
                      <Button
                        type='button'
                        text
                        size='small'
                        icon={
                          chartExpanded
                            ? 'pi pi-window-minimize'
                            : 'pi pi-window-maximize'
                        }
                        label={chartExpanded ? 'Collapse' : 'Expand'}
                        aria-label={
                          chartExpanded ? 'Collapse chart' : 'Expand chart'
                        }
                        aria-expanded={chartExpanded}
                        aria-controls={chartId}
                        onClick={() => setChartExpanded(value => !value)}
                      />
                    </div>
                  </div>
                  <p className='text-xs text-gray-500 mb-3'>
                    Daily snapshots with the latest holdings value shown for
                    today; quote updates are separate from snapshots.
                  </p>
                  <div
                    className='chart-timeframes mb-3'
                    role='group'
                    aria-label='Chart timeframe'
                  >
                    {(
                      [
                        'D',
                        'W',
                        'M',
                        '3M',
                        '6M',
                        'YTD',
                        'Y',
                        '5Y',
                        'ALL',
                      ] as const
                    ).map(tf => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className='portfolio-chip'
                        aria-pressed={timeframe === tf}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                  <div
                    id={chartId}
                    className={`portfolio-chart${chartExpanded ? ' portfolio-chart-expanded' : ''}`}
                  >
                    {!online && historyQuery.data === undefined ? (
                      <div className='portfolio-chart-message'>
                        Equity history is unavailable offline.
                      </div>
                    ) : historyQuery.isLoading ? (
                      <div role='status' className='portfolio-chart-message'>
                        Loading equity history…
                      </div>
                    ) : filteredChartSeries.length > 0 ? (
                      <Line data={data} options={options} />
                    ) : (
                      <div className='portfolio-chart-message'>
                        {historyQuery.isError
                          ? 'Equity history is unavailable.'
                          : 'No equity points for this period. Try a wider timeframe, or add your first position below.'}
                      </div>
                    )}
                  </div>
                  {historyQuery.isError && (
                    <Message
                      severity='warn'
                      text='Historical equity may be incomplete until snapshots can be loaded.'
                    />
                  )}
                </Card>

                {/* Holdings */}
                <HoldingsTable
                  selectedAccountId={selectedAccountId}
                  selectedAccountName={selectedAccount?.name}
                  isDemo={selectedAccount?.isDemo === true}
                  selectedExchange={selected || undefined}
                  onExchangeDetected={handleExchangeDetected}
                  onExchangeSelected={handleExchangeSelected}
                  baseCurrency={exchange?.baseCurrency}
                  onLiveTotals={setLiveTotals}
                />
              </>
            ) : (
              <Card>
                <div className='text-sm text-gray-500'>
                  No active account selected. Reopen a closed account from the
                  manage menu, or create a new one.
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className='min-h-[70vh] flex items-center justify-center p-4'>
          <EmptyAccountsState
            onCreateAccount={() => {
              setAccountCreateError('');
              setShowAccountDialog(true);
            }}
          />
        </div>
      )}
    </div>
  );
}
