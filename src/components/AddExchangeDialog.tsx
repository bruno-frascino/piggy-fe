'use client';

import { useState } from 'react';
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

export default function AddExchangeDialog({
  visible,
  onHide,
  onSubmit,
  existingNames = [],
}: {
  visible: boolean;
  onHide: () => void;
  onSubmit: (value: NewExchangePayload) => void;
  existingNames?: string[];
}) {
  const [form, setForm] = useState({
    name: '',
    type: '' as '' | ExchangeType,
    baseCurrency: 'USD',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setForm({ name: '', type: '', baseCurrency: 'USD', description: '' });
    setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const name = form.name.trim();
    if (!name) e.name = 'Name is required';
    if (
      name &&
      existingNames.some(n => n.toLowerCase() === name.toLowerCase())
    ) {
      e.name = 'Name must be unique';
    }
    if (!form.type) e.type = 'Type is required';
    const code = form.baseCurrency.trim();
    if (!code) e.baseCurrency = 'Base currency required';
    if (code && code.length !== 3)
      e.baseCurrency = 'Use 3-letter code (e.g., USD)';
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
    reset();
  };

  const handleHide = () => {
    onHide();
    reset();
  };

  return (
    <Dialog
      header='Add Exchange'
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
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder='e.g. MyBroker'
            className='w-full'
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
          <InputText
            value={form.baseCurrency}
            onChange={e =>
              setForm(f => ({
                ...f,
                baseCurrency: e.target.value.toUpperCase(),
              }))
            }
            placeholder='USD'
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
            label='Add Exchange'
            icon='pi pi-check'
            onClick={handleSubmit}
          />
        </div>
      </div>
    </Dialog>
  );
}
