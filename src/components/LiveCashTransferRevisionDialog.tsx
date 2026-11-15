'use client';

import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import AppDialog from './AppDialog';
import {
  useLiveCashTransferReview,
  useCorrectLiveCashTransfer,
} from '@/hooks/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePrivacy } from '@/lib/privacy-context';
import { useToast } from '@/lib/toast-context';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { toLocalDateString } from '@/lib/date';
import type { LiveCashTransferReview, TransferReplacement } from '@/lib/types';

function RevisionForm({
  review,
  onHide,
  disabled,
  onPendingChange,
}: {
  review: LiveCashTransferReview;
  onHide: () => void;
  disabled: boolean;
  onPendingChange: (pending: boolean) => void;
}) {
  const mutation = useCorrectLiveCashTransfer();
  const toast = useToast();
  const [date, setDate] = useState<Date | null>(() =>
    review.current ? new Date(`${review.current.effectiveDate}T00:00:00`) : null
  );
  const [sourceSequence, setSourceSequence] = useState(
    String(review.current?.sourceSequence ?? 1)
  );
  const [destinationSequence, setDestinationSequence] = useState(
    String(review.current?.destinationSequence ?? 1)
  );
  const [amount, setAmount] = useState(review.current?.amount ?? '');
  const [fee, setFee] = useState(review.current?.fee ?? '');
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const retry = useRef<{ signature: string; key: string } | null>(null);
  const blocked = disabled || mutation.isPending || !review.current;
  const save = async (reversal: boolean) => {
    if (blocked) return;
    if (!reason.trim() || !acknowledged) {
      setError(
        'Enter an audit reason and acknowledge the paired effect before submitting.'
      );
      return;
    }
    let replacement: TransferReplacement | null = null;
    if (!reversal) {
      if (
        !date ||
        !/^\d+(?:\.\d+)?$/.test(amount) ||
        !/[1-9]/.test(amount) ||
        !/^\d+(?:\.\d+)?$/.test(fee) ||
        !Number.isSafeInteger(Number(sourceSequence)) ||
        Number(sourceSequence) < 1 ||
        !Number.isSafeInteger(Number(destinationSequence)) ||
        Number(destinationSequence) < 1
      ) {
        setError(
          'Enter exact positive principal, a non-negative fee, valid date and both sequences.'
        );
        return;
      }
      replacement = {
        effectiveDate: toLocalDateString(date),
        sourceSequence: Number(sourceSequence),
        destinationSequence: Number(destinationSequence),
        amount,
        fee,
      };
    }
    const payload = {
      sourceHead: review.sourceHead,
      destinationHead: review.destinationHead,
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
        accountId: review.sourceAccountId,
        operationId: review.sourceOperationId,
        input: { ...payload, idempotencyKey: retry.current.key },
      });
      toast.show({
        severity: 'success',
        summary: reversal ? 'Transfer reversed' : 'Transfer corrected',
        detail: 'Both account audit histories were updated atomically.',
      });
      onHide();
    } catch (failure) {
      setError(
        mutationErrorMessage(
          failure,
          'Could not revise the paired transfer. Review both histories before retrying.'
        )
      );
    } finally {
      onPendingChange(false);
    }
  };
  if (!review.current)
    return (
      <Message
        severity='info'
        text='This transfer is terminally reversed and cannot be corrected again. Both original account audits remain retained.'
      />
    );
  return (
    <div className='space-y-3'>
      <p>
        Fixed identity: {review.sourceAccountId} to{' '}
        {review.destinationAccountId} · {review.currency} ·{' '}
        {review.sourceReference}.
      </p>
      <p>
        Both histories change atomically. Fees are sender-only; both dated
        timelines must remain funded. A reversal removes the original economic
        effect, including its fee; it is not a new return transfer.
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
          disabled={blocked}
        />
      </label>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <label className='flex flex-col gap-1'>
          Source sequence
          <InputText
            value={sourceSequence}
            onChange={event => setSourceSequence(event.target.value)}
            disabled={blocked}
            inputMode='numeric'
          />
        </label>
        <label className='flex flex-col gap-1'>
          Destination sequence
          <InputText
            value={destinationSequence}
            onChange={event => setDestinationSequence(event.target.value)}
            disabled={blocked}
            inputMode='numeric'
          />
        </label>
        <label className='flex flex-col gap-1'>
          Principal amount
          <InputText
            value={amount}
            onChange={event => setAmount(event.target.value)}
            disabled={blocked}
            inputMode='decimal'
          />
        </label>
        <label className='flex flex-col gap-1'>
          Sender-paid fee
          <InputText
            value={fee}
            onChange={event => setFee(event.target.value)}
            disabled={blocked}
            inputMode='decimal'
          />
        </label>
      </div>
      <label className='flex flex-col gap-1'>
        Audit reason
        <InputText
          value={reason}
          onChange={event => setReason(event.target.value)}
          disabled={blocked}
          maxLength={1000}
        />
      </label>
      <div className='flex gap-2'>
        <Checkbox
          inputId='transfer-revision-ack'
          checked={acknowledged}
          disabled={blocked}
          onChange={event => setAcknowledged(Boolean(event.checked))}
        />
        <label htmlFor='transfer-revision-ack'>
          I reviewed both account histories. A reversal is terminal, and
          original/corrected sequence slots remain reserved.
        </label>
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button
          label='Correct both accounts'
          disabled={blocked}
          onClick={() => void save(false)}
        />
        <Button
          label='Reverse both accounts (terminal)'
          severity='danger'
          outlined
          disabled={blocked}
          onClick={() => void save(true)}
        />
      </div>
    </div>
  );
}

export default function LiveCashTransferRevisionDialog({
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
  const query = useLiveCashTransferReview(accountId, operationId);
  const [pending, setPending] = useState(false);
  return (
    <AppDialog
      header='Correct or reverse paired cash transfer'
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
          text='Offline: reconnect and refresh both accounts. Revisions are never queued.'
        />
      )}
      {hidden && (
        <Message
          severity='info'
          text='Disable privacy mode to review or revise transfer amounts.'
        />
      )}
      {query.isLoading && (
        <Message severity='info' text='Reviewing both account ledgers...' />
      )}
      {query.error && (
        <Message
          severity='error'
          text={mutationErrorMessage(
            query.error,
            'Could not review both active ledgers. No changes can be submitted.'
          )}
        />
      )}
      <Button
        label='Refresh both review heads'
        outlined
        disabled={!online || pending || query.isFetching}
        onClick={() => void query.refetch()}
      />
      {!hidden && query.data && (
        <RevisionForm
          key={`${query.data.sourceHead.revisionId}:${query.data.sourceHead.auditNumber}:${query.data.destinationHead.revisionId}:${query.data.destinationHead.auditNumber}`}
          review={query.data}
          onHide={onHide}
          onPendingChange={setPending}
          disabled={!online || query.isFetching || query.isError}
        />
      )}
    </AppDialog>
  );
}
