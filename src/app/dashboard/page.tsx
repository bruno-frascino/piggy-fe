'use client';

import { useMemo, useState } from 'react';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

export default function DashboardPage() {
  const [selected, setSelected] = useState<ExchangeKey>('Binance');

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
          borderColor: 'rgb(59,130,246)', // tailwind blue-500
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

        {/* Exchange selector */}
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

        {/* KPIs */}
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

        {/* Chart */}
        <Card>
          <div className='h-72 md:h-96'>
            <Line data={data} options={options} />
          </div>
        </Card>
      </div>
    </div>
  );
}
