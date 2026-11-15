'use client';

import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import AppDialog from './AppDialog';
import {
  useAccountTradeCapability,
  usePostAccountCashTransfer,
} from '@/hooks/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePrivacy } from '@/lib/privacy-context';
import { useToast } from '@/lib/toast-context';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { sydneyToday, toLocalDateString } from '@/lib/date';
import type { TradingAccount } from '@/lib/types';

export default function LiveCashTransferDialog({
  account,
  accounts,
  onHide,
}: {
  account: TradingAccount;
  accounts: TradingAccount[];
  onHide: () => void;
}) {
  const online = useNetworkStatus();
  const { hidden } = usePrivacy();
  const toast = useToast();
  const mutation = usePostAccountCashTransfer();
  const [toAccountId, setToAccountId] = useState('');
  const [date, setDate] = useState<Date | null>(sydneyToday);
  const [sourceSequence, setSourceSequence] = useState('1');
  const [destinationSequence, setDestinationSequence] = useState('1');
  const [currency, setCurrency] = useState('AUD');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('0');
  const [reference, setReference] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const retry = useRef<{ signature: string; key: string } | null>(null);
  const effectiveDate = date ? toLocalDateString(date) : '';
  const source = useAccountTradeCapability(account.id, effectiveDate, online);
  const destination = useAccountTradeCapability(
    toAccountId,
    effectiveDate,
    online
  );
  const ready =
    online &&
    !hidden &&
    !mutation.isPending &&
    !source.isFetching &&
    !destination.isFetching &&
    !source.isError &&
    !destination.isError &&
    source.data?.mode === 'LIVE_LEDGER' &&
    destination.data?.mode === 'LIVE_LEDGER';
  const candidates = accounts.filter(
    candidate =>
      candidate.id !== account.id &&
      !candidate.isDemo &&
      candidate.status !== 'CLOSED'
  );
  const submit = async () => {
    if (!ready) return;
    const sourceOrder = Number(sourceSequence);
    const destinationOrder = Number(destinationSequence);
    if (
      !acknowledged ||
      !toAccountId ||
      !effectiveDate ||
      !Number.isSafeInteger(sourceOrder) ||
      sourceOrder < 1 ||
      !Number.isSafeInteger(destinationOrder) ||
      destinationOrder < 1 ||
      !/^\d+(?:\.\d+)?$/.test(amount) ||
      !/[1-9]/.test(amount) ||
      !/^\d+(?:\.\d+)?$/.test(fee) ||
      !/^[A-Z]{3}$/.test(currency) ||
      !reference.trim() ||
      reference !== reference.trim()
    ) {
      setError(
        'Review both accounts, exact amounts, date, sequences and source reference, then acknowledge the paired transfer.'
      );
      return;
    }
    const payload = {
      toAccountId,
      effectiveDate,
      sourceSequence: sourceOrder,
      destinationSequence: destinationOrder,
      currency,
      amount,
      fee,
      sourceReference: reference,
    };
    const signature = JSON.stringify(payload);
    if (retry.current?.signature !== signature)
      retry.current = { signature, key: globalThis.crypto.randomUUID() };
    setError('');
    try {
      await mutation.mutateAsync({
        accountId: account.id,
        input: { ...payload, idempotencyKey: retry.current.key },
      });
      toast.show({
        severity: 'success',
        summary: 'Cash transfer recorded',
        detail: 'Both account histories were updated atomically.',
      });
      onHide();
    } catch (failure) {
      setError(
        mutationErrorMessage(
          failure,
          'Could not record the paired cash transfer. Review both histories before retrying.'
        )
      );
    }
  };
  return (
    <AppDialog
      header={`Transfer cash - ${account.name}`}
      visible
      modal
      blockScroll
      task
      closable={!mutation.isPending}
      closeOnEscape={!mutation.isPending}
      onHide={() => {
        if (!mutation.isPending) onHide();
      }}
      style={{ width: '600px', maxWidth: '100vw' }}
      footer={
        <Button
          label='Record paired transfer'
          onClick={() => void submit()}
          disabled={!ready || !acknowledged}
          loading={mutation.isPending}
        />
      }
    >
      <div className='space-y-4'>
        <p>
          Same-currency cash only. Both accounts must already have active
          confirmed ledgers and explicit opening cash in this currency. No
          account is activated.
        </p>
        <p>
          Principal leaves this account and arrives in the other on the same
          date; the fee is charged only here. Principal cancels when both
          accounts are selected. No holdings or FX conversion is created.
        </p>
        {!online && (
          <Message
            severity='warn'
            text='Offline: reconnect to transfer cash. Changes are not queued.'
          />
        )}
        {hidden && (
          <Message
            severity='info'
            text='Disable privacy mode to transfer cash.'
          />
        )}
        {error && <Message severity='error' text={error} />}
        {(source.isError || destination.isError) && (
          <Message
            severity='error'
            text='Could not verify both ledger capabilities. Refresh before recording a transfer.'
          />
        )}
        <Button
          label='Refresh eligibility'
          outlined
          size='small'
          disabled={
            !online ||
            mutation.isPending ||
            source.isFetching ||
            destination.isFetching
          }
          onClick={() => {
            void source.refetch();
            if (toAccountId) void destination.refetch();
          }}
        />
        {source.data?.mode !== 'LIVE_LEDGER' && source.data && (
          <Message
            severity='warn'
            text={
              source.data.reason ??
              'The source account is not eligible for live transfers.'
            }
          />
        )}
        {destination.data?.mode !== 'LIVE_LEDGER' && destination.data && (
          <Message
            severity='warn'
            text={
              destination.data.reason ??
              'The destination account is not eligible for live transfers.'
            }
          />
        )}
        <label className='flex flex-col gap-1'>
          Destination account
          <Dropdown
            inputId='transfer-destination'
            aria-label='Destination account'
            value={toAccountId}
            options={candidates}
            optionLabel='name'
            optionValue='id'
            onChange={event => {
              if (typeof event.value === 'string') setToAccountId(event.value);
            }}
            disabled={mutation.isPending}
            placeholder='Select another account'
          />
        </label>
        {candidates.length === 0 && (
          <Message
            severity='info'
            text='Another active real account is required. Legacy accounts are not automatically enabled.'
          />
        )}
        <label className='flex flex-col gap-1'>
          Effective date
          <Calendar
            value={date}
            onChange={event =>
              setDate(event.value instanceof Date ? event.value : null)
            }
            dateFormat='dd/mm/yy'
            maxDate={sydneyToday()}
            showIcon
            disabled={mutation.isPending}
          />
        </label>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <label className='flex flex-col gap-1'>
            Source sequence
            <InputText
              value={sourceSequence}
              onChange={event => setSourceSequence(event.target.value)}
              disabled={mutation.isPending}
              inputMode='numeric'
            />
          </label>
          <label className='flex flex-col gap-1'>
            Destination sequence
            <InputText
              value={destinationSequence}
              onChange={event => setDestinationSequence(event.target.value)}
              disabled={mutation.isPending}
              inputMode='numeric'
            />
          </label>
          <label className='flex flex-col gap-1'>
            Currency
            <InputText
              value={currency}
              onChange={event => setCurrency(event.target.value.toUpperCase())}
              disabled={mutation.isPending}
              maxLength={3}
            />
          </label>
          <label className='flex flex-col gap-1'>
            Principal amount
            <InputText
              value={amount}
              onChange={event => setAmount(event.target.value)}
              disabled={mutation.isPending}
              inputMode='decimal'
            />
          </label>
          <label className='flex flex-col gap-1'>
            Sender-paid fee
            <InputText
              value={fee}
              onChange={event => setFee(event.target.value)}
              disabled={mutation.isPending}
              inputMode='decimal'
            />
          </label>
          <label className='flex flex-col gap-1'>
            Source reference
            <InputText
              value={reference}
              onChange={event => setReference(event.target.value)}
              disabled={mutation.isPending}
              maxLength={200}
            />
          </label>
        </div>
        <p className='text-sm'>
          Next available sequences: source{' '}
          {source.data?.nextSequence ?? 'unavailable'}; destination{' '}
          {destination.data?.nextSequence ?? 'unavailable'}. Enter the actual
          statement-supported ordering; later activity must remain funded.
        </p>
        <div className='flex gap-2'>
          <Checkbox
            inputId='transfer-acknowledgement'
            checked={acknowledged}
            onChange={event => setAcknowledged(Boolean(event.checked))}
            disabled={mutation.isPending}
          />
          <label htmlFor='transfer-acknowledgement'>
            I reviewed both accounts and the statement. These records are
            immutable; corrections and terminal reversals use the paired audit
            workflow in Live cash review.
          </label>
        </div>
      </div>
    </AppDialog>
  );
}
