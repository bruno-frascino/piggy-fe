'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import {
  useCorrectDraftReconciliationCashOperation,
  useCorrectDraftImportedExecutionCash,
} from '@/hooks/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePrivacy } from '@/lib/privacy-context';
import { formatDateDDMMYYYY, toLocalDateString } from '@/lib/date';
import type { DraftOpeningReconciliation } from '@/lib/types';

type Operation = DraftOpeningReconciliation['cashOperations'][number];

export default function DraftCashCorrectionForm({
  accountId,
  statementId,
  openingDate,
  operation,
  stale,
  onCancel,
  onSaved,
  onError,
}: {
  accountId: string;
  statementId: string;
  openingDate: string;
  operation: Operation;
  stale: boolean;
  onCancel: () => void;
  onSaved: () => void;
  onError: (error: unknown) => void;
}) {
  const mutation = useCorrectDraftReconciliationCashOperation();
  const importedMutation = useCorrectDraftImportedExecutionCash();
  const imported = operation.sourceOrigin === 'IMPORT';
  const pending = mutation.isPending || importedMutation.isPending;
  const online = useNetworkStatus();
  const { mask, hidden } = usePrivacy();
  const [mode, setMode] = useState<'REPLACE' | 'REVERSE'>('REPLACE');
  const [date, setDate] = useState<Date | null>(
    () => new Date(`${operation.effectiveDate}T00:00:00`)
  );
  const [sequence, setSequence] = useState(String(operation.sequence));
  const [amount, setAmount] = useState(operation.cash?.amount ?? '');
  const [reason, setReason] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const changed = () => {
    setKey(crypto.randomUUID());
    setReviewed(false);
  };
  const disabled = !online || pending || stale;
  const save = async () => {
    if (disabled) return;
    if (!reviewed || !reason.trim()) {
      onError(
        new Error(
          'Provide an audit reason and review the correction before saving.'
        )
      );
      return;
    }
    if (
      !imported &&
      mode === 'REPLACE' &&
      (!date ||
        !/^[1-9]\d*$/.test(sequence) ||
        !Number.isSafeInteger(Number(sequence)) ||
        !/^\d+(\.\d+)?$/.test(amount.trim()) ||
        !/[1-9]/.test(amount))
    ) {
      onError(
        new Error(
          'Enter a date, positive stable sequence and positive decimal amount.'
        )
      );
      return;
    }
    if (
      imported &&
      (!/^[1-9]\d*$/.test(sequence) || !Number.isSafeInteger(Number(sequence)))
    ) {
      onError(
        new Error(
          'Enter a positive safe integer sequence for this execution date.'
        )
      );
      return;
    }
    try {
      if (imported) {
        await importedMutation.mutateAsync({
          accountId,
          statementId,
          operationId: operation.operationId,
          input: {
            idempotencyKey: key,
            expectedRevisionId: operation.currentRevisionId,
            reason: reason.trim(),
            sequence: Number(sequence),
          },
        });
      } else {
        await mutation.mutateAsync({
          accountId,
          statementId,
          operationId: operation.operationId,
          input: {
            idempotencyKey: key,
            expectedRevisionId: operation.currentRevisionId,
            reason: reason.trim(),
            replacement:
              mode === 'REPLACE' && date
                ? {
                    effectiveDate: toLocalDateString(date),
                    sequence: Number(sequence),
                    amount: amount.trim(),
                  }
                : null,
          },
        });
      }
      onSaved();
    } catch (error: unknown) {
      onError(error);
    }
  };
  const minimum = new Date(`${openingDate}T00:00:00`);
  minimum.setDate(minimum.getDate() + 1);
  return (
    <section
      aria-label='Correct inactive cash operation'
      className='space-y-3 border-t pt-3'
    >
      <h4>
        {imported
          ? 'Correct imported execution sequence'
          : `Correct ${operation.kind.toLowerCase()}`}
      </h4>
      <p>
        {operation.sourceReference}
        {operation.cash && (
          <>
            : {operation.cash.currency} {mask(operation.cash.amount)}
          </>
        )}
        {' on '}
        {formatDateDDMMYYYY(operation.effectiveDate)}, sequence{' '}
        {operation.sequence}.
      </p>
      <Message
        severity='warn'
        text={
          imported
            ? 'Only the stable sequence can change. Execution date, amounts, fees and transaction links remain bound to the persisted Kraken record. Downstream funding must still balance. Live cash and holdings are unchanged; cash-only reversal is not allowed.'
            : 'This appends an audited correction, not a new cash movement. The original remains in history. Downstream funding must still balance; live cash and holdings are unchanged. Reversal is terminal.'
        }
      />
      {stale && (
        <Message
          severity='warn'
          text='This entry or its opening source changed while you were reviewing it. Cancel and reopen the correction from the refreshed report.'
        />
      )}
      <div className='grid gap-2'>
        {!imported && (
          <>
            <label htmlFor='cash-correction-mode'>Correction action</label>
            <Dropdown
              inputId='cash-correction-mode'
              value={mode}
              options={[
                { label: 'Replace date, sequence or amount', value: 'REPLACE' },
                { label: 'Reverse mistaken entry', value: 'REVERSE' },
              ]}
              disabled={disabled}
              onChange={event => {
                setMode(event.value);
                changed();
              }}
            />
          </>
        )}
        {!imported && mode === 'REPLACE' && (
          <>
            <label htmlFor='cash-correction-date'>
              Corrected effective date
            </label>
            <Calendar
              inputId='cash-correction-date'
              value={date}
              minDate={minimum}
              dateFormat='dd/mm/yy'
              disabled={disabled}
              onChange={event => {
                setDate(event.value instanceof Date ? event.value : null);
                changed();
              }}
            />
            <label htmlFor='cash-correction-sequence'>
              Corrected stable sequence
            </label>
            <InputText
              id='cash-correction-sequence'
              value={sequence}
              inputMode='numeric'
              disabled={disabled}
              onChange={event => {
                setSequence(event.target.value);
                changed();
              }}
            />
            <label htmlFor='cash-correction-amount'>
              Corrected amount ({operation.cash?.currency})
            </label>
            <InputText
              id='cash-correction-amount'
              value={amount}
              inputMode='decimal'
              type={hidden ? 'password' : 'text'}
              disabled={disabled}
              onChange={event => {
                setAmount(event.target.value);
                changed();
              }}
            />
          </>
        )}
        {imported && (
          <>
            <label htmlFor='cash-correction-import-sequence'>
              Corrected stable sequence
            </label>
            <InputText
              id='cash-correction-import-sequence'
              value={sequence}
              inputMode='numeric'
              disabled={disabled}
              onChange={event => {
                setSequence(event.target.value);
                changed();
              }}
            />
          </>
        )}
        <label htmlFor='cash-correction-reason'>Correction audit reason</label>
        <InputText
          id='cash-correction-reason'
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
            inputId='cash-correction-reviewed'
            checked={reviewed}
            disabled={disabled}
            onChange={event => setReviewed(Boolean(event.checked))}
          />
          <label htmlFor='cash-correction-reviewed'>
            I reviewed this correction and its retained source identity.
          </label>
        </div>
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button
          label='Save audited correction'
          disabled={disabled || !reviewed || !reason.trim()}
          loading={pending}
          onClick={() => void save()}
        />
        <Button
          label='Cancel correction'
          outlined
          disabled={pending}
          onClick={onCancel}
        />
      </div>
    </section>
  );
}
