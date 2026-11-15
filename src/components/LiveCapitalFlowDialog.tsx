'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import AppDialog from './AppDialog';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePostAccountCapitalFlow } from '@/hooks/api';
import { usePrivacy } from '@/lib/privacy-context';
import { toLocalDateString } from '@/lib/date';
import type {
  AccountCapitalFlowInput,
  AccountCapitalFlowResult,
} from '@/lib/types';
import LiveCapitalOperationsPanel from './LiveCapitalOperationsPanel';

function sydneyToday(): Date {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return new Date(`${date}T00:00:00`);
}

function normalizeAmount(value: string): string {
  const [whole, fraction = ''] = value.split('.');
  const normalizedFraction = fraction.replace(/0+$/, '');
  return normalizedFraction ? `${whole}.${normalizedFraction}` : whole;
}

function errorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'status' in error.response &&
    typeof error.response.status === 'number' &&
    error.response.status >= 500
  )
    return 'Cash operation could not be recorded. Please retry after checking account history.';
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  )
    return error.response.data.message;
  return error instanceof Error
    ? error.message
    : 'Cash operation could not be recorded.';
}

export default function LiveCapitalFlowDialog({
  accountId,
  accountName,
  onHide,
}: {
  accountId: string;
  accountName: string;
  onHide: () => void;
}) {
  const online = useNetworkStatus();
  const mutation = usePostAccountCapitalFlow();
  const { mask } = usePrivacy();
  const [kind, setKind] = useState<AccountCapitalFlowInput['kind']>('DEPOSIT');
  const [date, setDate] = useState<Date | null>(() => sydneyToday());
  const [sequence, setSequence] = useState(1);
  const [currency, setCurrency] = useState('AUD');
  const [amount, setAmount] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [retryIdentity, setRetryIdentity] = useState<{
    payloadSignature: string;
    key: string;
  } | null>(null);
  const [result, setResult] = useState<AccountCapitalFlowResult | null>(null);
  const [error, setError] = useState('');
  const [capitalCorrectionPending, setCapitalCorrectionPending] =
    useState(false);
  const maximumDate = sydneyToday();
  const pending = mutation.isPending || capitalCorrectionPending;

  const resetFeedback = () => {
    setResult(null);
    setError('');
  };

  const submit = async () => {
    setError('');
    setResult(null);
    if (
      !date ||
      !Number.isSafeInteger(sequence) ||
      sequence < 1 ||
      !/^[A-Z]{3}$/.test(currency) ||
      !amount ||
      !sourceReference ||
      sourceReference.trim() !== sourceReference
    ) {
      setError(
        'Enter a valid date, sequence, ISO currency, positive amount and source reference.'
      );
      return;
    }

    const effectiveDate = toLocalDateString(date);
    const payloadSignature = JSON.stringify({
      kind,
      effectiveDate,
      sequence,
      currency,
      amount: normalizeAmount(amount),
      sourceReference,
    });
    const key =
      retryIdentity?.payloadSignature === payloadSignature
        ? retryIdentity.key
        : globalThis.crypto.randomUUID();
    setRetryIdentity({ payloadSignature, key });
    try {
      const saved = await mutation.mutateAsync({
        accountId,
        input: {
          kind,
          idempotencyKey: key,
          effectiveDate,
          sequence,
          currency,
          amount,
          sourceReference,
        },
      });
      setResult(saved);
      setAmount('');
      setSourceReference('');
      setRetryIdentity(null);
    } catch (failure: unknown) {
      setError(errorMessage(failure));
    }
  };

  return (
    <AppDialog
      header={`Record account cash - ${accountName}`}
      visible
      modal
      blockScroll
      task
      closable={!pending}
      closeOnEscape={!pending}
      onHide={() => {
        if (!pending) onHide();
      }}
      style={{ width: '560px', maxWidth: '100vw' }}
    >
      <form
        className='space-y-4'
        onSubmit={event => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className='text-sm text-gray-600'>
          Record an actual deposit or withdrawal on an active, confirmed cash
          ledger. This does not activate the account or create a trade.
        </p>
        {!online && (
          <Message
            severity='warn'
            text='Reconnect to record cash. Offline changes are not queued.'
          />
        )}
        {error && <Message severity='error' text={error} />}
        {result && (
          <Message
            severity='success'
            text={`Cash operation recorded. ${result.replay.balances
              .map(
                balance => `${balance.currency} ${mask(balance.endingAmount)}`
              )
              .join(' · ')}`}
          />
        )}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <label className='flex flex-col gap-1 text-sm'>
            Operation
            <Dropdown
              value={kind}
              options={[
                { label: 'Deposit', value: 'DEPOSIT' },
                { label: 'Withdrawal', value: 'WITHDRAWAL' },
              ]}
              onChange={event => {
                if (event.value === 'DEPOSIT' || event.value === 'WITHDRAWAL') {
                  resetFeedback();
                  setKind(event.value);
                }
              }}
              disabled={mutation.isPending}
            />
          </label>
          <label className='flex flex-col gap-1 text-sm'>
            Effective date
            <Calendar
              value={date}
              onChange={event => {
                resetFeedback();
                setDate(event.value instanceof Date ? event.value : null);
              }}
              dateFormat='dd/mm/yy'
              maxDate={maximumDate}
              showIcon
              disabled={mutation.isPending}
            />
          </label>
          <label className='flex flex-col gap-1 text-sm'>
            Sequence within the date
            <InputNumber
              value={sequence}
              onValueChange={event => {
                if (typeof event.value === 'number') {
                  resetFeedback();
                  setSequence(event.value);
                }
              }}
              min={1}
              max={Number.MAX_SAFE_INTEGER}
              useGrouping={false}
              disabled={mutation.isPending}
            />
          </label>
          <label className='flex flex-col gap-1 text-sm'>
            Currency
            <InputText
              value={currency}
              onChange={event => {
                resetFeedback();
                setCurrency(event.target.value.toUpperCase());
              }}
              maxLength={3}
              autoComplete='off'
              disabled={mutation.isPending}
            />
          </label>
          <label className='flex flex-col gap-1 text-sm'>
            Amount
            <InputText
              value={amount}
              onChange={event => {
                resetFeedback();
                setAmount(event.target.value);
              }}
              inputMode='decimal'
              autoComplete='off'
              disabled={mutation.isPending}
            />
          </label>
          <label className='flex flex-col gap-1 text-sm'>
            Source reference
            <InputText
              value={sourceReference}
              onChange={event => {
                resetFeedback();
                setSourceReference(event.target.value);
              }}
              maxLength={200}
              autoComplete='off'
              disabled={mutation.isPending}
            />
          </label>
        </div>
        <div className='flex justify-end gap-2'>
          <Button
            type='button'
            label='Close'
            severity='secondary'
            outlined
            onClick={onHide}
            disabled={pending}
          />
          <Button
            type='submit'
            label={kind === 'DEPOSIT' ? 'Record deposit' : 'Record withdrawal'}
            icon='pi pi-check'
            loading={mutation.isPending}
            disabled={!online || mutation.isPending}
          />
        </div>
      </form>
      <div className='mt-5 max-h-[45vh] overflow-y-auto'>
        <LiveCapitalOperationsPanel
          accountId={accountId}
          onPendingChange={setCapitalCorrectionPending}
        />
      </div>
    </AppDialog>
  );
}
