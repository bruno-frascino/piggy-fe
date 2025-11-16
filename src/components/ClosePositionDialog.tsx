'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import type { LocalHolding } from '@/components/AddHoldingsDialog';

export interface ClosePositionPayload {
  closeDate: string; // ISO YYYY-MM-DD
  closeUnits: number;
  sellPrice: number;
  sellFee: number;
  comments?: string;
}

export default function ClosePositionDialog({
  visible,
  initial,
  onHide,
  onSubmit,
}: {
  visible: boolean;
  initial: LocalHolding | null;
  onHide: () => void;
  onSubmit: (payload: ClosePositionPayload) => void;
}) {
  const [form, setForm] = useState<ClosePositionPayload>({
    closeDate: new Date().toISOString().slice(0, 10),
    closeUnits: 0,
    sellPrice: 0,
    sellFee: 0,
    comments: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible || !initial) return;
    setForm({
      closeDate: new Date().toISOString().slice(0, 10),
      closeUnits: initial.units,
      sellPrice: (initial.currentPrice ?? initial.buyPrice) || 0,
      sellFee: 0,
      comments: '',
    });
    setErrors({});
  }, [visible, initial]);

  const periodDays = useMemo(() => {
    if (!initial) return 0;
    const start = new Date(initial.openDate).getTime();
    const end = new Date(form.closeDate).getTime();
    if (isNaN(start) || isNaN(end)) return 0;
    const diff = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    return diff;
  }, [initial, form.closeDate]);

  const closingPosition = useMemo(() => {
    return (form.closeUnits || 0) * (form.sellPrice || 0);
  }, [form.closeUnits, form.sellPrice]);

  const handleSubmit = () => {
    if (!initial) return;
    const e: Record<string, string> = {};
    if (!/\d{4}-\d{2}-\d{2}/.test(form.closeDate))
      e.closeDate = 'Use YYYY-MM-DD';
    if (
      typeof form.closeUnits !== 'number' ||
      isNaN(form.closeUnits) ||
      form.closeUnits <= 0
    )
      e.closeUnits = 'Enter units > 0';
    if (form.closeUnits > initial.units)
      e.closeUnits = `Cannot exceed open units (${initial.units})`;
    if (typeof form.sellPrice !== 'number' || isNaN(form.sellPrice))
      e.sellPrice = 'Enter a number';
    if (typeof form.sellFee !== 'number' || isNaN(form.sellFee))
      e.sellFee = 'Enter a number';
    setErrors(e);
    if (Object.keys(e).length) return;
    onSubmit({ ...form, comments: form.comments?.trim() || undefined });
  };

  if (!initial) return null;

  return (
    <Dialog
      header={`Close Position — ${initial.symbol}`}
      visible={visible}
      style={{ width: '720px', maxWidth: '95vw' }}
      modal
      onHide={onHide}
    >
      <div className='space-y-4'>
        {/* Summary row */}
        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-12 md:col-span-4'>
            <label className='block text-sm font-medium mb-1'>Symbol</label>
            <InputText value={initial.symbol} readOnly className='w-full' />
          </div>
          <div className='col-span-12 md:col-span-8'>
            <label className='block text-sm font-medium mb-1'>Name</label>
            <InputText value={initial.name ?? ''} readOnly className='w-full' />
          </div>
        </div>

        {/* Close info */}
        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-12 md:col-span-4'>
            <label className='block text-sm font-medium mb-1'>
              Close Date *
            </label>
            <InputText
              value={form.closeDate}
              onChange={e =>
                setForm(f => ({ ...f, closeDate: e.target.value }))
              }
              placeholder='YYYY-MM-DD'
              className='w-full'
            />
            {errors.closeDate && (
              <p className='text-xs text-red-600 mt-1'>{errors.closeDate}</p>
            )}
          </div>
          <div className='col-span-12 md:col-span-4'>
            <label className='block text-sm font-medium mb-1'>
              Period (days)
            </label>
            <InputText value={String(periodDays)} readOnly className='w-full' />
          </div>
          <div className='col-span-12 md:col-span-4'>
            <label className='block text-sm font-medium mb-1'>Open Units</label>
            <InputText
              value={String(initial.units)}
              readOnly
              className='w-full'
            />
          </div>
        </div>

        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-12 md:col-span-4'>
            <label className='block text-sm font-medium mb-1'>
              Close Units *
            </label>
            <InputNumber
              value={form.closeUnits}
              onValueChange={e =>
                setForm(f => ({ ...f, closeUnits: (e.value ?? 0) as number }))
              }
              mode='decimal'
              minFractionDigits={0}
              maxFractionDigits={3}
              className='w-full'
              inputClassName='w-full'
            />
            {errors.closeUnits && (
              <p className='text-xs text-red-600 mt-1'>{errors.closeUnits}</p>
            )}
          </div>
          <div className='col-span-12 md:col-span-4'>
            <label className='block text-sm font-medium mb-1'>
              Sell Price *
            </label>
            <InputNumber
              value={form.sellPrice}
              onValueChange={e =>
                setForm(f => ({ ...f, sellPrice: (e.value ?? 0) as number }))
              }
              mode='decimal'
              minFractionDigits={0}
              maxFractionDigits={3}
              className='w-full'
              inputClassName='w-full'
            />
            {errors.sellPrice && (
              <p className='text-xs text-red-600 mt-1'>{errors.sellPrice}</p>
            )}
          </div>
          <div className='col-span-12 md:col-span-4'>
            <label className='block text-sm font-medium mb-1'>Sell Fee</label>
            <InputNumber
              value={form.sellFee}
              onValueChange={e =>
                setForm(f => ({ ...f, sellFee: (e.value ?? 0) as number }))
              }
              mode='decimal'
              minFractionDigits={0}
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
              Closing Position
            </label>
            <InputText
              value={closingPosition.toFixed(3)}
              readOnly
              className='w-full'
            />
          </div>
          <div className='col-span-12 md:col-span-6'>
            <label className='block text-sm font-medium mb-1'>
              Sell Comments
            </label>
            <InputTextarea
              autoResize
              value={form.comments ?? ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setForm(f => ({ ...f, comments: e.target.value }))
              }
              rows={3}
              className='w-full'
              placeholder='Optional notes'
            />
          </div>
        </div>

        <div className='flex justify-end gap-2 pt-2'>
          <Button label='Cancel' severity='secondary' onClick={onHide} />
          <Button
            label='Close Position'
            icon='pi pi-check'
            severity='danger'
            onClick={handleSubmit}
          />
        </div>
      </div>
    </Dialog>
  );
}
