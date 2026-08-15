'use client';

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import type { ScreenerResult } from '@/lib/types';

interface ScreenerResultsListProps {
  results: ScreenerResult[];
  onAddToWatchlist: (stock: ScreenerResult) => void;
}

function formatMarketCap(value: number | null): string {
  if (value === null) return '—';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toFixed(0)}`;
}

function formatDividend(value: number | null): string {
  return value === null ? '—' : `$${value.toFixed(2)}`;
}

/** Dual layout: stacked cards on mobile, a sortable table at md+ — same pattern as HoldingsTable. */
export default function ScreenerResultsList({
  results,
  onAddToWatchlist,
}: ScreenerResultsListProps) {
  if (results.length === 0) {
    return (
      <p className='text-sm text-gray-500 py-6 text-center'>
        No results yet — try a symbol or adjust your filters.
      </p>
    );
  }

  return (
    <>
      {/* Mobile: card list */}
      <div className='flex flex-col gap-2 md:hidden'>
        {results.map(stock => (
          <div
            key={stock.symbol}
            className='rounded-lg border border-gray-200 p-3 flex items-center justify-between gap-2'
          >
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <span className='font-semibold'>{stock.symbol}</span>
                {stock.exchange && (
                  <span className='text-xs text-gray-400'>
                    {stock.exchange}
                  </span>
                )}
                {stock.inWatchlist && <Tag value='Watching' severity='info' />}
              </div>
              <p className='text-sm text-gray-500 truncate'>{stock.name}</p>
              <p className='text-xs text-gray-400'>
                Mkt cap {formatMarketCap(stock.marketCap)} · Div{' '}
                {formatDividend(stock.lastAnnualDividend)}
                {stock.industry ? ` · ${stock.industry}` : ''}
              </p>
            </div>
            <Button
              icon='pi pi-plus'
              rounded
              text
              aria-label={`Add ${stock.symbol} to watchlist`}
              onClick={() => onAddToWatchlist(stock)}
            />
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className='hidden md:block'>
        <DataTable value={results} stripedRows size='small'>
          <Column field='symbol' header='Symbol' />
          <Column field='name' header='Name' />
          <Column field='exchange' header='Exchange' />
          <Column field='sector' header='Sector' />
          <Column field='industry' header='Industry' />
          <Column
            header='Market Cap'
            body={(row: ScreenerResult) => formatMarketCap(row.marketCap)}
          />
          <Column
            header='Trailing Dividend'
            body={(row: ScreenerResult) =>
              formatDividend(row.lastAnnualDividend)
            }
          />
          <Column
            header=''
            body={(row: ScreenerResult) => (
              <Button
                icon='pi pi-plus'
                label={row.inWatchlist ? 'Watching' : 'Add'}
                text
                onClick={() => onAddToWatchlist(row)}
              />
            )}
          />
        </DataTable>
      </div>
    </>
  );
}
