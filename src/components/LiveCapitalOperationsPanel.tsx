'use client';

import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  useCorrectLiveCapitalOperation,
  useLiveCapitalOperations,
} from '@/hooks/api';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { usePrivacy } from '@/lib/privacy-context';
import { toLocalDateString } from '@/lib/date';
import type {
  LiveCapitalOperation,
  LiveCapitalOperationAmount,
} from '@/lib/types';

function amountDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function sydneyToday(): Date {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return amountDate(date);
}

export default function LiveCapitalOperationsPanel({
  accountId,
  onPendingChange,
}: {
  accountId: string;
  onPendingChange?: (pending: boolean) => void;
}) {
  const online = useNetworkStatus();
  const { hidden, mask } = usePrivacy();
  const [offset, setOffset] = useState(0);
  const query = useLiveCapitalOperations(accountId, offset);
  const mutation = useCorrectLiveCapitalOperation();
  const [editing, setEditing] = useState<LiveCapitalOperation | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [sequence, setSequence] = useState(1);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const retry = useRef<{ signature: string; idempotencyKey: string } | null>(
    null
  );
  const maximumDate = sydneyToday();

  const beginCorrection = (operation: LiveCapitalOperation) => {
    if (!operation.current) return;
    setEditing(operation);
    setDate(amountDate(operation.current.effectiveDate));
    setSequence(operation.current.sequence);
    setAmount(operation.current.amount);
    setReason('');
    setAcknowledged(false);
    setError('');
    retry.current = null;
  };

  const save = async (reversal: boolean) => {
    if (!editing || !query.data || !online || hidden || mutation.isPending)
      return;
    const trimmedReason = reason.trim();
    if (
      !trimmedReason ||
      Array.from(trimmedReason).some(
        character =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
      )
    ) {
      setError('Enter an audit reason before submitting the capital revision.');
      return;
    }
    if (reversal && !acknowledged) {
      setError('Acknowledge that reversal is terminal before submitting.');
      return;
    }
    if (
      !reversal &&
      (!date ||
        !Number.isSafeInteger(sequence) ||
        sequence < 1 ||
        !/^\d+(?:\.\d+)?$/.test(amount) ||
        !/[1-9]/.test(amount))
    ) {
      setError(
        'Enter a positive exact amount, valid effective date and sequence.'
      );
      return;
    }
    let replacement: LiveCapitalOperationAmount | null = null;
    if (!reversal) {
      if (!date) return;
      replacement = {
        effectiveDate: toLocalDateString(date),
        sequence,
        amount,
      };
    }
    const payload = {
      expectedRevisionId: editing.expectedRevisionId,
      expectedAuditNumber: query.data.auditNumber,
      expectedSourceFingerprint: query.data.sourceFingerprint,
      reason: trimmedReason,
      replacement,
    };
    const signature = JSON.stringify(payload);
    if (retry.current?.signature !== signature)
      retry.current = {
        signature,
        idempotencyKey: globalThis.crypto.randomUUID(),
      };
    setError('');
    onPendingChange?.(true);
    try {
      await mutation.mutateAsync({
        accountId,
        operationId: editing.operationId,
        input: {
          ...payload,
          idempotencyKey: retry.current.idempotencyKey,
        },
      });
      setEditing(null);
      setReason('');
      setAcknowledged(false);
      retry.current = null;
      await query.refetch();
    } catch (failure) {
      if (isAxiosError(failure) && failure.response?.status === 409) {
        setError(
          'Cash history changed or this correction is stale. Refresh and review the current funding before retrying.'
        );
        setEditing(null);
        await query.refetch();
      } else {
        const message = isAxiosError<{ message?: unknown }>(failure)
          ? failure.response?.data?.message
          : undefined;
        setError(
          typeof message === 'string'
            ? message
            : mutationErrorMessage(
                failure,
                'Could not correct this funding operation. Please retry.'
              )
        );
      }
    } finally {
      onPendingChange?.(false);
    }
  };

  return (
    <section className='space-y-3 border-t border-gray-200 pt-4'>
      <div className='flex items-center justify-between gap-2'>
        <h3 className='font-semibold'>Funding history and corrections</h3>
        <Button
          type='button'
          icon='pi pi-refresh'
          text
          aria-label='Refresh funding history'
          disabled={!online || query.isFetching}
          onClick={() => void query.refetch()}
        />
      </div>
      {!online && (
        <Message
          severity='warn'
          text='Reconnect to refresh or correct funding. Offline changes are not queued.'
        />
      )}
      {hidden && (
        <Message
          severity='info'
          text='Disable privacy mode to correct or reverse funding.'
        />
      )}
      {query.isLoading && (
        <Message severity='info' text='Loading funding history…' />
      )}
      {query.error && (
        <Message
          severity='error'
          text={mutationErrorMessage(
            query.error,
            'Could not load live funding history.'
          )}
        />
      )}
      {error && <Message severity='error' text={error} />}
      {query.data?.items.length === 0 && (
        <p className='text-sm text-gray-600'>
          No live deposits or withdrawals recorded.
        </p>
      )}
      {query.data?.items.map(operation => (
        <article
          key={operation.operationId}
          className='space-y-2 rounded border border-gray-200 p-3'
        >
          <div className='flex flex-wrap items-start justify-between gap-2'>
            <div>
              <p className='font-medium'>
                {operation.kind === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} ·{' '}
                {operation.sourceReference}
              </p>
              <p className='text-sm'>
                Original: {operation.original.effectiveDate} · sequence{' '}
                {operation.original.sequence} · {operation.currency}{' '}
                {mask(operation.original.amount)}
              </p>
              <p className='text-sm'>
                Current effective:{' '}
                {operation.current
                  ? `${operation.current.effectiveDate} · sequence ${operation.current.sequence} · ${operation.currency} ${mask(operation.current.amount)}`
                  : 'reversed (terminal)'}
              </p>
            </div>
            {operation.current &&
              editing?.operationId !== operation.operationId && (
                <Button
                  type='button'
                  label='Correct or reverse'
                  size='small'
                  outlined
                  disabled={!online || hidden || mutation.isPending}
                  onClick={() => beginCorrection(operation)}
                />
              )}
          </div>
          {operation.revisions.map(revision => (
            <div
              key={revision.revisionId}
              className='border-l-2 border-gray-300 pl-3 text-sm'
            >
              <p>
                Revision {revision.auditNumber} · recorded {revision.recordedAt}
                : {revision.reason}
              </p>
              <p>
                {revision.postings.map(posting => (
                  <span key={`${posting.phase}-${posting.currency}`}>
                    {posting.phase === 'REVERSAL' ? 'Reversal' : 'Replacement'}{' '}
                    {posting.currency} {mask(posting.amount)}{' '}
                  </span>
                ))}
              </p>
            </div>
          ))}
          {editing?.operationId === operation.operationId && (
            <div className='space-y-3 border-t border-gray-200 pt-3'>
              <Message
                severity='warn'
                text='Corrections retain the original audit. Reversal ignores replacement fields, is terminal and is rejected if it would make any later cash balance negative.'
              />
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <label className='flex flex-col gap-1 text-sm'>
                  Effective date
                  <Calendar
                    value={date}
                    maxDate={maximumDate}
                    dateFormat='dd/mm/yy'
                    showIcon
                    disabled={mutation.isPending}
                    onChange={event =>
                      setDate(event.value instanceof Date ? event.value : null)
                    }
                  />
                </label>
                <label className='flex flex-col gap-1 text-sm'>
                  Sequence
                  <InputNumber
                    value={sequence}
                    min={1}
                    max={Number.MAX_SAFE_INTEGER}
                    useGrouping={false}
                    disabled={mutation.isPending}
                    onValueChange={event => {
                      if (typeof event.value === 'number')
                        setSequence(event.value);
                    }}
                  />
                </label>
                <label className='flex flex-col gap-1 text-sm sm:col-span-2'>
                  Exact amount ({operation.currency})
                  <InputText
                    value={amount}
                    inputMode='decimal'
                    disabled={mutation.isPending}
                    onChange={event => setAmount(event.target.value)}
                  />
                </label>
                <label className='flex flex-col gap-1 text-sm sm:col-span-2'>
                  Audit reason
                  <InputText
                    value={reason}
                    maxLength={1000}
                    disabled={mutation.isPending}
                    onChange={event => setReason(event.target.value)}
                  />
                </label>
              </div>
              <div className='flex gap-2 items-start'>
                <Checkbox
                  inputId={`capital-reversal-ack-${operation.operationId}`}
                  checked={acknowledged}
                  disabled={mutation.isPending}
                  onChange={event => setAcknowledged(event.checked === true)}
                />
                <label
                  htmlFor={`capital-reversal-ack-${operation.operationId}`}
                >
                  I understand that reversing this operation is permanent and
                  may affect funding for later activity.
                </label>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  type='button'
                  label='Save correction'
                  loading={mutation.isPending}
                  disabled={!online || hidden || mutation.isPending}
                  onClick={() => void save(false)}
                />
                <Button
                  type='button'
                  label='Reverse permanently'
                  severity='danger'
                  outlined
                  loading={mutation.isPending}
                  disabled={!online || hidden || mutation.isPending}
                  onClick={() => void save(true)}
                />
                <Button
                  type='button'
                  label='Cancel'
                  text
                  disabled={mutation.isPending}
                  onClick={() => {
                    setEditing(null);
                    setError('');
                  }}
                />
              </div>
            </div>
          )}
        </article>
      ))}
      {query.data && query.data.total > query.data.limit && (
        <div className='flex justify-between gap-2'>
          <Button
            type='button'
            label='Newer'
            outlined
            disabled={!offset || query.isFetching}
            onClick={() => setOffset(Math.max(0, offset - query.data!.limit))}
          />
          <span className='self-center text-sm'>
            {offset + 1}–
            {Math.min(offset + query.data.items.length, query.data.total)} of{' '}
            {query.data.total}
          </span>
          <Button
            type='button'
            label='Older'
            outlined
            disabled={
              offset + query.data.limit >= query.data.total || query.isFetching
            }
            onClick={() => setOffset(offset + query.data!.limit)}
          />
        </div>
      )}
    </section>
  );
}
