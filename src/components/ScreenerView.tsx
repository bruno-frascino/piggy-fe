'use client';

import { useEffect, useState } from 'react';
import { SelectButton } from 'primereact/selectbutton';
import { Message } from 'primereact/message';
import { Card } from 'primereact/card';
import ScreenerFiltersForm from './ScreenerFiltersForm';
import ScreenerResultsList from './ScreenerResultsList';
import WatchlistsPanel from './WatchlistsPanel';
import AddToWatchlistDialog from './AddToWatchlistDialog';
import PageHeader from '@/components/PageHeader';
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
    <div className='min-h-screen bg-[--tr-bg] p-4'>
      <div className='max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl 3xl:max-w-[1800px] mx-auto space-y-6'>
        <PageHeader
          title='Screener'
          subtitle='Discover stocks by symbol or filters, or manage your watchlists'
        />

        <Card>
          <SelectButton
            value={tab}
            onChange={e => e.value && setTab(e.value)}
            options={TABS}
          />
        </Card>

        {tab === 'discover' ? (
          <div className='flex flex-col gap-6'>
            {!isOnline && (
              <Message
                severity='warn'
                text='You are offline. Reconnect to use the screener.'
              />
            )}
            <Card>
              <ScreenerFiltersForm
                onSearch={setFilters}
                pending={isFetching}
                disabled={!isOnline}
              />
            </Card>
            {isError && (
              <Message
                severity='error'
                text='Screener temporarily unavailable — please try again shortly.'
              />
            )}
            {filters && !isError && (
              <Card>
                <ScreenerResultsList
                  results={data?.results ?? []}
                  onAddToWatchlist={setStockToAdd}
                />
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <WatchlistsPanel />
          </Card>
        )}

        <AddToWatchlistDialog
          visible={Boolean(stockToAdd)}
          stock={stockToAdd}
          onHide={() => setStockToAdd(null)}
        />
      </div>
    </div>
  );
}
