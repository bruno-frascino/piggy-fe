'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import type { ClosedTrade } from '@/lib/closed-trades-store';

interface Props {
  trade: ClosedTrade;
  onHide: () => void;
  onSave: (updated: ClosedTrade) => void;
  onDelete: (id: string) => void;
}

export default function EditClosedTradeDialog({
  trade,
  onHide,
  onSave,
  onDelete,
}: Props) {
  const [form, setForm] = useState<ClosedTrade>(trade);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(trade);
    setErrors({});
  }, [trade]);

  const validate = () => {
    const e: Record<string, string> = {};
    (['symbol', 'openDate', 'closeDate'] as (keyof ClosedTrade)[]).forEach(
      k => {
        const v = form[k];
        if (!v || (typeof v === 'string' && v.trim() === ''))
          e[k as string] = 'Required';
      }
    );
    if (!/\d{4}-\d{2}-\d{2}/.test(form.openDate)) e.openDate = 'Use YYYY-MM-DD';
    if (!/\d{4}-\d{2}-\d{2}/.test(form.closeDate))
      e.closeDate = 'Use YYYY-MM-DD';
    (
      [
        'unitsClosed',
        'buyPrice',
        'buyFee',
        'sellPrice',
        'sellFee',
      ] as (keyof ClosedTrade)[]
    ).forEach(k => {
      const v = form[k];
      if (typeof v !== 'number' || isNaN(v as number))
        e[k as string] = 'Enter number';
      else if ((v as number) < 0) e[k as string] = 'Must be ≥ 0';
    });
    if (form.unitsClosed <= 0) e.unitsClosed = 'Must be > 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form });
  };

  const handleDelete = () => {
    confirmDialog({
      message: 'Are you sure you want to delete this closed position?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: () => onDelete(form.id),
    });
  };

  const openPosition = useMemo(
    () => form.unitsClosed * form.buyPrice + form.buyFee,
    [form.unitsClosed, form.buyPrice, form.buyFee]
  );
  const closePosition = useMemo(
    () => form.unitsClosed * form.sellPrice - form.sellFee,
    [form.unitsClosed, form.sellPrice, form.sellFee]
  );
  const pl = useMemo(
    () => closePosition - openPosition,
    [closePosition, openPosition]
  );
  const plPct = useMemo(
    () => (openPosition > 0 ? pl / openPosition : 0),
    [pl, openPosition]
  );
  const periodDays = useMemo(() => {
    const start = new Date(form.openDate).getTime();
    const end = new Date(form.closeDate).getTime();
    if (isNaN(start) || isNaN(end)) return 0;
    return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  }, [form.openDate, form.closeDate]);

  function formatCurrency(n: number) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 3,
    }).format(n);
  }
  function formatPct(v: number) {
    const p = v * 100;
    return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`;
  }

  return (
    <Dialog
      header={`Edit Closed Position — ${trade.symbol}`}
      visible
      modal
      style={{ width: '900px', maxWidth: '95vw' }}
      onHide={onHide}
    >
      <div className='space-y-4'>
        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-12 md:col-span-3'>
            <label className='block text-sm font-medium mb-1'>Symbol *</label>
            <InputText
              value={form.symbol}
              onChange={e =>
                setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))
              }
              className='w-full uppercase'
            />
            {errors.symbol && (
              <p className='text-xs text-red-600 mt-1'>{errors.symbol}</p>
            )}
          </div>
          <div className='col-span-12 md:col-span-6'>
            <label className='block text-sm font-medium mb-1'>Name</label>
            <InputText
              value={form.name ?? ''}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className='w-full'
            />
          </div>
          <div className='col-span-12 md:col-span-3'>
            <label className='block text-sm font-medium mb-1'>Exchange</label>
            <InputText
              value={form.exchange ?? ''}
              onChange={e => setForm(f => ({ ...f, exchange: e.target.value }))}
              className='w-full'
              placeholder='e.g. Binance'
            />
          </div>
        </div>

        {/* Summary Metrics */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 text-center bg-blue-50 rounded-md p-3 text-sm'>
          <div>
            <p className='text-gray-600'>Open Position</p>
            <p className='font-semibold'>{formatCurrency(openPosition)}</p>
          </div>
          <div>
            <p className='text-gray-600'>Close Position</p>
            <p className='font-semibold'>{formatCurrency(closePosition)}</p>
          </div>
          <div>
            <p className='text-gray-600'>P/L</p>
            <p
              className={`font-semibold ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(pl)}
            </p>
          </div>
          <div>
            <p className='text-gray-600'>P/L % / Days</p>
            <p
              className={`font-semibold ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatPct(plPct)} · {periodDays}d
            </p>
          </div>
        </div>

        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-12 md:col-span-4'>
            <label className='block text-sm font-medium mb-1'>
              Open Date *
            </label>
            <InputText
              value={form.openDate}
              type='date'
              onChange={e => setForm(f => ({ ...f, openDate: e.target.value }))}
              className='w-full'
            />
            {errors.openDate && (
              <p className='text-xs text-red-600 mt-1'>{errors.openDate}</p>
            )}
          </div>
          <div className='col-span-12 md:col-span-4'>
            <label className='block text-sm font-medium mb-1'>
              Close Date *
            </label>
            <InputText
              value={form.closeDate}
              type='date'
              onChange={e =>
                setForm(f => ({ ...f, closeDate: e.target.value }))
              }
              className='w-full'
            />
            {errors.closeDate && (
              <p className='text-xs text-red-600 mt-1'>{errors.closeDate}</p>
            )}
          </div>
          <div className='col-span-12 md:col-span-4'>
            <label className='block text-sm font-medium mb-1'>
              Units Closed *
            </label>
            <InputNumber
              value={form.unitsClosed}
              onValueChange={e =>
                setForm(f => ({ ...f, unitsClosed: (e.value ?? 0) as number }))
              }
              mode='decimal'
              maxFractionDigits={3}
              className='w-full'
              inputClassName='w-full'
            />
            {errors.unitsClosed && (
              <p className='text-xs text-red-600 mt-1'>{errors.unitsClosed}</p>
            )}
          </div>
        </div>

        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-12 md:col-span-3'>
            <label className='block text-sm font-medium mb-1'>
              Buy Price *
            </label>
            <InputNumber
              value={form.buyPrice}
              onValueChange={e =>
                setForm(f => ({ ...f, buyPrice: (e.value ?? 0) as number }))
              }
              mode='decimal'
              maxFractionDigits={3}
              className='w-full'
              inputClassName='w-full'
            />
            {errors.buyPrice && (
              <p className='text-xs text-red-600 mt-1'>{errors.buyPrice}</p>
            )}
          </div>
          <div className='col-span-12 md:col-span-3'>
            <label className='block text-sm font-medium mb-1'>Buy Fee *</label>
            <InputNumber
              value={form.buyFee}
              onValueChange={e =>
                setForm(f => ({ ...f, buyFee: (e.value ?? 0) as number }))
              }
              mode='decimal'
              maxFractionDigits={3}
              className='w-full'
              inputClassName='w-full'
            />
            {errors.buyFee && (
              <p className='text-xs text-red-600 mt-1'>{errors.buyFee}</p>
            )}
          </div>
          <div className='col-span-12 md:col-span-3'>
            <label className='block text-sm font-medium mb-1'>
              Sell Price *
            </label>
            <InputNumber
              value={form.sellPrice}
              onValueChange={e =>
                setForm(f => ({ ...f, sellPrice: (e.value ?? 0) as number }))
              }
              mode='decimal'
              maxFractionDigits={3}
              className='w-full'
              inputClassName='w-full'
            />
            {errors.sellPrice && (
              <p className='text-xs text-red-600 mt-1'>{errors.sellPrice}</p>
            )}
          </div>
          <div className='col-span-12 md:col-span-3'>
            <label className='block text-sm font-medium mb-1'>Sell Fee *</label>
            <InputNumber
              value={form.sellFee}
              onValueChange={e =>
                setForm(f => ({ ...f, sellFee: (e.value ?? 0) as number }))
              }
              mode='decimal'
              maxFractionDigits={3}
              className='w-full'
              inputClassName='w-full'
            />
            {errors.sellFee && (
              <p className='text-xs text-red-600 mt-1'>{errors.sellFee}</p>
            )}
          </div>
        </div>

        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-12 md:col-span-6'>
            <label className='block text-sm font-medium mb-1'>
              Buy Comments
            </label>
            <InputTextarea
              autoResize
              value={form.buyComments ?? ''}
              onChange={e =>
                setForm(f => ({ ...f, buyComments: e.target.value }))
              }
              rows={3}
              className='w-full'
            />
          </div>
          <div className='col-span-12 md:col-span-6'>
            <label className='block text-sm font-medium mb-1'>
              Sell Comments
            </label>
            <InputTextarea
              autoResize
              value={form.sellComments ?? ''}
              onChange={e =>
                setForm(f => ({ ...f, sellComments: e.target.value }))
              }
              rows={3}
              className='w-full'
            />
          </div>
        </div>

        <div className='flex justify-between pt-2'>
          <Button
            label='Delete'
            severity='danger'
            icon='pi pi-trash'
            onClick={handleDelete}
          />
          <div className='flex gap-2'>
            <Button label='Cancel' severity='secondary' onClick={onHide} />
            <Button
              label='Save Changes'
              icon='pi pi-save'
              severity='info'
              onClick={handleSave}
            />
          </div>
        </div>
      </div>
      <ConfirmDialog />
    </Dialog>
  );
}
