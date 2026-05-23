'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { AutoComplete } from 'primereact/autocomplete';
import type { HoldingPosition } from '@/lib/types';
import type { StockSearchResult } from '@/lib/types';
import { apiClient } from '@/lib/api-client';

export type LocalHolding = Omit<
  HoldingPosition,
  'stopLoss' | 'currentPrice'
> & {
  stopLoss?: number;
  currentPrice?: number;
  buyComments?: string;
};

export default function AddHoldingsDialog({
  visible,
  mode = 'add',
  initial,
  onHide,
  onSubmit,
  onExchangeDetected,
}: {
  visible: boolean;
  mode?: 'add' | 'edit';
  initial?: Partial<LocalHolding>;
  onHide: () => void;
  onSubmit: (value: LocalHolding) => void;
  onExchangeDetected?: (exchange: string) => void;
}) {
  const [form, setForm] = useState<Partial<LocalHolding>>({
    openDate: new Date().toISOString().slice(0, 10),
    units: 0,
    buyPrice: 0,
    buyFee: 0,
    stopLoss: undefined,
    symbol: '',
    name: '',
    industry: '',
    buyComments: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [symbolSuggestions, setSymbolSuggestions] = useState<
    StockSearchResult[]
  >([]);
  const [manualSymbol, setManualSymbol] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial values when dialog opens or mode changes
  useEffect(() => {
    if (!visible) return;
    const base: Partial<LocalHolding> = {
      symbol: (initial?.symbol ?? '').toUpperCase(),
      name: '',
      industry: '',
      openDate: new Date().toISOString().slice(0, 10),
      units: 0,
      buyPrice: 0,
      buyFee: 0,
      stopLoss: undefined,
      buyComments: '',
      ...initial,
    };
    setForm(base);
    setErrors({});
    setSymbolSuggestions([]);
    setManualSymbol(false);
  }, [visible, mode, initial]);

  const searchSymbol = async (event: { query: string }) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = event.query.trim();
    if (!q) {
      setSymbolSuggestions([]);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await apiClient.searchStocks(q, 10);
        setSymbolSuggestions(results);
      } catch {
        setSymbolSuggestions([]);
      }
    }, 300);
  };

  const handleSymbolSelect = (result: StockSearchResult) => {
    setForm(f => ({ ...f, symbol: result.symbol, name: result.name }));
    if (mode === 'add') {
      onExchangeDetected?.(result.exchange);
    }
  };

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    const required: (keyof HoldingPosition)[] = [
      'symbol',
      'openDate',
      'units',
      'buyPrice',
    ];
    required.forEach(k => {
      const v = form[k as keyof LocalHolding];
      if (
        v === undefined ||
        v === null ||
        (typeof v === 'string' && v.trim() === '')
      ) {
        e[k as string] = 'Required';
      }
    });
    if (typeof form.units !== 'number' || isNaN(form.units!))
      e.units = 'Enter a number';
    else if (!Number.isInteger(form.units)) e.units = 'Use a whole number';
    if (typeof form.buyPrice !== 'number' || isNaN(form.buyPrice!))
      e.buyPrice = 'Enter a number';
    if (!/\d{4}-\d{2}-\d{2}/.test(form.openDate ?? ''))
      e.openDate = 'Use YYYY-MM-DD';
    setErrors(e);
    if (Object.keys(e).length) return;

    const value: LocalHolding = {
      symbol: form.symbol!,
      name: form.name ?? '',
      openDate: form.openDate!,
      units: form.units!,
      buyPrice: form.buyPrice!,
      buyFee: form.buyFee ?? 0,
      stopLoss: form.stopLoss,
      industry: form.industry ?? '',
      // Current price should come from quotes API; use buy price only as fallback.
      currentPrice: form.buyPrice!,
      buyComments: form.buyComments?.trim() || undefined,
    };
    onSubmit(value);
  };

  return (
    <Dialog
      header={mode === 'edit' ? 'Edit Position' : 'Add Position'}
      visible={visible}
      style={{ width: '800px', maxWidth: '95vw' }}
      modal
      onHide={onHide}
    >
      <div className='space-y-4'>
        {/* Row 1: Symbol, Name */}
        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-12 md:col-span-3'>
            <label className='block text-sm font-medium mb-1'>Symbol *</label>
            {mode === 'add' ? (
              <>
                {manualSymbol ? (
                  <InputText
                    value={(form.symbol ?? '').toUpperCase()}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        symbol: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder='e.g. AAPL'
                    className='w-full uppercase'
                  />
                ) : (
                  <AutoComplete
                    value={form.symbol ?? ''}
                    suggestions={symbolSuggestions}
                    completeMethod={searchSymbol}
                    field='symbol'
                    itemTemplate={(item: StockSearchResult) => (
                      <div className='flex flex-col py-1'>
                        <div>
                          <span className='font-semibold'>{item.symbol}</span>
                          <span className='text-xs ml-2 text-gray-400'>
                            {item.exchange}
                          </span>
                        </div>
                        <span className='text-sm text-gray-500'>
                          {item.name}
                        </span>
                      </div>
                    )}
                    onChange={e => {
                      const v = e.value as unknown;
                      if (typeof v === 'string') {
                        setForm(f => ({ ...f, symbol: v.toUpperCase() }));
                      }
                    }}
                    onSelect={e =>
                      handleSymbolSelect(e.value as StockSearchResult)
                    }
                    placeholder='Search symbol…'
                    className='w-full'
                    inputClassName='w-full uppercase'
                    delay={0}
                    appendTo='self'
                    scrollHeight='240px'
                  />
                )}
                <button
                  type='button'
                  className='text-xs text-blue-500 hover:underline mt-1 block'
                  onClick={() => {
                    setManualSymbol(m => !m);
                    setSymbolSuggestions([]);
                  }}
                >
                  {manualSymbol
                    ? '← Search symbol'
                    : "Can't find it? Enter manually"}
                </button>
              </>
            ) : (
              <InputText
                value={(form.symbol ?? '').toUpperCase()}
                onChange={e =>
                  setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))
                }
                placeholder='e.g. AAPL'
                className='w-full uppercase'
              />
            )}
            {errors.symbol && (
              <p className='text-xs text-red-600 mt-1'>{errors.symbol}</p>
            )}
          </div>
          <div className='col-span-12 md:col-span-9'>
            <label className='block text-sm font-medium mb-1'>Name</label>
            <InputText
              value={form.name ?? ''}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder='Company name'
              className='w-full'
            />
            {errors.name && (
              <p className='text-xs text-red-600 mt-1'>{errors.name}</p>
            )}
          </div>
        </div>

        {/* Row 2: Open Date, Units, Industry */}
        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-12 md:col-span-4'>
            <label className='block text-sm font-medium mb-1'>
              Open Date *
            </label>
            <Calendar
              value={(() => {
                const parts = (form.openDate ?? '').split('-').map(Number);
                return parts.length === 3 && parts[0] > 0
                  ? new Date(parts[0], parts[1] - 1, parts[2])
                  : null;
              })()}
              onChange={e => {
                const d = e.value as Date | null;
                if (d) {
                  const y = d.getFullYear();
                  const mo = String(d.getMonth() + 1).padStart(2, '0');
                  const dy = String(d.getDate()).padStart(2, '0');
                  setForm(f => ({ ...f, openDate: `${y}-${mo}-${dy}` }));
                } else {
                  setForm(f => ({ ...f, openDate: '' }));
                }
              }}
              dateFormat='dd/mm/yy'
              showIcon
              placeholder='DD/MM/YYYY'
              className='w-full'
              inputClassName='w-full'
            />
            {errors.openDate && (
              <p className='text-xs text-red-600 mt-1'>{errors.openDate}</p>
            )}
          </div>
          <div className='col-span-12 md:col-span-2'>
            <label className='block text-sm font-medium mb-1'>Units *</label>
            <InputNumber
              value={form.units ?? 0}
              onValueChange={e =>
                setForm(f => ({ ...f, units: (e.value ?? 0) as number }))
              }
              mode='decimal'
              minFractionDigits={0}
              maxFractionDigits={0}
              placeholder='e.g. 10'
              className='w-full'
              inputClassName='w-full'
            />
            {errors.units && (
              <p className='text-xs text-red-600 mt-1'>{errors.units}</p>
            )}
          </div>
          <div className='col-span-12 md:col-span-6'>
            <label className='block text-sm font-medium mb-1'>Industry</label>
            <InputText
              value={form.industry ?? ''}
              onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
              placeholder='Sector'
              className='w-full'
            />
            {errors.industry && (
              <p className='text-xs text-red-600 mt-1'>{errors.industry}</p>
            )}
          </div>
        </div>

        {/* Row 3: Buy Price, Buy Fee, Stop Loss */}
        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-12 md:col-span-4'>
            <label className='block text-sm font-medium mb-1'>
              Buy Price *
            </label>
            <InputNumber
              value={form.buyPrice ?? 0}
              onValueChange={e =>
                setForm(f => ({ ...f, buyPrice: (e.value ?? 0) as number }))
              }
              mode='decimal'
              minFractionDigits={0}
              maxFractionDigits={3}
              placeholder='e.g. 175.250'
              className='w-full'
              inputClassName='w-full'
            />
            {errors.buyPrice && (
              <p className='text-xs text-red-600 mt-1'>{errors.buyPrice}</p>
            )}
          </div>
          <div className='col-span-12 md:col-span-4'>
            <label className='block text-sm font-medium mb-1'>Buy Fee</label>
            <InputNumber
              value={form.buyFee ?? 0}
              onValueChange={e =>
                setForm(f => ({ ...f, buyFee: (e.value ?? 0) as number }))
              }
              mode='decimal'
              minFractionDigits={0}
              maxFractionDigits={3}
              placeholder='e.g. 5.500'
              className='w-full'
              inputClassName='w-full'
            />
            {errors.buyFee && (
              <p className='text-xs text-red-600 mt-1'>{errors.buyFee}</p>
            )}
          </div>
          <div className='col-span-12 md:col-span-4'>
            <label className='block text-sm font-medium mb-1'>Stop Loss</label>
            <InputNumber
              value={form.stopLoss ?? 0}
              onValueChange={e =>
                setForm(f => ({ ...f, stopLoss: (e.value ?? 0) as number }))
              }
              mode='decimal'
              minFractionDigits={0}
              maxFractionDigits={3}
              placeholder='e.g. 150.000'
              className='w-full'
              inputClassName='w-full'
            />
            {errors.stopLoss && (
              <p className='text-xs text-red-600 mt-1'>{errors.stopLoss}</p>
            )}
          </div>
        </div>

        {/* Row 4: Buy Comments */}
        <div>
          <label className='block text-sm font-medium mb-1'>Buy Comments</label>
          <InputTextarea
            autoResize
            value={form.buyComments ?? ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setForm(f => ({ ...f, buyComments: e.target.value }))
            }
            rows={3}
            className='w-full'
            placeholder='Optional notes for this purchase'
          />
        </div>

        <div className='flex justify-end gap-2 pt-2'>
          <Button label='Cancel' severity='secondary' onClick={onHide} />
          <Button
            label={mode === 'edit' ? 'Save Changes' : 'Add Position'}
            icon={mode === 'edit' ? 'pi pi-save' : 'pi pi-check'}
            severity='info'
            onClick={handleSubmit}
          />
        </div>
      </div>
    </Dialog>
  );
}
