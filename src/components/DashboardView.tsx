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
  const [manageMode, setManageMode] = useState(false);
  const longPressHandlers = useLongPress(() => setManageMode(true), {
    delay: 500,
  });

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
          <div className='relative mb-3'>
            <h3 className='font-semibold text-gray-800'>Exchanges</h3>
            <div className='absolute top-0 right-0 flex flex-col gap-2'>
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
          // The following fields may not exist on mock exchanges; dialog will handle defaults
          type: (
            exchange as unknown as { type?: 'crypto' | 'stocks' | 'mixed' }
          ).type,
          baseCurrency: (exchange as unknown as { baseCurrency?: string })
            .baseCurrency,
          description: (exchange as unknown as { description?: string })
            .description,
        }}
        disableNameEdit
      />
    </div>
  );
}
