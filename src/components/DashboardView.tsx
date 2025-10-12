'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { exchanges, summarize, ExchangeKey } from '@/lib/mock-portfolio';
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
    () => exchanges.find(e => e.name === selected) ?? exchanges[0],
    [selected]
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
          <div className='flex flex-wrap gap-3'>
            {exchanges.map(e => (
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
      </div>
    </div>
  );
}
