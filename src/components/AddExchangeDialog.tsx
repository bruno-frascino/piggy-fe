'use client';

import { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import type { ExchangeKey } from '@/lib/mock-portfolio';

export type ExchangeType = 'crypto' | 'stocks' | 'mixed';

export interface NewExchangePayload {
  name: ExchangeKey;
  type: ExchangeType;
  baseCurrency: string;
  description?: string;
}

const exchangeTypeOptions = [
  { label: 'Crypto', value: 'crypto' },
  { label: 'Stocks', value: 'stocks' },
  { label: 'Mixed', value: 'mixed' },
];

const baseCurrencyOptions = [
  { label: 'AUD', value: 'AUD' },
  { label: 'BRL', value: 'BRL' },
  { label: 'USD', value: 'USD' },
];

export default function AddExchangeDialog({
  visible,
  onHide,
  onSubmit,
  existingNames = [],
  mode = 'add',
  initial,
  disableNameEdit = false,
}: {
  visible: boolean;
  onHide: () => void;
  onSubmit: (value: NewExchangePayload) => void;
  existingNames?: string[];
  mode?: 'add' | 'edit';
  initial?: Partial<NewExchangePayload> & { name: ExchangeKey };
  disableNameEdit?: boolean;
}) {
  const [form, setForm] = useState({
    name: '',
    type: '' as '' | ExchangeType,
    baseCurrency: 'USD',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Prefill when editing
  useEffect(() => {
    if (visible && mode === 'edit' && initial) {
      setForm({
        name: initial.name,
        type: (initial.type as ExchangeType) || ('' as '' | ExchangeType),
        baseCurrency: (initial.baseCurrency || 'USD').toUpperCase(),
        description: initial.description || '',
      });
      setErrors({});
    } else if (visible && mode === 'add') {
      // Ensure clean slate when opening add dialog
      setForm({
        name: '',
        type: '' as '' | ExchangeType,
        baseCurrency: 'USD',
        description: '',
      });
      setErrors({});
    }
  }, [visible, mode, initial]);

  const reset = () => {
    setForm({ name: '', type: '', baseCurrency: 'USD', description: '' });
    setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const name = form.name.trim();
    if (!name) e.name = 'Name is required';
    if (
      mode === 'add' &&
      name &&
      existingNames.some(n => n.toLowerCase() === name.toLowerCase())
    ) {
      e.name = 'Name must be unique';
    }
    if (mode === 'edit' && !disableNameEdit && name) {
      const isDuplicate = existingNames
        .filter(n => n.toLowerCase() !== initial?.name.toLowerCase())
        .some(n => n.toLowerCase() === name.toLowerCase());
      if (isDuplicate) e.name = 'Another exchange already uses this name';
    }
    if (!form.type) e.type = 'Type is required';
    const code = form.baseCurrency.trim().toUpperCase();
    if (!code) e.baseCurrency = 'Base currency required';
    const allowed = new Set(baseCurrencyOptions.map(o => o.value));
    if (code && !allowed.has(code)) e.baseCurrency = 'Select a currency';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      name: form.name.trim() as ExchangeKey,
      type: form.type as ExchangeType,
      baseCurrency: form.baseCurrency.toUpperCase(),
      description: form.description.trim() || undefined,
    });
    // In edit mode keep values until hide so user can re-open and continue if needed
    if (mode === 'add') {
      reset();
    }
  };

  const handleHide = () => {
    onHide();
    reset();
  };

  return (
    <Dialog
      header={mode === 'edit' ? 'Edit Exchange' : 'Add Exchange'}
      visible={visible}
      style={{ width: '500px' }}
      modal
      onHide={handleHide}
    >
      <div className='space-y-4'>
        <div>
          <label className='block text-sm font-medium mb-1'>Name *</label>
          <InputText
            value={form.name}
            onChange={e =>
              setForm(f => ({
                ...f,
                name: disableNameEdit ? f.name : e.target.value,
              }))
            }
            placeholder='e.g. MyBroker'
            className='w-full'
            disabled={mode === 'edit' && disableNameEdit}
          />
          {errors.name && (
            <p className='text-xs text-red-600 mt-1'>{errors.name}</p>
          )}
        </div>
        <div>
          <label className='block text-sm font-medium mb-1'>Type *</label>
          <Dropdown
            value={form.type}
            options={exchangeTypeOptions}
            onChange={e => setForm(f => ({ ...f, type: e.value }))}
            placeholder='Select type'
            className='w-full'
          />
          {errors.type && (
            <p className='text-xs text-red-600 mt-1'>{errors.type}</p>
          )}
        </div>
        <div>
          <label className='block text-sm font-medium mb-1'>
            Base Currency *
          </label>
          <Dropdown
            value={form.baseCurrency}
            options={baseCurrencyOptions}
            onChange={e => setForm(f => ({ ...f, baseCurrency: e.value }))}
            placeholder='Select base currency'
            className='w-full'
          />
          {errors.baseCurrency && (
            <p className='text-xs text-red-600 mt-1'>{errors.baseCurrency}</p>
          )}
        </div>
        <div>
          <label className='block text-sm font-medium mb-1'>Description</label>
          <InputTextarea
            autoResize
            value={form.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setForm(f => ({ ...f, description: e.target.value }))
            }
            rows={3}
            className='w-full'
            placeholder='Optional notes'
          />
        </div>
        <div className='flex justify-end gap-2 pt-2'>
          <Button label='Cancel' severity='secondary' onClick={handleHide} />
          <Button
            label={mode === 'edit' ? 'Save Changes' : 'Add Exchange'}
            icon={mode === 'edit' ? 'pi pi-save' : 'pi pi-check'}
            severity='info'
            onClick={handleSubmit}
          />
        </div>
      </div>
    </Dialog>
  );
}
