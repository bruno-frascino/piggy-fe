import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { TradingAccount } from '@/lib/types';

/**
 * Owns trading-account selection state for the dashboard: splitting
 * active/closed accounts, resolving the initially-selected account from the
 * URL query param -> localStorage -> first-active-account (in that priority
 * order), and keeping the URL + localStorage in sync afterward.
 *
 * Extracted verbatim (same effects/deps) from DashboardView.tsx — see
 * DashboardView.test.tsx for coverage of account switching/selection.
 */
export function useAccountSelection(accountList: TradingAccount[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const activeAccounts = useMemo(
    () => accountList.filter(a => (a.status ?? 'ACTIVE') !== 'CLOSED'),
    [accountList]
  );

  const closedAccounts = useMemo(
    () => accountList.filter(a => (a.status ?? 'ACTIVE') === 'CLOSED'),
    [accountList]
  );

  const selectedAccount = useMemo<TradingAccount | null>(
    () => accountList.find(a => a.id === selectedAccountId) ?? null,
    [accountList, selectedAccountId]
  );

  useEffect(() => {
    if (!activeAccounts.length) {
      setSelectedAccountId('');
      return;
    }
    if (
      selectedAccountId &&
      activeAccounts.some(account => account.id === selectedAccountId)
    ) {
      return;
    }

    const fromQuery = searchParams?.get('accountId');
    if (fromQuery && activeAccounts.some(account => account.id === fromQuery)) {
      setSelectedAccountId(fromQuery);
      return;
    }

    try {
      const fromStorage = localStorage.getItem('selectedAccountId');
      if (
        fromStorage &&
        activeAccounts.some(account => account.id === fromStorage)
      ) {
        setSelectedAccountId(fromStorage);
        return;
      }
    } catch {
      // no-op
    }

    setSelectedAccountId(activeAccounts[0].id);
  }, [activeAccounts, selectedAccountId, searchParams]);

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

  return {
    selectedAccountId,
    setSelectedAccountId,
    activeAccounts,
    closedAccounts,
    selectedAccount,
  };
}
