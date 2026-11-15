'use client';

import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import AppDialog from './AppDialog';
import {
  useAccountTradeCapability,
  usePostAccountFxConversion,
} from '@/hooks/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePrivacy } from '@/lib/privacy-context';
import { useToast } from '@/lib/toast-context';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { sydneyToday, toLocalDateString } from '@/lib/date';

export default function LiveFxConversionDialog({
  accountId,
  accountName,
  onHide,
}: {
  accountId: string;
  accountName: string;
  onHide: () => void;
}) {
  const online = useNetworkStatus();
  const { hidden } = usePrivacy();
  const toast = useToast();
  const mutation = usePostAccountFxConversion();
  const [date, setDate] = useState<Date | null>(sydneyToday);
  const [sequence, setSequence] = useState('1');
  const [fromCurrency, setFromCurrency] = useState('AUD');
  const [toCurrency, setToCurrency] = useState('USD');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromFee, setFromFee] = useState('0');
  const [toFee, setToFee] = useState('0');
  const [reference, setReference] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const retry = useRef<{ signature: string; key: string } | null>(null);
  const effectiveDate = date ? toLocalDateString(date) : '';
  const capability = useAccountTradeCapability(
    accountId,
    effectiveDate,
    online
  );
  const ready =
    online &&
    !hidden &&
    !mutation.isPending &&
    !capability.isFetching &&
    !capability.isError &&
    capability.data?.mode === 'LIVE_LEDGER';
  const submit = async () => {
    if (!ready) return;
    const order = Number(sequence);
    const decimal = /^\d+(?:\.\d+)?$/;
    if (
      !effectiveDate ||
      !acknowledged ||
      !Number.isSafeInteger(order) ||
      order < 1 ||
      !/^[A-Z]{3}$/.test(fromCurrency) ||
      !/^[A-Z]{3}$/.test(toCurrency) ||
      fromCurrency === toCurrency ||
      !decimal.test(fromAmount) ||
      !/[1-9]/.test(fromAmount) ||
      !decimal.test(toAmount) ||
      !/[1-9]/.test(toAmount) ||
      !decimal.test(fromFee) ||
      !decimal.test(toFee) ||
      !reference.trim() ||
      reference !== reference.trim()
    ) {
      setError(
        'Enter two distinct currencies, exact positive exchanged amounts, non-negative fees, date, sequence and statement reference, then acknowledge the linked postings.'
      );
      return;
    }
    const payload = {
      effectiveDate,
      sequence: order,
      from: { currency: fromCurrency, amount: fromAmount },
      to: { currency: toCurrency, amount: toAmount },
      fees: [
        { currency: fromCurrency, amount: fromFee },
        { currency: toCurrency, amount: toFee },
      ].filter(fee => /[1-9]/.test(fee.amount)),
      sourceReference: reference,
    };
    const signature = JSON.stringify(payload);
    if (retry.current?.signature !== signature)
      retry.current = { signature, key: globalThis.crypto.randomUUID() };
    setError('');
    try {
      await mutation.mutateAsync({
        accountId,
        input: { ...payload, idempotencyKey: retry.current.key },
      });
      toast.show({
        severity: 'success',
        summary: 'FX conversion recorded',
        detail:
          'Both currency balances were updated atomically. No money was exchanged by this app.',
      });
      onHide();
    } catch (failure) {
      setError(
        mutationErrorMessage(
          failure,
          'Could not record FX. Review dated funding and statement amounts before retrying.'
        )
      );
    }
  };
  return (
    <AppDialog
      header={`Record FX conversion - ${accountName}`}
      visible
      modal
      blockScroll
      task
      closable={!mutation.isPending}
      closeOnEscape={!mutation.isPending}
      onHide={() => {
        if (!mutation.isPending) onHide();
      }}
      style={{ width: '640px', maxWidth: '100vw' }}
      footer={
        <Button
          label='Record linked FX conversion'
          disabled={!ready || !acknowledged}
          loading={mutation.isPending}
          onClick={() => void submit()}
        />
      }
    >
      <div className='space-y-3'>
        <p>
          Record a conversion already executed at your broker, not a live
          exchange. Enter exchanged amounts before separately charged fees. Use
          the actual statement amounts; no market rate or spread is inferred.
          Both currencies require explicit opening balances.
        </p>
        {!online && (
          <Message
            severity='warn'
            text='Offline: FX writes are never queued. Reconnect before submitting.'
          />
        )}
        {hidden && (
          <Message
            severity='info'
            text='Disable privacy mode to enter FX amounts.'
          />
        )}
        {capability.isError && (
          <Message
            severity='error'
            text={mutationErrorMessage(
              capability.error,
              'Could not verify account capability. No FX can be submitted.'
            )}
          />
        )}
        {capability.data?.mode !== 'LIVE_LEDGER' && (
          <Message
            severity='info'
            text='FX requires an eligible active confirmed real ledger for this date. This form never activates accounts.'
          />
        )}
        {error && <Message severity='error' text={error} />}
        {!hidden && (
          <>
            <label className='flex flex-col gap-1'>
              Effective date
              <Calendar
                value={date}
                onChange={event =>
                  setDate(event.value instanceof Date ? event.value : null)
                }
                dateFormat='dd/mm/yy'
                showIcon
                disabled={!online || hidden || mutation.isPending}
              />
            </label>
            <label className='flex flex-col gap-1'>
              Intraday sequence
              <InputText
                value={sequence}
                onChange={event => setSequence(event.target.value)}
                inputMode='numeric'
                disabled={!ready}
              />
            </label>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <label className='flex flex-col gap-1'>
                From currency
                <InputText
                  value={fromCurrency}
                  onChange={event =>
                    setFromCurrency(event.target.value.toUpperCase())
                  }
                  disabled={!ready}
                  maxLength={3}
                />
              </label>
              <label className='flex flex-col gap-1'>
                To currency
                <InputText
                  value={toCurrency}
                  onChange={event =>
                    setToCurrency(event.target.value.toUpperCase())
                  }
                  disabled={!ready}
                  maxLength={3}
                />
              </label>
              <label className='flex flex-col gap-1'>
                Amount exchanged (before fees)
                <InputText
                  value={fromAmount}
                  onChange={event => setFromAmount(event.target.value)}
                  disabled={!ready}
                  inputMode='decimal'
                />
              </label>
              <label className='flex flex-col gap-1'>
                Amount received (before fees)
                <InputText
                  value={toAmount}
                  onChange={event => setToAmount(event.target.value)}
                  disabled={!ready}
                  inputMode='decimal'
                />
              </label>
              <label className='flex flex-col gap-1'>
                Fee in from currency
                <InputText
                  value={fromFee}
                  onChange={event => setFromFee(event.target.value)}
                  disabled={!ready}
                  inputMode='decimal'
                />
              </label>
              <label className='flex flex-col gap-1'>
                Fee in to currency
                <InputText
                  value={toFee}
                  onChange={event => setToFee(event.target.value)}
                  disabled={!ready}
                  inputMode='decimal'
                />
              </label>
            </div>
            <label className='flex flex-col gap-1'>
              Statement reference
              <InputText
                value={reference}
                onChange={event => setReference(event.target.value)}
                disabled={!ready}
                maxLength={200}
              />
            </label>
            <div className='flex gap-2'>
              <Checkbox
                inputId='fx-ack'
                checked={acknowledged}
                disabled={!ready}
                onChange={event => setAcknowledged(Boolean(event.checked))}
              />
              <label htmlFor='fx-ack'>
                I reviewed both currency amounts and fees. This records
                immutable linked postings; corrections and terminal reversals
                use the dedicated audited FX review workflow.
              </label>
            </div>
          </>
        )}
      </div>
    </AppDialog>
  );
}
