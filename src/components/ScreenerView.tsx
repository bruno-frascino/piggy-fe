'use client';

import { useEffect, useState } from 'react';
import { SelectButton } from 'primereact/selectbutton';
import { Message } from 'primereact/message';
import ScreenerFiltersForm from './ScreenerFiltersForm';
import ScreenerResultsList from './ScreenerResultsList';
import WatchlistsPanel from './WatchlistsPanel';
import AddToWatchlistDialog from './AddToWatchlistDialog';
import { useScreener } from '@/hooks/api';
import type { ScreenerFilters, ScreenerResult } from '@/lib/types';

const TABS = [
  { label: 'Discover', value: 'discover' },
  { label: 'My Watchlists', value: 'watchlists' },
];

/** Tracks live connectivity so the Discover tab can block searches while offline (PWA rule: no blind mutation/network retries offline). */
function useIsOnline(): boolean {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

/** Top-level Screener page: market-wide stock discovery plus the user's named watchlists, nested under one route/nav entry (mobile-first — avoids a crowded bottom tab bar). */
export default function ScreenerView() {
  const [tab, setTab] = useState<'discover' | 'watchlists'>('discover');
  const [filters, setFilters] = useState<ScreenerFilters | null>(null);
  const [stockToAdd, setStockToAdd] = useState<ScreenerResult | null>(null);
  const isOnline = useIsOnline();

  const { data, isFetching, isError } = useScreener(
    filters ?? {},
    Boolean(filters)
  );

  return (
    <div className='max-w-4xl mx-auto px-4 py-4 flex flex-col gap-4'>
      <h1 className='text-xl font-bold'>Screener</h1>

      <SelectButton
        value={tab}
        onChange={e => e.value && setTab(e.value)}
        options={TABS}
      />

      {tab === 'discover' ? (
        <div className='flex flex-col gap-4'>
          {!isOnline && (
            <Message
              severity='warn'
              text='You are offline. Reconnect to use the screener.'
            />
          )}
          <ScreenerFiltersForm
            onSearch={setFilters}
            pending={isFetching}
            disabled={!isOnline}
          />
          {isError && (
            <Message
              severity='error'
              text='Screener temporarily unavailable — please try again shortly.'
            />
          )}
          {filters && !isError && (
            <ScreenerResultsList
              results={data?.results ?? []}
              onAddToWatchlist={setStockToAdd}
            />
          )}
        </div>
      ) : (
        <WatchlistsPanel />
      )}

      <AddToWatchlistDialog
        visible={Boolean(stockToAdd)}
        stock={stockToAdd}
        onHide={() => setStockToAdd(null)}
      />
    </div>
  );
}
