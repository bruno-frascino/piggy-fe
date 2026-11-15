'use client';

import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import AppDialog from './AppDialog';
import {
  useLiveFxConversionReview,
  useCorrectLiveFxConversion,
} from '@/hooks/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePrivacy } from '@/lib/privacy-context';
import { useToast } from '@/lib/toast-context';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { sydneyToday, toLocalDateString } from '@/lib/date';
import type {
  LiveFxConversionReview,
  FxRevisionReplacement,
} from '@/lib/types';

function RevisionForm({
  review,
  disabled,
  onHide,
  onPendingChange,
  onConflict,
}: {
  review: LiveFxConversionReview;
  disabled: boolean;
  onHide: () => void;
  onPendingChange: (pending: boolean) => void;
  onConflict: () => void;
}) {
  const mutation = useCorrectLiveFxConversion();
  const toast = useToast();
  const [date, setDate] = useState<Date | null>(() =>
    review.current ? new Date(`${review.current.effectiveDate}T00:00:00`) : null
  );
  const [sequence, setSequence] = useState(
    String(review.current?.sequence ?? 1)
  );
  const [fromAmount, setFromAmount] = useState(
    review.current?.fromAmount ?? ''
  );
  const [toAmount, setToAmount] = useState(review.current?.toAmount ?? '');
  const [fromFee, setFromFee] = useState(
    review.current?.fees.find(fee => fee.currency === review.fromCurrency)
      ?.amount ?? '0'
  );
  const [toFee, setToFee] = useState(
    review.current?.fees.find(fee => fee.currency === review.toCurrency)
      ?.amount ?? '0'
  );
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const retry = useRef<{ signature: string; key: string } | null>(null);
  const blocked = disabled || mutation.isPending || !review.current;
  const save = async (reversal: boolean) => {
    if (blocked) return;
    if (!reason.trim() || !acknowledged) {
      setError(
        'Enter an audit reason and acknowledge the linked correction or terminal reversal.'
      );
      return;
    }
    let replacement: FxRevisionReplacement | null = null;
    if (!reversal) {
      const decimal = /^\d+(?:\.\d+)?$/;
      if (
        !date ||
        !Number.isSafeInteger(Number(sequence)) ||
        Number(sequence) < 1 ||
        !decimal.test(fromAmount) ||
        !/[1-9]/.test(fromAmount) ||
        !decimal.test(toAmount) ||
        !/[1-9]/.test(toAmount) ||
        !decimal.test(fromFee) ||
        !decimal.test(toFee)
      ) {
        setError(
          'Enter exact positive exchanged amounts, non-negative fees, a valid date and sequence.'
        );
        return;
      }
      replacement = {
        effectiveDate: toLocalDateString(date),
        sequence: Number(sequence),
        fromAmount,
        toAmount,
        fees: [
          { currency: review.fromCurrency, amount: fromFee },
          { currency: review.toCurrency, amount: toFee },
        ].filter(fee => /[1-9]/.test(fee.amount)),
      };
    }
    const payload = {
      expectedRevisionId: review.expectedRevisionId,
      expectedAuditNumber: review.auditNumber,
      expectedSourceFingerprint: review.sourceFingerprint,
      reason: reason.trim(),
      replacement,
    };
    const signature = JSON.stringify(payload);
    if (retry.current?.signature !== signature)
      retry.current = { signature, key: globalThis.crypto.randomUUID() };
    setError('');
    onPendingChange(true);
    try {
      await mutation.mutateAsync({
        accountId: review.accountId,
        operationId: review.operationId,
        input: { ...payload, idempotencyKey: retry.current.key },
      });
      toast.show({
        severity: 'success',
        summary: reversal
          ? 'FX conversion reversed'
          : 'FX conversion corrected',
        detail:
          'Both currency effects and the immutable audit history were updated atomically.',
      });
      onHide();
    } catch (failure) {
      setError(
        mutationErrorMessage(
          failure,
          'Could not revise FX. Review dated balances before retrying.'
        )
      );
      if (isAxiosError(failure) && failure.response?.status === 409)
        onConflict();
    } finally {
      onPendingChange(false);
    }
  };
  if (!review.current)
    return (
      <Message
        severity='info'
        text='This FX conversion is terminally reversed. It cannot be corrected again; the original and revision audits remain retained.'
      />
    );
  return (
    <div className='space-y-3'>
      <p>
        Fixed identity: {review.accountId} · {review.fromCurrency} to{' '}
        {review.toCurrency} · {review.sourceReference}.
      </p>
      <p>
        Amounts are before explicit fees. Both dated currency balances must
        remain funded. Reversal removes the original effects including fees; it
        does not record a new reverse exchange. To change currency direction or
        source, reverse and record a new conversion.
      </p>
      {error && <Message severity='error' text={error} />}
      <label className='flex flex-col gap-1'>
        Corrected effective date
        <Calendar
          value={date}
          onChange={event =>
            setDate(event.value instanceof Date ? event.value : null)
          }
          dateFormat='dd/mm/yy'
          showIcon
          maxDate={sydneyToday()}
          disabled={blocked}
        />
      </label>
      <label className='flex flex-col gap-1'>
        Intraday sequence
        <InputText
          value={sequence}
          onChange={event => setSequence(event.target.value)}
          inputMode='numeric'
          disabled={blocked}
        />
      </label>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <label className='flex flex-col gap-1'>
          Corrected amount exchanged (before fees)
          <InputText
            value={fromAmount}
            onChange={event => setFromAmount(event.target.value)}
            inputMode='decimal'
            disabled={blocked}
          />
        </label>
        <label className='flex flex-col gap-1'>
          Corrected amount received (before fees)
          <InputText
            value={toAmount}
            onChange={event => setToAmount(event.target.value)}
            inputMode='decimal'
            disabled={blocked}
          />
        </label>
        <label className='flex flex-col gap-1'>
          Corrected fee in from currency
          <InputText
            value={fromFee}
            onChange={event => setFromFee(event.target.value)}
            inputMode='decimal'
            disabled={blocked}
          />
        </label>
        <label className='flex flex-col gap-1'>
          Corrected fee in to currency
          <InputText
            value={toFee}
            onChange={event => setToFee(event.target.value)}
            inputMode='decimal'
            disabled={blocked}
          />
        </label>
      </div>
      <label className='flex flex-col gap-1'>
        Audit reason
        <InputText
          value={reason}
          onChange={event => setReason(event.target.value)}
          maxLength={1000}
          disabled={blocked}
        />
      </label>
      <div className='flex gap-2'>
        <Checkbox
          inputId='fx-revision-ack'
          checked={acknowledged}
          disabled={blocked}
          onChange={event => setAcknowledged(Boolean(event.checked))}
        />
        <label htmlFor='fx-revision-ack'>
          I reviewed both currency histories. Reversal is terminal and
          original/replacement date-sequence slots remain reserved.
        </label>
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button
          label='Correct FX conversion'
          disabled={blocked}
          onClick={() => void save(false)}
        />
        <Button
          label='Reverse FX conversion (terminal)'
          severity='danger'
          outlined
          disabled={blocked}
          onClick={() => void save(true)}
        />
      </div>
    </div>
  );
}

export default function LiveFxRevisionDialog({
  accountId,
  operationId,
  onHide,
}: {
  accountId: string;
  operationId: string;
  onHide: () => void;
}) {
  const online = useNetworkStatus();
  const { hidden } = usePrivacy();
  const query = useLiveFxConversionReview(accountId, operationId);
  const [pending, setPending] = useState(false);
  const [conflict, setConflict] = useState(false);
  return (
    <AppDialog
      header='Correct or reverse FX conversion'
      visible
      modal
      task
      closable={!pending}
      closeOnEscape={!pending}
      onHide={() => {
        if (!pending) onHide();
      }}
      style={{ width: '680px', maxWidth: '100vw' }}
    >
      {!online && (
        <Message
          severity='warn'
          text='Offline: reconnect and refresh the FX review. Revisions are never queued.'
        />
      )}
      {hidden && (
        <Message
          severity='info'
          text='Disable privacy mode to review or revise FX amounts.'
        />
      )}
      {query.isLoading && (
        <Message
          severity='info'
          text='Reviewing the live FX audit and currency balances...'
        />
      )}
      {query.error && (
        <Message
          severity='error'
          text={mutationErrorMessage(
            query.error,
            'Could not review the current FX history. No changes can be submitted.'
          )}
        />
      )}
      {conflict && (
        <Message
          severity='warn'
          text='The FX revision conflicted with current history. Refresh and review before submitting again.'
        />
      )}
      <Button
        label='Refresh FX review head'
        outlined
        disabled={!online || pending || query.isFetching}
        onClick={() =>
          void query.refetch().then(result => {
            if (!result.isError) setConflict(false);
          })
        }
      />
      {!hidden && query.data && (
        <RevisionForm
          key={`${query.data.expectedRevisionId}:${query.data.auditNumber}:${query.data.sourceFingerprint}`}
          review={query.data}
          disabled={
            !online || pending || conflict || query.isFetching || query.isError
          }
          onHide={onHide}
          onPendingChange={setPending}
          onConflict={() => setConflict(true)}
        />
      )}
    </AppDialog>
  );
}
