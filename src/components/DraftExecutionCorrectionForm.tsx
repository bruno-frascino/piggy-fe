'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import {
  useCorrectDraftRecordedSale,
  useCorrectDraftRecordedAcquisition,
} from '@/hooks/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePrivacy } from '@/lib/privacy-context';
import { toLocalDateString } from '@/lib/date';
import type { DraftOpeningReconciliation } from '@/lib/types';

export default function DraftExecutionCorrectionForm({
  accountId,
  statementId,
  operation,
  execution,
  fingerprint,
  openingDate,
  asOfDate,
  stale,
  onSaved,
  onCancel,
  onError,
}: {
  accountId: string;
  statementId: string;
  operation: DraftOpeningReconciliation['cashOperations'][number];
  execution: DraftOpeningReconciliation['cashManualExecutions'][number];
  fingerprint: string;
  openingDate: string;
  asOfDate: string;
  stale: boolean;
  onSaved: () => void;
  onCancel: () => void;
  onError: (error: unknown) => void;
}) {
  const saleMutation = useCorrectDraftRecordedSale();
  const acquisitionMutation = useCorrectDraftRecordedAcquisition();
  const acquisition = operation.kind === 'BUY';
  const label = acquisition ? 'acquisition' : 'sale';
  const mutation = acquisition ? acquisitionMutation : saleMutation;
  const online = useNetworkStatus();
  const { hidden } = usePrivacy();
  const [date, setDate] = useState<Date | null>(
    () => new Date(`${execution.effectiveDate}T00:00:00`)
  );
  const [price, setPrice] = useState(execution.price);
  const [fees, setFees] = useState(execution.fee);
  const [quantity, setQuantity] = useState(execution.quantity);
  const [sequence, setSequence] = useState(String(operation.sequence));
  const [reason, setReason] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const changed = () => {
    setKey(crypto.randomUUID());
    setReviewed(false);
  };
  const disabled = !online || mutation.isPending || stale;
  const save = async () => {
    if (disabled) return;
    if (
      !reviewed ||
      !reason.trim() ||
      !date ||
      !/^[1-9]\d*$/.test(sequence) ||
      !Number.isSafeInteger(Number(sequence)) ||
      !/^\d+(\.\d+)?$/.test(price) ||
      !/[1-9]/.test(price) ||
      !/^\d+(\.\d+)?$/.test(fees) ||
      (acquisition &&
        (!/^\d+(\.\d+)?$/.test(quantity) || !/[1-9]/.test(quantity)))
    ) {
      onError(
        new Error(
          'Review the correction and enter a date, positive sequence and price, non-negative fee and audit reason.'
        )
      );
      return;
    }
    try {
      const variables = {
        accountId,
        statementId,
        operationId: operation.operationId,
        input: {
          idempotencyKey: key,
          expectedRevisionId: operation.currentRevisionId,
          expectedSourceFingerprint: fingerprint,
          reason: reason.trim(),
          effectiveDate: toLocalDateString(date),
          sequence: Number(sequence),
          price,
          fees,
        },
      };
      if (acquisition)
        await acquisitionMutation.mutateAsync({
          ...variables,
          input: { ...variables.input, quantity },
        });
      else await saleMutation.mutateAsync(variables);
      onSaved();
    } catch (error: unknown) {
      onError(error);
    }
  };
  const minimum = new Date(`${openingDate}T00:00:00`);
  minimum.setDate(minimum.getDate() + 1);
  return (
    <section
      aria-label={`Correct recorded manual ${label}`}
      className='space-y-3 border-t pt-3'
    >
      <h4>Correct recorded manual {label}</h4>
      <p>
        Transaction: {execution.transactionId}. Parcel, instrument, currency and
        source identity cannot change.{' '}
        {acquisition
          ? 'Quantity must cover every existing sale. Sale allocations stay unchanged; imported sale allocations are protected.'
          : 'Quantity cannot change.'}
      </p>
      <Message
        severity='warn'
        text={`This changes the LIVE ${label} and parcel results${acquisition ? ', including the cost basis and realized gains of existing sales' : ''}, and appends an audited draft cash correction. Existing tax reports may become stale. The original opening snapshot and statement evidence remain unchanged. Other opening drafts become stale. No spendable cash or live accounting is enabled.`}
      />
      {stale && (
        <Message
          severity='warn'
          text='The source or revision changed. Cancel and reopen from the refreshed report.'
        />
      )}
      <div className='grid gap-2'>
        <label htmlFor='sale-correction-date'>Corrected {label} date</label>
        <Calendar
          inputId='sale-correction-date'
          value={date}
          dateFormat='dd/mm/yy'
          minDate={minimum}
          maxDate={new Date(`${asOfDate}T00:00:00`)}
          disabled={disabled}
          onChange={event => {
            setDate(event.value instanceof Date ? event.value : null);
            changed();
          }}
        />
        <label htmlFor='sale-correction-price'>
          Corrected {label} price ({execution.currency})
        </label>
        <InputText
          id='sale-correction-price'
          value={price}
          inputMode='decimal'
          type={hidden ? 'password' : 'text'}
          disabled={disabled}
          onChange={event => {
            setPrice(event.target.value);
            changed();
          }}
        />
        <label htmlFor='sale-correction-fees'>
          Corrected {label} fees ({execution.currency})
        </label>
        <InputText
          id='sale-correction-fees'
          value={fees}
          inputMode='decimal'
          type={hidden ? 'password' : 'text'}
          disabled={disabled}
          onChange={event => {
            setFees(event.target.value);
            changed();
          }}
        />
        {acquisition && (
          <>
            <label htmlFor='acquisition-correction-quantity'>
              Corrected acquisition quantity
            </label>
            <InputText
              id='acquisition-correction-quantity'
              value={quantity}
              inputMode='decimal'
              type={hidden ? 'password' : 'text'}
              disabled={disabled}
              onChange={event => {
                setQuantity(event.target.value);
                changed();
              }}
            />
          </>
        )}
        <p>
          Gross cash is quantity times price, rounded half-up to the recorded
          transaction precision (2 decimal places). Same-day edits preserve the
          original timestamp. A changed date is recorded at 01:00 UTC on that
          calendar date, not as verified intraday execution timing.
        </p>
        <label htmlFor='sale-correction-sequence'>
          Corrected {label} sequence
        </label>
        <InputText
          id='sale-correction-sequence'
          value={sequence}
          inputMode='numeric'
          disabled={disabled}
          onChange={event => {
            setSequence(event.target.value);
            changed();
          }}
        />
        <label htmlFor='sale-correction-reason'>
          {acquisition ? 'Acquisition' : 'Sale'} correction audit reason
        </label>
        <InputText
          id='sale-correction-reason'
          value={reason}
          maxLength={1000}
          disabled={disabled}
          onChange={event => {
            setReason(event.target.value);
            changed();
          }}
        />
        <div className='flex items-center gap-2'>
          <Checkbox
            inputId='sale-correction-reviewed'
            checked={reviewed}
            disabled={disabled}
            onChange={event => setReviewed(Boolean(event.checked))}
          />
          <label htmlFor='sale-correction-reviewed'>
            I reviewed the live {label} change and retained audit history.
          </label>
        </div>
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button
          label={`Save ${label} and cash correction`}
          loading={mutation.isPending}
          disabled={disabled || !reviewed || !reason.trim()}
          onClick={() => void save()}
        />
        <Button
          label={`Cancel ${label} correction`}
          outlined
          disabled={mutation.isPending}
          onClick={onCancel}
        />
      </div>
    </section>
  );
}
