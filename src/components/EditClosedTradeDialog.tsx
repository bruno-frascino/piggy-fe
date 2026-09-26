'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { usePrivacy } from '@/lib/privacy-context';
import type { ClosedTrade, TaxReportUsage } from '@/lib/types';

interface Props {
  trade: ClosedTrade;
  reportUsage?: TaxReportUsage[];
  onHide: () => void;
  onSave: (updated: ClosedTrade) => void;
  onDeletePosition: (positionId: string) => void;
}

// Open-side facts (symbol, exchange, bought units, entry price/fee) define the
// CGT parcel and are corrected on the position itself, not from this dialog.
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className='block text-sm font-medium mb-1'>{label}</label>
      <p
        className='min-h-10 px-3 py-2 rounded border text-sm flex items-center'
        style={{
          borderColor: 'var(--tr-border)',
          background: 'var(--tr-bg-2, #f8fafc)',
          color: 'var(--tr-text-2)',
        }}
      >
        {value || '—'}
      </p>
    </div>
  );
}

export default function EditClosedTradeDialog({
  trade,
  reportUsage = [],
  onHide,
  onSave,
  onDeletePosition,
}: Props) {
  const [form, setForm] = useState<ClosedTrade>(trade);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { mask } = usePrivacy();

  useEffect(() => {
    setForm(trade);
    setErrors({});
  }, [trade]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.closeDate.trim()) e.closeDate = 'Required';
    else if (!/\d{4}-\d{2}-\d{2}/.test(form.closeDate))
      e.closeDate = 'Use YYYY-MM-DD';
    else if (
      new Date(form.closeDate).getTime() < new Date(form.openDate).getTime()
    ) {
      e.closeDate = 'Close date cannot be before open date';
    }
    (['sellPrice', 'sellFee'] as (keyof ClosedTrade)[]).forEach(k => {
      const v = form[k];
      if (typeof v !== 'number' || isNaN(v as number))
        e[k as string] = 'Enter number';
      else if ((v as number) < 0) e[k as string] = 'Must be ≥ 0';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form });
  };

  const handleDelete = () => {
    if (!form.positionId) return;

    confirmDialog({
      message:
        'Are you sure you want to delete this position and all its close events?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: () => onDeletePosition(form.positionId!),
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
      currency: trade.baseCurrency ?? 'USD',
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
      blockScroll
      style={{ width: '900px', maxWidth: '95vw' }}
      onHide={onHide}
    >
      <div className='space-y-4'>
        {reportUsage.length > 0 && (
          <Message
            severity={reportUsage.some(u => u.stale) ? 'warn' : 'info'}
            text={
              reportUsage.some(u => u.stale)
                ? `This position changed after the ${reportUsage
                    .filter(u => u.stale)
                    .map(u => u.financialYearLabel)
                    .join(
                      ', '
                    )} tax report was generated. Regenerate that report so the PDF matches your data.`
                : `This position is included in the ${reportUsage
                    .map(u => u.financialYearLabel)
                    .join(
                      ', '
                    )} tax report. Saving changes here will require regenerating it.`
            }
          />
        )}

        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-12 md:col-span-3'>
            <ReadOnlyField label='Symbol' value={form.symbol} />
          </div>
          <div className='col-span-12 md:col-span-6'>
            <ReadOnlyField label='Name' value={form.name ?? ''} />
          </div>
          <div className='col-span-12 md:col-span-3'>
            <ReadOnlyField label='Exchange' value={form.exchange ?? ''} />
          </div>
        </div>

        <p className='text-xs' style={{ color: 'var(--tr-text-2)' }}>
          Symbol, exchange, open date, bought units and entry price/fee define
          this position&apos;s tax parcel — correct them on the position itself
          from the dashboard.
        </p>

        {/* Summary Metrics */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 text-center bg-blue-50 rounded-md p-3 text-sm'>
          <div>
            <p className='text-gray-600'>Open Position</p>
            <p className='font-semibold'>
              {mask(formatCurrency(openPosition))}
            </p>
          </div>
          <div>
            <p className='text-gray-600'>Close Position</p>
            <p className='font-semibold'>
              {mask(formatCurrency(closePosition))}
            </p>
          </div>
          <div>
            <p className='text-gray-600'>P/L</p>
            <p
              className={`font-semibold ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {mask(formatCurrency(pl))}
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
            <ReadOnlyField label='Open Date' value={form.openDate} />
          </div>
          <div className='col-span-12 md:col-span-4'>
            <label className='block text-sm font-medium mb-1'>
              Close Date *
            </label>
            <Calendar
              value={(() => {
                const parts = (form.closeDate ?? '').split('-').map(Number);
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
                  setForm(f => ({ ...f, closeDate: `${y}-${mo}-${dy}` }));
                } else {
                  setForm(f => ({ ...f, closeDate: '' }));
                }
              }}
              dateFormat='dd/mm/yy'
              mask='99/99/9999'
              readOnlyInput={false}
              inputRef={input => {
                if (input) input.inputMode = 'numeric';
              }}
              showIcon
              placeholder='DD/MM/YYYY'
              className='w-full'
              inputClassName='w-full'
            />
            {errors.closeDate && (
              <p className='text-xs text-red-600 mt-1'>{errors.closeDate}</p>
            )}
          </div>
          <div className='col-span-12 md:col-span-4'>
            <ReadOnlyField
              label='Units Closed'
              value={mask(form.unitsClosed.toFixed(3))}
            />
          </div>
        </div>

        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-12 md:col-span-3'>
            <ReadOnlyField
              label='Buy Price'
              value={formatCurrency(form.buyPrice)}
            />
          </div>
          <div className='col-span-12 md:col-span-3'>
            <ReadOnlyField
              label='Buy Fee'
              value={mask(formatCurrency(form.buyFee))}
            />
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
            label='Delete Position'
            severity='danger'
            icon='pi pi-trash'
            onClick={handleDelete}
            disabled={!form.positionId}
            title={
              form.positionId
                ? 'Delete this position'
                : 'Cannot delete: missing position id'
            }
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
