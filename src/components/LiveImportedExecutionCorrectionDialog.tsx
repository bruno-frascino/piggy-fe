'use client';

import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import AppDialog from './AppDialog';
import { useCorrectLiveImportedExecution } from '@/hooks/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePrivacy } from '@/lib/privacy-context';
import type { LiveImportedExecutionCorrectionMetadata } from '@/lib/types';

export default function LiveImportedExecutionCorrectionDialog({
  accountId,
  symbol,
  correction,
  onHide,
  onSaved,
}: {
  accountId: string;
  symbol: string;
  correction: LiveImportedExecutionCorrectionMetadata;
  onHide: () => void;
  onSaved: () => void;
}) {
  const online = useNetworkStatus();
  const { hidden } = usePrivacy();
  const { mutateAsync, isPending } = useCorrectLiveImportedExecution();
  const [form, setForm] = useState({
    effectiveDate: correction.effectiveDate,
    sequence: String(correction.sequence),
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
      !decimal.test(form.price) ||
      Number(form.price) <= 0 ||
      !decimal.test(form.fees) ||
      !form.reason.trim() ||
      !acknowledged
    ) {
      setError(
        'Enter a valid date, exact price and fees, positive sequence, audit reason, and acknowledge the financial impact.'
      );
      return;
    }
    const input = {
      expectedRevisionId: correction.expectedRevisionId,
      expectedSourceFingerprint: correction.expectedSourceFingerprint,
      effectiveDate: form.effectiveDate,
      sequence: Number(form.sequence),
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
        eventId: correction.eventId,
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
          'Account history changed or this correction conflicts with another operation. Refresh and review before submitting again.'
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
              : 'Could not correct this imported execution. Please retry.'
        );
      }
    }
  };
  return (
    <AppDialog
      header={`Correct imported execution - ${symbol}`}
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
          text='This adds an audited overlay to the live imported trade and cash history. The original Kraken event, execution quantity, currency and existing parcel allocations remain unchanged. Correcting price or date can change parcel results and existing tax reports.'
        />
        {!online && (
          <Message
            severity='warn'
            text='Reconnect to correct this execution. Offline changes are not queued.'
          />
        )}
        {hidden && (
          <Message
            severity='info'
            text='Disable privacy mode to review and submit exact execution amounts.'
          />
        )}
        {error && <Message severity='error' text={error} />}
        <label className='block' htmlFor='imported-correction-date'>
          Corrected effective date
        </label>
        <Calendar
          inputId='imported-correction-date'
          dateFormat='dd/mm/yy'
          showIcon
          value={new Date(`${form.effectiveDate}T00:00:00`)}
          disabled={isPending || stale}
          onChange={event => {
            const date = event.value;
            if (date instanceof Date)
              setForm(value => ({
                ...value,
                effectiveDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
              }));
          }}
        />
        {(['sequence', 'price', 'fees'] as const).map(field => (
          <div key={field}>
            <label className='block' htmlFor={`imported-correction-${field}`}>
              {
                {
                  sequence: 'Cash sequence',
                  price: `Exact execution price (${correction.currency})`,
                  fees: `Exact total fees (${correction.currency})`,
                }[field]
              }
            </label>
            <InputText
              id={`imported-correction-${field}`}
              value={hidden && field !== 'sequence' ? '' : form[field]}
              type={hidden && field !== 'sequence' ? 'password' : 'text'}
              autoComplete='off'
              inputMode={field === 'sequence' ? 'numeric' : 'decimal'}
              disabled={isPending || stale || hidden}
              onChange={event =>
                setForm(value => ({ ...value, [field]: event.target.value }))
              }
            />
          </div>
        ))}
        <label className='block' htmlFor='imported-correction-reason'>
          Audit reason
        </label>
        <InputTextarea
          id='imported-correction-reason'
          value={form.reason}
          maxLength={1000}
          disabled={isPending || stale}
          onChange={event =>
            setForm(value => ({ ...value, reason: event.target.value }))
          }
        />
        <div className='flex gap-2 items-center'>
          <Checkbox
            inputId='imported-correction-acknowledgement'
            checked={acknowledged}
            disabled={isPending || stale}
            onChange={event => setAcknowledged(event.checked === true)}
          />
          <label htmlFor='imported-correction-acknowledgement'>
            I understand this changes live cash and parcel results.
          </label>
        </div>
      </div>
    </AppDialog>
  );
}
