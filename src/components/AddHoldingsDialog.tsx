'use client';

import { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import type { HoldingPosition } from '@/lib/mock-holdings';

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
}: {
  visible: boolean;
  mode?: 'add' | 'edit';
  initial?: Partial<LocalHolding>;
  onHide: () => void;
  onSubmit: (value: LocalHolding) => void;
}) {
  const [form, setForm] = useState<Partial<LocalHolding>>({
    openDate: new Date().toISOString().slice(0, 10),
    units: 0,
    buyPrice: 0,
    buyFee: 0,
    stopLoss: undefined,
    currentPrice: 0,
    symbol: '',
    name: '',
    industry: '',
    buyComments: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentTouched, setCurrentTouched] = useState(false);

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
      currentPrice: 0,
      buyComments: '',
      ...initial,
    };
    setForm(base);
    setErrors({});
    setCurrentTouched(false);
  }, [visible, mode, initial]);

  // Keep current price synced to buy price until user changes it
  useEffect(() => {
    if (!currentTouched) {
      setForm(f => ({ ...f, currentPrice: f.buyPrice }));
    }
  }, [form.buyPrice, currentTouched]);

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
      currentPrice: form.currentPrice ?? form.buyPrice!,
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
            <InputText
              value={(form.symbol ?? '').toUpperCase()}
              onChange={e =>
                setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))
              }
              placeholder='e.g. AAPL'
              className='w-full uppercase'
            />
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
            <InputText
              value={form.openDate ?? ''}
              onChange={e => setForm(f => ({ ...f, openDate: e.target.value }))}
              placeholder='YYYY-MM-DD'
              className='w-full'
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
              maxFractionDigits={3}
              placeholder='e.g. 10.125'
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

        {/* Row 4: Current Price */}
        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-12 md:col-span-4'>
            <label className='block text-sm font-medium mb-1'>
              Current Price
            </label>
            <InputNumber
              value={form.currentPrice ?? 0}
              onValueChange={e => {
                setCurrentTouched(true);
                setForm(f => ({
                  ...f,
                  currentPrice: (e.value ?? 0) as number,
                }));
              }}
              mode='decimal'
              minFractionDigits={0}
              maxFractionDigits={3}
              placeholder='e.g. 189.400'
              className='w-full'
              inputClassName='w-full'
            />
            {errors.currentPrice && (
              <p className='text-xs text-red-600 mt-1'>{errors.currentPrice}</p>
            )}
          </div>
        </div>

        {/* Row 5: Buy Comments */}
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
