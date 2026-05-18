'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import type { ExchangeKey, ExchangePortfolio, EquityPoint } from '@/lib/types';
import { useExchanges, useUserPortfolio } from '@/hooks/api';
import { Button } from 'primereact/button';
import AddExchangeDialog, {
  NewExchangePayload,
} from '@/components/AddExchangeDialog';
import HoldingsTable from '@/components/HoldingsTable';
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
import { useLongPress } from '@/hooks/useLongPress';

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

// Form + dialog logic extracted to AddExchangeDialog component.

export default function DashboardView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    data: remotePortfolio,
    isLoading: isPortfolioLoading,
    isFetched: isPortfolioFetched,
  } = useUserPortfolio();
  const { data: availableExchanges } = useExchanges();
  const [exchangeList, setExchangeList] = useState<ExchangePortfolio[]>([]);
  const [seededFromPortfolio, setSeededFromPortfolio] = useState(false);

  // Seed list from API exactly once
  useEffect(() => {
    if (seededFromPortfolio || !isPortfolioFetched) return;
    setExchangeList(remotePortfolio ?? []);
    setSeededFromPortfolio(true);
  }, [seededFromPortfolio, isPortfolioFetched, remotePortfolio]);

  const [selected, setSelected] = useState<ExchangeKey>('');
  const [manageMode, setManageMode] = useState(false);
  const longPressHandlers = useLongPress(() => setManageMode(true), {
    delay: 500,
  });
  const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleAddExchange = (payload: NewExchangePayload) => {
    const newEx = {
      name: payload.name,
      equitySeries: [],
      type: payload.type,
      baseCurrency: payload.baseCurrency,
      description: payload.description,
    };
    setExchangeList(prev => [...prev, newEx]);
    setSelected(newEx.name);
    setShowAddDialog(false);
  };

  const handleEditExchange = (payload: NewExchangePayload) => {
    setExchangeList(prev =>
      prev.map(e =>
        e.name === selected
          ? {
              ...e,
              // Preserve existing name to avoid breaking holdings mapping
              type: payload.type,
              baseCurrency: payload.baseCurrency,
              description: payload.description,
            }
          : e
      )
    );
    setShowEditDialog(false);
  };

  const handleDeleteExchange = (name: ExchangeKey) => {
    if (exchangeList.length <= 1) return; // do not delete the last one
    const updated = exchangeList.filter(e => e.name !== name);
    setExchangeList(updated);
    if (selected === name && updated.length) {
      setSelected(updated[0].name);
    }
  };

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
  const stats = useMemo(
    () =>
      exchange
        ? summarize(exchange.equitySeries)
        : { totalEquity: 0, totalPL: 0, dayPL: 0 },
    [exchange]
  );

  const data = useMemo(
    () => ({
      labels: exchange?.equitySeries.map(p => p.date) ?? [],
      datasets: [
        {
          label: `${selected} Equity`,
          data: exchange?.equitySeries.map(p => p.equity) ?? [],
          borderColor: 'rgb(59,130,246)',
          backgroundColor: 'rgba(59,130,246,0.15)',
          tension: 0.25,
          fill: true,
          pointRadius: 0,
        },
      ],
    }),
    [exchange, selected]
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

  if (!seededFromPortfolio && isPortfolioLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center'>
        <span className='text-gray-500'>Loading exchanges…</span>
      </div>
    );
  }

  if (seededFromPortfolio && !exchangeList.length) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center'>
        <span className='text-gray-500'>
          No exchanges in your portfolio yet.
        </span>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4'>
      <div className='max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl 3xl:max-w-[1800px] mx-auto space-y-6'>
        {/* Removed CoreHeader from dashboard; TopNav provides global header */}
        <Card>
          <div className='flex items-start justify-between mb-4 pb-2 border-b border-gray-200'>
            <h3 className='text-xl font-semibold text-gray-900'>Exchanges</h3>
            <div className='flex flex-col gap-2 pt-1'>
              {!manageMode && (
                <Button
                  icon='pi pi-plus'
                  rounded
                  severity='success'
                  aria-label='Add Exchange'
                  onClick={() => setShowAddDialog(true)}
                />
              )}
              {manageMode && (
                <Button
                  icon='pi pi-pencil'
                  rounded
                  aria-label='Edit Selected Exchange'
                  disabled={!selected}
                  onClick={() => setShowEditDialog(true)}
                  style={{ backgroundColor: '#2563EB', borderColor: '#2563EB' }}
                />
              )}
              {manageMode && (
                <Button
                  icon='pi pi-undo'
                  rounded
                  severity='secondary'
                  aria-label='Return'
                  onClick={() => setManageMode(false)}
                />
              )}
            </div>
          </div>
          <div className='flex flex-wrap items-center gap-3 pr-16'>
            {exchangeList.map(e => {
              const isSelected = selected === e.name;
              return (
                <div key={e.name} className='relative inline-block'>
                  <button
                    onClick={() => {
                      if (!manageMode) setSelected(e.name);
                    }}
                    className={`px-3 py-1 rounded-full border transition select-none ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    } ${manageMode ? 'animate-shake-slight' : ''}`}
                    aria-pressed={isSelected}
                    {...longPressHandlers}
                  >
                    {e.name}
                  </button>
                  {manageMode && (
                    <button
                      aria-label={`Delete ${e.name}`}
                      title={`Delete ${e.name}`}
                      className='absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] shadow'
                      onClick={ev => {
                        ev.stopPropagation();
                        handleDeleteExchange(e.name);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <Card className='text-center'>
            <h3 className='text-sm text-gray-600'>Total Equity</h3>
            <p className='text-2xl font-semibold text-gray-900'>
              ${numberFormatter.format(stats.totalEquity)}
            </p>
          </Card>
          <Card className='text-center'>
            <h3 className='text-sm text-gray-600'>Total P/L</h3>
            <p
              className={`text-2xl font-semibold ${stats.totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {stats.totalPL >= 0 ? '+' : ''}$
              {numberFormatter.format(Math.abs(stats.totalPL))}
            </p>
          </Card>
          <Card className='text-center'>
            <h3 className='text-sm text-gray-600'>Day P/L</h3>
            <p
              className={`text-2xl font-semibold ${stats.dayPL >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {stats.dayPL >= 0 ? '+' : ''}$
              {numberFormatter.format(Math.abs(stats.dayPL))}
            </p>
          </Card>
        </div>

        <Card>
          <div className='h-72 md:h-96'>
            <Line data={data} options={options} />
          </div>
        </Card>

        {/* Holdings */}
        <HoldingsTable selectedExchange={selected} />
      </div>
      <AddExchangeDialog
        visible={showAddDialog}
        onHide={() => setShowAddDialog(false)}
        onSubmit={handleAddExchange}
        availableExchanges={availableExchanges}
        existingNames={exchangeList.map(e => e.name)}
        mode='add'
      />
      <AddExchangeDialog
        visible={showEditDialog}
        onHide={() => setShowEditDialog(false)}
        onSubmit={handleEditExchange}
        existingNames={exchangeList.map(e => e.name)}
        mode='edit'
        initial={{
          name: exchange.name,
          type: exchange.type,
          baseCurrency: exchange.baseCurrency,
          description: exchange.description,
        }}
        disableNameEdit
      />
    </div>
  );
}
