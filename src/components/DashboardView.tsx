'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { exchanges, summarize, ExchangeKey } from '@/lib/mock-portfolio';
import { Button } from 'primereact/button';
import AddExchangeDialog, {
  NewExchangePayload,
} from '@/components/AddExchangeDialog';
import HoldingsTable from '@/components/HoldingsTable';
import CoreHeader from '@/components/CoreHeader';
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

// Form + dialog logic extracted to AddExchangeDialog component.

export default function DashboardView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize from query or localStorage
  const initialSelected = useMemo<ExchangeKey>(() => {
    const fromQuery = searchParams?.get('exchange') as ExchangeKey | null;
    if (fromQuery && exchanges.some(e => e.name === fromQuery))
      return fromQuery;
    if (typeof window !== 'undefined') {
      const fromStorage = localStorage.getItem(
        'selectedExchange'
      ) as ExchangeKey | null;
      if (fromStorage && exchanges.some(e => e.name === fromStorage))
        return fromStorage;
    }
    return 'Binance';
  }, [searchParams]);

  const [selected, setSelected] = useState<ExchangeKey>(initialSelected);
  const [exchangeList, setExchangeList] = useState(exchanges.map(e => e));

  const [showAddDialog, setShowAddDialog] = useState(false);

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

  // Keep URL and localStorage in sync
  useEffect(() => {
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
    () => exchangeList.find(e => e.name === selected) ?? exchangeList[0],
    [selected, exchangeList]
  );
  const stats = useMemo(() => summarize(exchange.equitySeries), [exchange]);

  const data = useMemo(
    () => ({
      labels: exchange.equitySeries.map(p => p.date),
      datasets: [
        {
          label: `${selected} Equity`,
          data: exchange.equitySeries.map(p => p.equity),
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

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4'>
      <div className='max-w-6xl mx-auto space-y-6'>
        <CoreHeader />

        <Card>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='font-semibold text-gray-800'>Exchanges</h3>
            <Button
              icon='pi pi-plus'
              rounded
              severity='success'
              aria-label='Add Exchange'
              onClick={() => setShowAddDialog(true)}
            />
          </div>
          <div className='flex flex-wrap gap-3'>
            {exchangeList.map(e => (
              <button
                key={e.name}
                onClick={() => setSelected(e.name)}
                className={`px-3 py-1 rounded-full border transition ${
                  selected === e.name
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                aria-pressed={selected === e.name}
              >
                {e.name}
              </button>
            ))}
          </div>
        </Card>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <Card className='text-center'>
            <h3 className='text-sm text-gray-600'>Total Equity</h3>
            <p className='text-2xl font-semibold text-gray-900'>
              ${stats.totalEquity.toLocaleString()}
            </p>
          </Card>
          <Card className='text-center'>
            <h3 className='text-sm text-gray-600'>Total P/L</h3>
            <p
              className={`text-2xl font-semibold ${stats.totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {stats.totalPL >= 0 ? '+' : ''}$
              {Math.abs(stats.totalPL).toLocaleString()}
            </p>
          </Card>
          <Card className='text-center'>
            <h3 className='text-sm text-gray-600'>Day P/L</h3>
            <p
              className={`text-2xl font-semibold ${stats.dayPL >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {stats.dayPL >= 0 ? '+' : ''}$
              {Math.abs(stats.dayPL).toLocaleString()}
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
        existingNames={exchangeList.map(e => e.name)}
      />
    </div>
  );
}
