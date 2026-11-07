'use client';

import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { isAxiosError } from 'axios';
import AppDialog from './AppDialog';
import { useCorrectLiveManualAcquisition } from '@/hooks/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePrivacy } from '@/lib/privacy-context';
import type { LiveAcquisitionCorrectionMetadata } from '@/lib/types';

export default function LiveAcquisitionCorrectionDialog({
  accountId,
  symbol,
  correction,
  onHide,
  onSaved,
}: {
  accountId: string;
  symbol: string;
  correction: LiveAcquisitionCorrectionMetadata;
  onHide: () => void;
  onSaved: () => void;
}) {
  const online = useNetworkStatus();
  const { hidden } = usePrivacy();
  const { mutateAsync, isPending } = useCorrectLiveManualAcquisition();
  const [form, setForm] = useState({
    effectiveDate: correction.effectiveDate,
    sequence: String(correction.sequence),
    quantity: correction.quantity,
    price: correction.price,
    fees: correction.fees,
    reason: '',
  });
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);
  const retry = useRef<{ signature: string; idempotencyKey: string } | null>(
    null
  );
  const save = async () => {
    const decimal = /^\d+(\.\d+)?$/;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(form.effectiveDate) ||
      !/^\d+$/.test(form.sequence) ||
      !Number.isSafeInteger(Number(form.sequence)) ||
      Number(form.sequence) < 1 ||
      !decimal.test(form.quantity) ||
      Number(form.quantity) <= 0 ||
      !decimal.test(form.price) ||
      Number(form.price) <= 0 ||
      !decimal.test(form.fees) ||
      !form.reason.trim() ||
      !acknowledged
    ) {
      setError(
        'Enter valid exact amounts, a positive sequence, an audit reason and acknowledge the financial impact.'
      );
      return;
    }
    const input = {
      expectedRevisionId: correction.expectedRevisionId,
      expectedSourceFingerprint: correction.expectedSourceFingerprint,
      effectiveDate: form.effectiveDate,
      sequence: Number(form.sequence),
      quantity: form.quantity,
      price: form.price,
      fees: form.fees,
      reason: form.reason.trim(),
    };
    const signature = JSON.stringify(input);
    if (retry.current?.signature !== signature)
      retry.current = {
        signature,
        idempotencyKey: globalThis.crypto.randomUUID(),
      };
    setError('');
    try {
      await mutateAsync({
        accountId,
        transactionId: correction.transactionId,
        input: { ...input, idempotencyKey: retry.current.idempotencyKey },
      });
      onSaved();
    } catch (failure) {
      if (
        isAxiosError<{ message?: unknown }>(failure) &&
        failure.response?.status === 409
      ) {
        setStale(true);
        setError(
          'Account history changed or the correction conflicts with recorded trades. Close this editor, refresh and review before submitting again.'
        );
      } else {
        const message = isAxiosError<{ message?: unknown }>(failure)
          ? failure.response?.data?.message
          : undefined;
        setError(
          typeof message === 'string'
            ? message
            : failure instanceof Error
              ? failure.message
              : 'Could not correct this acquisition. Please retry.'
        );
      }
    }
  };
  return (
    <AppDialog
      header={`Correct acquisition - ${symbol}`}
      visible
      task
      style={{ width: '640px', maxWidth: '95vw' }}
      onHide={() => {
        if (!isPending) onHide();
      }}
      footer={
        <div className='task-actions'>
          <Button
            label='Cancel'
            outlined
            onClick={onHide}
            disabled={isPending}
          />
          <Button
            label='Record correction'
            onClick={() => void save()}
            loading={isPending}
            disabled={isPending || !online || stale || hidden}
          />
        </div>
      }
    >
      <div className='space-y-4'>
        <Message
          severity='warn'
          text='This changes LIVE acquisition cost basis, realized results and cash history. Existing sales stay unchanged; a quantity correction may close or reopen the parcel. Previously generated tax reports may need regeneration.'
        />
        {!online && (
          <Message
            severity='warn'
            text='Reconnect to correct this acquisition. Offline changes are not queued.'
          />
        )}
        {hidden && (
          <Message
            severity='info'
            text='Disable privacy mode to review and submit exact acquisition amounts.'
          />
        )}
        {error && <Message severity='error' text={error} />}
        <label className='block' htmlFor='acquisition-date'>
          Purchase date
        </label>
        <Calendar
          inputId='acquisition-date'
          dateFormat='dd/mm/yy'
          showIcon
          value={new Date(`${form.effectiveDate}T00:00:00`)}
          disabled={isPending || stale}
          onChange={event => {
            const date = event.value;
            if (date instanceof Date)
              setForm(f => ({
                ...f,
                effectiveDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
              }));
          }}
        />
        {(['sequence', 'quantity', 'price', 'fees'] as const).map(field => (
          <div key={field}>
            <label className='block' htmlFor={`acquisition-${field}`}>
              {
                {
                  sequence: 'Cash sequence',
                  quantity: 'Total bought units (not remaining units)',
                  price: 'Exact purchase price',
                  fees: 'Exact total purchase fees',
                }[field]
              }
            </label>
            <InputText
              id={`acquisition-${field}`}
              value={hidden && field !== 'sequence' ? '' : form[field]}
              type={hidden && field !== 'sequence' ? 'password' : 'text'}
              autoComplete='off'
              inputMode={field === 'sequence' ? 'numeric' : 'decimal'}
              disabled={isPending || stale || hidden}
              onChange={event =>
                setForm(f => ({ ...f, [field]: event.target.value }))
              }
            />
          </div>
        ))}
        <label className='block' htmlFor='acquisition-reason'>
          Audit reason
        </label>
        <InputTextarea
          id='acquisition-reason'
          value={form.reason}
          maxLength={1000}
          disabled={isPending || stale}
          onChange={event =>
            setForm(f => ({ ...f, reason: event.target.value }))
          }
        />
        <div className='flex gap-2 items-center'>
          <Checkbox
            inputId='acquisition-acknowledgement'
            checked={acknowledged}
            disabled={isPending || stale}
            onChange={event => setAcknowledged(event.checked === true)}
          />
          <label htmlFor='acquisition-acknowledgement'>
            I understand this changes live cash, cost basis and tax-report
            results.
          </label>
        </div>
      </div>
    </AppDialog>
  );
}
