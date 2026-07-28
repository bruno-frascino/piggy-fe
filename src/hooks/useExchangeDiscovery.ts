import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ExchangeKey, ExchangePortfolio } from '@/lib/types';
import {
  useCreatePortfolioSnapshot,
  usePortfolioHistory,
  useUserPortfolio,
} from '@/hooks/api';

/**
 * Owns exchange discovery/selection for the dashboard: seeding the exchange
 * list from the user's portfolio (merging on subsequent fetches so locally
 * -edited fields survive), resolving the initially-selected exchange from the
 * URL -> localStorage -> first-exchange (in that priority order), keeping the
 * URL/localStorage in sync, and ensuring a snapshot exists for today once
 * history has loaded.
 *
 * Extracted verbatim (same effects/deps) from DashboardView.tsx.
 */
export function useExchangeDiscovery(selectedAccountId: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    data: remotePortfolio,
    isLoading: isPortfolioLoading,
    isFetched: isPortfolioFetched,
  } = useUserPortfolio(selectedAccountId);
  const [selected, setSelected] = useState<ExchangeKey>('');
  const { data: portfolioHistory = [], isFetched: isHistoryFetched } =
    usePortfolioHistory(selectedAccountId, selected);
  const createSnapshot = useCreatePortfolioSnapshot();

  const [exchangeList, setExchangeList] = useState<ExchangePortfolio[]>([]);
  const [seededFromPortfolio, setSeededFromPortfolio] = useState(false);
  const [snapshotRequestedForKey, setSnapshotRequestedForKey] = useState<
    string | null
  >(null);

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

  useEffect(() => {
    setSelected('');
    setExchangeList([]);
    setSeededFromPortfolio(false);
    setSnapshotRequestedForKey(null);
  }, [selectedAccountId]);

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

  return {
    selected,
    setSelected,
    exchangeList,
    exchange,
    isPortfolioLoading,
    seededFromPortfolio,
    portfolioHistory,
    isHistoryFetched,
    isCreatingSnapshot: createSnapshot.isPending,
    handleExchangeDetected,
  };
}
