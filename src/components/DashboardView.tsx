'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import type {
  ExchangeKey,
  ExchangePortfolio,
  EquityPoint,
  TradingAccount,
} from '@/lib/types';
import {
  useCreateAccount,
  useCloseAccount,
  useDeleteAccount,
  useReopenAccount,
  useUpdateAccount,
  useCreatePortfolioSnapshot,
  usePortfolioHistory,
  useTradingAccounts,
  useUserPortfolio,
} from '@/hooks/api';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import HoldingsTable from '@/components/HoldingsTable';
import AccountActionDialog from '@/components/AccountActionDialog';
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
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  formatDateDDMMYYYY,
  computeChartCutoffDate,
  toLocalDateString,
  type ChartTimeframe,
} from '@/lib/date';

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: accountList = [], isLoading: isAccountsLoading } =
    useTradingAccounts(true);
  const createAccount = useCreateAccount();
  const closeAccount = useCloseAccount();
  const deleteAccount = useDeleteAccount();
  const reopenAccount = useReopenAccount();
  const updateAccount = useUpdateAccount();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [newAccountName, setNewAccountName] = useState('');
  const [accountCreateError, setAccountCreateError] = useState('');
  const [accountActionError, setAccountActionError] = useState('');
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showClosedAccounts, setShowClosedAccounts] = useState(false);
  const [accountActionDialog, setAccountActionDialog] = useState<{
    action: 'close' | 'delete';
    account: TradingAccount;
  } | null>(null);
  const [renameDialog, setRenameDialog] = useState<{
    account: TradingAccount;
    newName: string;
  } | null>(null);
  const [renameError, setRenameError] = useState('');
  const [selected, setSelected] = useState<ExchangeKey>('');

  const visibleAccounts = useMemo(
    () =>
      showClosedAccounts
        ? accountList
        : accountList.filter(a => (a.status ?? 'ACTIVE') !== 'CLOSED'),
    [accountList, showClosedAccounts]
  );

  const selectedAccount = useMemo<TradingAccount | null>(
    () => accountList.find(a => a.id === selectedAccountId) ?? null,
    [accountList, selectedAccountId]
  );

  const {
    data: remotePortfolio,
    isLoading: isPortfolioLoading,
    isFetched: isPortfolioFetched,
  } = useUserPortfolio(selectedAccountId);
  const { data: portfolioHistory = [], isFetched: isHistoryFetched } =
    usePortfolioHistory(selectedAccountId, selected);
  const createSnapshot = useCreatePortfolioSnapshot();
  const [exchangeList, setExchangeList] = useState<ExchangePortfolio[]>([]);
  const [seededFromPortfolio, setSeededFromPortfolio] = useState(false);

  // Sync exchange list from API: seed on first fetch, then merge on subsequent
  // fetches (e.g. after adding a new position to a previously unseen exchange).
  useEffect(() => {
    if (!isPortfolioFetched) return;
    const incoming = remotePortfolio ?? [];

    if (!seededFromPortfolio) {
      setExchangeList(incoming);
      setSeededFromPortfolio(true);
      return;
    }

    // Merge: always update baseCurrency from API (source of truth) and add
    // new exchanges, but preserve locally-edited type/description values.
    setExchangeList(prev => {
      const remoteMap = new Map(incoming.map(e => [e.name, e]));
      const updated = prev.map(e => {
        const remote = remoteMap.get(e.name);
        return remote
          ? { ...e, baseCurrency: remote.baseCurrency ?? e.baseCurrency }
          : e;
      });
      const existingNames = new Set(prev.map(e => e.name));
      const newEntries = incoming.filter(e => !existingNames.has(e.name));
      return [...updated, ...newEntries];
    });
  }, [isPortfolioFetched, remotePortfolio, seededFromPortfolio]);

  const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);

  const [snapshotRequestedForKey, setSnapshotRequestedForKey] = useState<
    string | null
  >(null);

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
      const created = await createAccount.mutateAsync({ name });
      setNewAccountName('');
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

        if (selectedAccountId === account.id && !showClosedAccounts) {
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

  useEffect(() => {
    if (!visibleAccounts.length) {
      setSelectedAccountId('');
      return;
    }
    if (
      selectedAccountId &&
      visibleAccounts.some(account => account.id === selectedAccountId)
    ) {
      return;
    }

    const fromQuery = searchParams?.get('accountId');
    if (
      fromQuery &&
      visibleAccounts.some(account => account.id === fromQuery)
    ) {
      setSelectedAccountId(fromQuery);
      return;
    }

    try {
      const fromStorage = localStorage.getItem('selectedAccountId');
      if (
        fromStorage &&
        visibleAccounts.some(account => account.id === fromStorage)
      ) {
        setSelectedAccountId(fromStorage);
        return;
      }
    } catch {
      // no-op
    }

    setSelectedAccountId(visibleAccounts[0].id);
  }, [visibleAccounts, selectedAccountId, searchParams]);

  useEffect(() => {
    setSelected('');
    setExchangeList([]);
    setSeededFromPortfolio(false);
    setSnapshotRequestedForKey(null);
  }, [selectedAccountId]);

  useEffect(() => {
    if (!selectedAccountId) return;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedAccountId', selectedAccountId);
      }
      const params = new URLSearchParams(searchParams?.toString());
      params.set('accountId', selectedAccountId);
      if (searchParams?.get('accountId') !== selectedAccountId) {
        router.replace(`${pathname}?${params.toString()}`);
      }
    } catch {
      // no-op
    }
  }, [selectedAccountId, router, pathname, searchParams]);

  const handleExchangeDetected = (exchangeName: string) => {
    setExchangeList(prev => {
      if (prev.some(e => e.name === exchangeName)) return prev;
      return [...prev, { name: exchangeName, equitySeries: [] }];
    });
    setSelected(exchangeName);
  };

  // Ensure today's snapshot exists for selected account+exchange chart context.
  useEffect(() => {
    if (!isHistoryFetched || !selectedAccountId || !selected) return;

    const today = new Date().toISOString().slice(0, 10);
    const key = `${selectedAccountId}:${selected}:${today}`;
    const hasToday = portfolioHistory.some(point => point.date === today);

    if (
      hasToday ||
      snapshotRequestedForKey === key ||
      createSnapshot.isPending
    ) {
      return;
    }

    setSnapshotRequestedForKey(key);
    createSnapshot.mutate({
      accountId: selectedAccountId,
      exchangeCode: selected,
    });
  }, [
    isHistoryFetched,
    selectedAccountId,
    selected,
    portfolioHistory,
    snapshotRequestedForKey,
    createSnapshot,
  ]);

  // Once the list is available, establish the initial selection.
  useEffect(() => {
    if (!exchangeList.length || selected) return;
    const fromQuery = searchParams?.get('exchange') as ExchangeKey | null;
    if (fromQuery && exchangeList.some(e => e.name === fromQuery)) {
      setSelected(fromQuery);
      return;
    }
    try {
      const fromStorage = localStorage.getItem(
        'selectedExchange'
      ) as ExchangeKey | null;
      if (fromStorage && exchangeList.some(e => e.name === fromStorage)) {
        setSelected(fromStorage);
        return;
      }
    } catch {
      // no-op
    }
    setSelected(exchangeList[0].name);
  }, [exchangeList, selected, searchParams]);

  // Keep URL and localStorage in sync
  useEffect(() => {
    if (!selected) return;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedExchange', selected);
      }
      const params = new URLSearchParams(searchParams?.toString());
      params.set('exchange', selected);
      // Avoid replacing if already set to prevent extra history entries
      if (searchParams?.get('exchange') !== selected) {
        router.replace(`${pathname}?${params.toString()}`);
      }
    } catch {
      // no-op
    }
  }, [selected, router, pathname, searchParams]);

  const exchange = useMemo(
    () =>
      exchangeList.find(e => e.name === selected) ?? exchangeList[0] ?? null,
    [selected, exchangeList]
  );
  const chartSeries = useMemo(
    () => [...portfolioHistory].sort((a, b) => a.date.localeCompare(b.date)),
    [portfolioHistory]
  );
  const filteredChartSeries = useMemo(() => {
    if (timeframe === 'ALL') return chartSeries;
    const cutoff = computeChartCutoffDate(timeframe, new Date());
    const cutoffStr = toLocalDateString(cutoff);
    return chartSeries.filter(p => p.date >= cutoffStr);
  }, [chartSeries, timeframe]);
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
          borderColor: 'rgb(59,130,246)',
          backgroundColor: 'rgba(59,130,246,0.15)',
          tension: 0.25,
          fill: true,
          pointRadius: 0,
        },
      ],
    }),
    [filteredChartSeries]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } },
        y: { grid: { color: 'rgba(0,0,0,0.06)' } },
      },
    }),
    []
  );

  if (isAccountsLoading || (!seededFromPortfolio && isPortfolioLoading)) {
    return (
      <div className='min-h-screen bg-[--tr-bg] flex items-center justify-center'>
        <div className='flex flex-col items-center gap-3 text-slate-400'>
          <i className='pi pi-spin pi-spinner text-4xl text-blue-400' />
          <span className='text-sm font-medium'>Loading portfolio…</span>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[--tr-bg] p-4'>
      <div className='max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl 3xl:max-w-[1800px] mx-auto space-y-6'>
        {/* Removed CoreHeader from dashboard; TopNav provides global header */}
        <Card>
          <div className='flex flex-col gap-3 mb-4 pb-2 border-b border-gray-200 sm:flex-row sm:items-center sm:justify-between'>
            <h3
              className='text-xl font-semibold'
              style={{ color: 'var(--tr-text)' }}
            >
              Accounts
            </h3>
            <Button
              type='button'
              icon='pi pi-plus'
              rounded
              severity='success'
              aria-label='Add Account'
              onClick={() => {
                setAccountCreateError('');
                setShowAccountDialog(true);
              }}
            />
          </div>

          {visibleAccounts.length === 0 && (
            <div className='text-sm text-gray-500'>
              {showClosedAccounts
                ? 'No accounts available. Create one to start managing holdings.'
                : 'No active account. Toggle Show Closed to reopen one, or create a new account.'}
            </div>
          )}

          <div className='mb-3'>
            <button
              type='button'
              onClick={() => setShowClosedAccounts(v => !v)}
              className='text-sm text-blue-600 hover:underline'
            >
              {showClosedAccounts
                ? 'Hide Closed Accounts'
                : 'Show Closed Accounts'}
            </button>
          </div>

          {visibleAccounts.length > 0 && (
            <div className='flex flex-wrap items-center gap-3'>
              {visibleAccounts.map(account => {
                const isSelected = selectedAccountId === account.id;
                const isClosed = (account.status ?? 'ACTIVE') === 'CLOSED';
                return (
                  <div
                    key={account.id}
                    className={`inline-flex items-center rounded-full border transition select-none ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setAccountActionError('');
                        setSelectedAccountId(account.id);
                      }}
                      className='px-3 py-1'
                      aria-pressed={isSelected}
                    >
                      {account.name}
                      {isClosed ? ' (Closed)' : ''}
                    </button>
                    {isClosed ? (
                      <>
                        <button
                          type='button'
                          onClick={() => {
                            void handleReopenAccount(account);
                          }}
                          className={`px-2 py-1 border-l ${
                            isSelected
                              ? 'border-blue-500/50 text-white/85 hover:text-white'
                              : 'border-gray-300 text-gray-500 hover:text-green-600'
                          }`}
                          title='Reopen account'
                          aria-label={`Reopen account ${account.name}`}
                          disabled={reopenAccount.isPending}
                        >
                          <i className='pi pi-refresh text-xs' />
                        </button>
                        <button
                          type='button'
                          onClick={() =>
                            handleAccountActionRequest('delete', account)
                          }
                          className={`px-2 py-1 border-l ${
                            isSelected
                              ? 'border-blue-500/50 text-white/85 hover:text-white'
                              : 'border-gray-300 text-gray-500 hover:text-red-600'
                          }`}
                          title='Delete account permanently'
                          aria-label={`Delete account ${account.name}`}
                          disabled={deleteAccount.isPending}
                        >
                          <i className='pi pi-trash text-xs' />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type='button'
                          onClick={() => {
                            setRenameError('');
                            setRenameDialog({ account, newName: account.name });
                          }}
                          className={`px-2 py-1 border-l ${
                            isSelected
                              ? 'border-blue-500/50 text-white/85 hover:text-white'
                              : 'border-gray-300 text-gray-500 hover:text-blue-600'
                          }`}
                          title='Rename account'
                          aria-label={`Rename account ${account.name}`}
                        >
                          <i className='pi pi-pencil text-xs' />
                        </button>
                        <button
                          type='button'
                          onClick={() =>
                            handleAccountActionRequest('close', account)
                          }
                          className={`px-2 py-1 border-l ${
                            isSelected
                              ? 'border-blue-500/50 text-white/85 hover:text-white'
                              : 'border-gray-300 text-gray-500 hover:text-amber-600'
                          }`}
                          title='Close account'
                          aria-label={`Close account ${account.name}`}
                          disabled={closeAccount.isPending}
                        >
                          <i className='pi pi-lock text-xs' />
                        </button>
                        <button
                          type='button'
                          onClick={() =>
                            handleAccountActionRequest('delete', account)
                          }
                          className={`px-2 py-1 border-l ${
                            isSelected
                              ? 'border-blue-500/50 text-white/85 hover:text-white'
                              : 'border-gray-300 text-gray-500 hover:text-red-600'
                          }`}
                          title='Delete account permanently'
                          aria-label={`Delete account ${account.name}`}
                          disabled={deleteAccount.isPending}
                        >
                          <i className='pi pi-trash text-xs' />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <AccountActionDialog
          visible={accountActionDialog !== null}
          action={accountActionDialog?.action ?? 'close'}
          accountName={accountActionDialog?.account.name ?? ''}
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
          onHide={() => {
            setShowAccountDialog(false);
            setAccountCreateError('');
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
              Create a portfolio account. If left empty, the default name is
              Main.
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
            <div className='flex justify-end gap-2 pt-2'>
              <Button
                type='button'
                label='Cancel'
                severity='secondary'
                onClick={() => {
                  setShowAccountDialog(false);
                  setAccountCreateError('');
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

        <Card>
          <div className='flex items-start justify-between mb-4 pb-2 border-b border-gray-200'>
            <h3
              className='text-xl font-semibold'
              style={{ color: 'var(--tr-text)' }}
            >
              Exchanges {selectedAccount ? `· ${selectedAccount.name}` : ''}
            </h3>
          </div>
          {exchangeList.length === 0 && (
            <div className='flex flex-col items-center justify-center py-8 gap-3 text-center'>
              <span className='text-4xl' aria-hidden>
                📊
              </span>
              <p className='text-slate-500 text-sm max-w-xs'>
                No exchanges yet for this account. Create your first position
                and the exchange will be inferred from the selected stock.
              </p>
            </div>
          )}
          <div className='flex flex-wrap items-center gap-3 pr-16'>
            {exchangeList.map(e => {
              const isSelected = selected === e.name;
              return (
                <div key={e.name} className='relative inline-block'>
                  <button
                    onClick={() => setSelected(e.name)}
                    className={`px-3 py-1 rounded-full border transition select-none ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    aria-pressed={isSelected}
                  >
                    {e.name}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <Card className='text-center'>
            <h3
              className='text-sm font-medium mb-1'
              style={{ color: 'var(--tr-text-2)' }}
            >
              Total Equity
            </h3>
            <p
              className='text-2xl font-bold'
              style={{ color: 'var(--tr-text)' }}
            >
              ${numberFormatter.format(stats.totalEquity)}
            </p>
          </Card>
          <Card className='text-center'>
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
                  stats.totalPL >= 0 ? 'var(--tr-success)' : 'var(--tr-danger)',
              }}
            >
              {stats.totalPL >= 0 ? '+' : ''}$
              {numberFormatter.format(Math.abs(stats.totalPL))}
            </p>
          </Card>
          <Card className='text-center'>
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
                  stats.dayPL >= 0 ? 'var(--tr-success)' : 'var(--tr-danger)',
              }}
            >
              {stats.dayPL >= 0 ? '+' : ''}$
              {numberFormatter.format(Math.abs(stats.dayPL))}
            </p>
          </Card>
        </div>

        <Card>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='text-base font-semibold text-gray-800'>
              Equity History
            </h3>
            <span className='text-xs text-gray-500'>
              Last snapshot:{' '}
              {createSnapshot.isPending
                ? 'Updating...'
                : lastSnapshotDate
                  ? formatDateDDMMYYYY(lastSnapshotDate)
                  : 'No snapshot yet'}
            </span>
          </div>
          <div className='flex flex-wrap gap-1 mb-3'>
            {(['W', 'M', '3M', '6M', 'YTD', 'Y', '5Y', 'ALL'] as const).map(
              tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-0.5 text-xs rounded border transition select-none ${
                    timeframe === tf
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {tf}
                </button>
              )
            )}
          </div>
          <div className='h-72 md:h-96'>
            <Line data={data} options={options} />
          </div>
        </Card>

        {/* Holdings */}
        {selectedAccountId ? (
          <HoldingsTable
            selectedAccountId={selectedAccountId}
            selectedAccountName={selectedAccount?.name}
            selectedExchange={selected || undefined}
            onExchangeDetected={handleExchangeDetected}
            baseCurrency={exchange?.baseCurrency}
            onLiveTotals={setLiveTotals}
          />
        ) : (
          <Card>
            <div className='text-sm text-gray-500'>
              {selectedAccountId
                ? 'Select an exchange to load holdings.'
                : 'Select an account to load holdings.'}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
